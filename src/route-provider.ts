import { TextDecoder } from 'util';
import * as vscode from 'vscode';
import { logger } from './logger';
import { joinPaths, ParsedData, parseRoutes, RouteItem } from './parser';

interface ResolvedRouteItem extends RouteItem {
    sourceFile?: string;
    isRaw?: boolean;
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
    private _parsedCache = new Map<string, { mtime: number, data: ParsedData; }>();

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

        await Promise.all(uris.map(async (uri) => {
            try {
                const stat = await vscode.workspace.fs.stat(uri);
                const mtime = stat.mtime;
                const fsPath = uri.fsPath;

                const cached = this._parsedCache.get(fsPath);
                if (cached && cached.mtime === mtime) {
                    parsedFiles.set(fsPath, cached.data);
                    return;
                }

                const content = await vscode.workspace.fs.readFile(uri);
                const text = new TextDecoder().decode(content);
                const data = parseRoutes(text);

                this._parsedCache.set(fsPath, { mtime, data });
                parsedFiles.set(fsPath, data);
            } catch (e) {
                logger.error(`Failed to parse ${uri.fsPath}`, e);
            }
        }));

        // --- NEW LOGIC: Prefix Propagation (Bottom-Up) ---

        // Map<UniqueModuleKey, Set<Prefix>>
        // Key: "FilePath" (since we want all routes in a file to potentially inherit prefixes if they belong to exported vars)
        // Wait, routes belong to specific variables.
        // Key: "FilePath::VariableName"


        const getModuleKey = (filePath: string, varName: string) => `${filePath}::${varName}`;

        // 1. Initialize all exported variables with empty prefix (as a baseline)
        // Actually, we only care about tracking prefixes. If n/a, it's root.

        // 2. Build Usage Graph
        // We need to know: Who uses Whom? 
        // Iterate all usages in all files.

        interface UsageEdge {
            fromFile: string;
            fromVar?: string; // The variable in Parent that uses Child
            toFile: string;
            toVar: string; // The variable in Child being used
            prefix: string; // The prefix applied at this usage
        }

        const edges: UsageEdge[] = [];

        for (const [fsPath, data] of parsedFiles.entries()) {
            for (const usage of data.usages) {
                // Resolve the usage variable to a file/export
                // Check imports
                const originalName = data.imports[usage.variable];
                if (originalName) {
                    // Imported. Find which file exports this.
                    // This is O(N) search unless we built an index. N is small (files).
                    for (const [otherPath, otherData] of parsedFiles.entries()) {
                        if (otherPath === fsPath) continue;
                        if (otherData.exports[originalName]) {
                            // Found the definition!
                            edges.push({
                                fromFile: fsPath,
                                fromVar: usage.parentVar, // tracked in parser.ts
                                toFile: otherPath,
                                toVar: originalName,
                                prefix: usage.prefix
                            });
                        }
                    }
                } else {
                    // Local usage? 
                    // e.g. const auth = ...; const app = ... .use(auth);
                    // It's in the same file.
                    if (data.exports[usage.variable] || data.routes.some(r => r.parentVar === usage.variable)) {
                        // It's a valid target in same file
                        edges.push({
                            fromFile: fsPath,
                            fromVar: usage.parentVar,
                            toFile: fsPath,
                            toVar: usage.variable,
                            prefix: usage.prefix
                        });
                    }
                }
            }
        }

        // 3. Propagate Prefixes
        // We start with "Root" prefixes. 
        // Roots are usages that have NO incoming edges? 
        // No. "Roots" are usually the top-level apps (index.ts).
        // But we want to show ALL routes.
        // If a route is used, it inherits the parent's prefix.
        // If a route is NOT used, it is at root '/' (of its own file).
        // BUT, if it IS used, we usually ONLY want to show the used version (effective path).
        // However, user logic: "Registered in parent -> Parent's prefix added to child".

        // We need to calculate the "Effective Prefixes" for every Module (File::Var).
        // A module can have multiple effective prefixes if used in multiple places.

        // Let's settle: 
        // Init every module with [''] (Root) ?
        // If we do that, we get duplicates (Root version + Mounted version).
        // User wants: "Show in defining file". "Inherit prefix".
        // Implies: If mounted, show mounted path. If not mounted, show raw path?
        // Or always show relative path? No, "route view에는 제일 하위 라우들이 보여야해... 상위 라우트의 prefix가 하위 라우트 앞에 등록하는 식으로"
        // This implies FULL PATHS.

        // If I have `auth` (POST /login) used in `user` (/user), used in `app` (/api).
        // `auth.ts` should show `POST /api/user/login`.
        // It should NOT show `POST /login` (raw).

        // So: If a module has incoming edges, we use those.
        // If a module has NO incoming edges, we use [''] (Root).

        // We need a recursive resolver with cycle detection.

        const resolvedPrefixes = new Map<string, Set<string>>(); // Key: ModuleKey

        const resolvePrefixes = (file: string, varName: string, stack: string[] = []): Set<string> => {
            const key = getModuleKey(file, varName);
            if (resolvedPrefixes.has(key)) return resolvedPrefixes.get(key)!;
            if (stack.includes(key)) return new Set(['']); // Cycle break

            const incoming = edges.filter(e => e.toFile === file && e.toVar === varName);

            const results = new Set<string>();

            if (incoming.length === 0) {
                // No usages? It's a root module (or unused).
                results.add('');
            } else {
                for (const edge of incoming) {
                    // Get parent's prefixes
                    let parentPrefixes: Set<string>;
                    if (edge.fromVar) {
                        parentPrefixes = resolvePrefixes(edge.fromFile, edge.fromVar, [...stack, key]);
                    } else {
                        // Usage from a top-level expression (not inside a variable)
                        // Treat as Root
                        parentPrefixes = new Set(['']);
                    }

                    for (const pp of parentPrefixes) {
                        results.add(joinPaths(pp, edge.prefix)); // parser.ts export
                    }
                }
            }

            resolvedPrefixes.set(key, results);
            return results;
        };

        // 4. Assign Final Routes to Files
        const fileRouteItems: FileItem[] = [];

        for (const [fsPath, data] of parsedFiles.entries()) {
            const finalRoutes: RouteItem[] = [];

            // Iterate all routes in this file
            for (const route of data.routes) {
                if (route.parentVar) {
                    // This route belongs to a variable. Resolve prefixes for that variable.
                    const prefixes = resolvePrefixes(fsPath, route.parentVar, []);
                    for (const prefix of prefixes) {
                        finalRoutes.push({
                            ...route,
                            path: joinPaths(prefix, route.path)
                        });
                    }
                } else {
                    // Orphan route (e.g. top level .get()). 
                    // Has no parent variable, so it's not "used" by others via .use().
                    // Unless we track "File Usage"? No, Elysia uses objects.
                    // Treat as root.
                    finalRoutes.push(route);
                }
            }

            if (finalRoutes.length > 0) {
                // Deduplicate (signatures)
                const unique = finalRoutes.filter((v, i, a) =>
                    a.findIndex(t => t.method === v.method && t.path === v.path) === i
                );

                fileRouteItems.push(new FileItem(vscode.Uri.file(fsPath), unique));
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
