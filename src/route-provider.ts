import * as vscode from 'vscode';
import { logger } from './logger';
import { parseRoutes, RouteItem } from './parser';

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

    private _cachedNodes: FileItem[] | undefined = undefined;

    refresh(): void {
        // Refreshing Route Tree View...
        // 라우트 트리 뷰를 새로고침합니다...
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

        // Return cached nodes if available
        // 캐시된 노드가 있으면 반환
        if (this._cachedNodes) {
            logger.log('Returning cached nodes');
            return this._cachedNodes;
        }

        // Root: Find all TS files in workspace
        // 루트: 워크스페이스의 모든 TS 파일 검색
        logger.log('Scanning workspace for TypeScript files...');
        const uris = await vscode.workspace.findFiles('**/*.{ts,tsx}', '**/node_modules/**');
        logger.log(`Found ${uris.length} TypeScript files.`);

        const fileItems: FileItem[] = [];

        // Simple Promise.all to process files in parallel
        // 간단한 Promise.all을 사용하여 병렬로 파일 처리
        await Promise.all(uris.map(async (uri) => {
            try {
                const document = await vscode.workspace.openTextDocument(uri);
                const routes = parseRoutes(document.getText());

                if (routes.length > 0) {
                    logger.log(`Found ${routes.length} routes in ${uri.fsPath}`);
                    fileItems.push(new FileItem(uri, routes));
                }
            } catch (e) {
                logger.error(`Failed to parse ${uri.fsPath}`, e);
            }
        }));

        // Sort files alphabetically
        // 파일 알파벳순 정렬
        this._cachedNodes = fileItems.sort((a, b) => {
            const aName = a.resourceUri.path.split('/').pop() || '';
            const bName = b.resourceUri.path.split('/').pop() || '';
            return aName.localeCompare(bName);
        });

        return this._cachedNodes;
    }
}
