import * as vscode from 'vscode';
import { parseRoutes, RouteItem } from './parser';
import { logger } from './logger';

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
                fileUri,
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

    refresh(): void {
        logger.log('Refreshing Route Tree View...');
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

        // Root: Find all TS files in workspace
        logger.log('Scanning workspace for TypeScript files...');
        const uris = await vscode.workspace.findFiles('**/*.{ts,tsx}', '**/node_modules/**');
        logger.log(`Found ${uris.length} TypeScript files.`);
        const fileItems: FileItem[] = [];

        for (const uri of uris) {
            try {
                const document = await vscode.workspace.openTextDocument(uri);
                const routes = parseRoutes(document.getText());

                if (routes.length > 0) {
                    logger.log(`Found ${routes.length} routes in ${uri.fsPath}`);
                    routes.forEach(r => logger.log(`  - [${r.method}] ${r.path} (Line ${r.line})`));
                    fileItems.push(new FileItem(uri, routes));
                }
            } catch (e) {
                logger.error(`Failed to parse ${uri.fsPath}`, e);
            }
        }

        return fileItems.sort((a, b) => {
            const aName = a.resourceUri.path.split('/').pop() || '';
            const bName = b.resourceUri.path.split('/').pop() || '';
            return aName.localeCompare(bName);
        });
    }
}
