import * as vscode from 'vscode';
import { logger } from './logger';
import { ParsedData, parseRoutes, RouteItem } from './parser';

interface ResolvedRouteItem extends RouteItem {
    sourceFile?: string;
}


class FileItem extends vscode.TreeItem {
    constructor(
        public readonly resourceUri: vscode.Uri,
        public readonly routes: RouteItem[]
    ) {
        super(resourceUri, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = 'file';
        this.iconPath = vscode.ThemeIcon.File;
        this.description = `${routes.length} routes`;
    }
}

class RouteTreeItem extends vscode.TreeItem {
    constructor(
        public readonly route: RouteItem,
        public readonly fileUri: vscode.Uri
    ) {
        super(
            `${route.method} ${route.path}`,
            vscode.TreeItemCollapsibleState.None
        );

        this.description = `Line ${route.line}`;
        this.tooltip = `${route.method} ${route.path} (Line ${route.line})`;
        this.iconPath = new vscode.ThemeIcon('symbol-method');

        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [
                (route as ResolvedRouteItem).sourceFile ? vscode.Uri.file((route as ResolvedRouteItem).sourceFile!) : fileUri,
                {
                    selection: new vscode.Range(route.line - 1, 0, route.line - 1, 0)
                }
            ]
        };
    }
}

export class RouteTreeProvider implements vscode.TreeDataProvider<FileItem | RouteTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileItem | RouteTreeItem | undefined | null | void> = new vscode.EventEmitter<FileItem | RouteTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileItem | RouteTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private _cachedNodes: FileItem[] | undefined = undefined;

    refresh(): void {
        logger.log('Refreshing Route Tree View...');
        this._cachedNodes = undefined;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FileItem | RouteTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FileItem | RouteTreeItem): Promise<(FileItem | RouteTreeItem)[]> {
        if (element instanceof FileItem) {
            return element.routes.map(route => new RouteTreeItem(route, element.resourceUri));
        }

        if (element instanceof RouteTreeItem) {
            return [];
        }

        if (this._cachedNodes) {
            logger.log('Returning cached nodes');
            return this._cachedNodes;
        }

        logger.log('Scanning workspace for TypeScript files...');
        const uris = await vscode.workspace.findFiles('**/*.{ts,tsx}', '**/node_modules/**');
        logger.log(`Found ${uris.length} TypeScript files.`);

        const parsedFiles = new Map<string, ParsedData>();
        const fileRouteItems: FileItem[] = [];

        await Promise.all(uris.map(async (uri) => {
            try {
                const document = await vscode.workspace.openTextDocument(uri);
                const data = parseRoutes(document.getText());
                parsedFiles.set(uri.fsPath, data);
            } catch (e) {
                logger.error(`Failed to parse ${uri.fsPath}`, e);
            }
        }));

        const resolvedFileRoutes = new Map<string, ResolvedRouteItem[]>();

        const consumedRoutes = new Set<string>(); // Tracks distinct path signatures (method:path) found as imports

        // Helper to produce signature
        const getSig = (r: RouteItem) => `${r.method}:${r.path}`;

        for (const [fsPath, data] of parsedFiles.entries()) {
            const combinedRoutes: ResolvedRouteItem[] = data.routes.map(r => ({ ...r, sourceFile: fsPath }));

            for (const usage of data.usages) {
                const importedOriginalName = data.imports[usage.variable];
                if (importedOriginalName) {
                    for (const [otherPath, otherData] of parsedFiles.entries()) {
                        if (otherPath === fsPath) continue;
                        if (otherData.exports[importedOriginalName]) {
                            const importedRoutes = otherData.exports[importedOriginalName];
                            importedRoutes.forEach(r => {
                                // Mark source route as consumed
                                consumedRoutes.add(getSig(r));

                                // Add new composed route
                                combinedRoutes.push({
                                    method: r.method,
                                    path: usage.prefix + r.path,
                                    line: r.line, // Keep original line
                                    sourceFile: otherPath // Navigation Target
                                });
                            });
                        }
                    }
                } else {
                    if (data.exports[usage.variable]) {
                        const localRoutes = data.exports[usage.variable];
                        localRoutes.forEach(r => {
                            // Local usage also "consumes" the definition if we consider 
                            // we only want to show the specific mounted endpoint? 
                            // Usually local definitions are fine to show if they are top level.
                            // But if 'adminRoutes' is just an object and never mounted globally except via .use,
                            // then hiding it from top level 'routes' list (if it appeared there) makes sense.
                            // However, 'routes' in Parser filters for HTTP calls on ANY variable.
                            // Checks needed: does ParsedData.routes include routes from ALL variables? YES.
                            // So if we have `const a = new Elysia().get('/a')`, it is in `routes`.
                            // If we have `new Elysia().use(a)`, we get `/a` again.
                            // So YES, we should mark local chunks as consumed too if fully used?

                            // Let's mimic import logic:
                            // Mark definitions as consumed.

                            consumedRoutes.add(getSig(r));

                            combinedRoutes.push({
                                method: r.method,
                                path: usage.prefix + r.path,
                                line: r.line,
                                sourceFile: fsPath
                            });
                        });
                    }
                }
            }
            resolvedFileRoutes.set(fsPath, combinedRoutes);
        }

        // Finalize items and filter consumed
        for (const [fsPath, routes] of resolvedFileRoutes.entries()) {
            // Filter out consumed routes from THIS file's listing.
            // CAREFUL: We only want to filter out "raw" routes that were tracked as consumed.
            // But 'routes' here contains BOTH raw routes from parser AND resolved composed routes from above loop.
            // We should filter ONLY if the route matches a known consumed signature AND it came from the original definition?
            // Actually, we can just filter by signature.
            // If we imported '/admins' to make '/cms/admins', we marked 'GET:/admins' as consumed.
            // The new route is 'GET:/cms/admins'. It won't match.
            // The original route 'GET:/admins' (in some file) WILL match.
            // So filtering by signature works.

            const filteredRoutes = routes.filter(r => !consumedRoutes.has(getSig(r)));

            if (filteredRoutes.length > 0) {
                const uniqueRoutes = filteredRoutes.filter((v, i, a) =>
                    a.findIndex(t => t.method === v.method && t.path === v.path) === i
                );

                if (uniqueRoutes.length > 0) {
                    fileRouteItems.push(new FileItem(vscode.Uri.file(fsPath), uniqueRoutes));
                }
            }
        }

        this._cachedNodes = fileRouteItems.sort((a, b) => {
            const aName = a.resourceUri.path.split('/').pop() || '';
            const bName = b.resourceUri.path.split('/').pop() || '';
            return aName.localeCompare(bName);
        });

        return this._cachedNodes;
    }
}
