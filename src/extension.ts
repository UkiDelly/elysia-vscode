import * as vscode from 'vscode';
import { RouteTreeProvider } from './route-provider';
import { logger } from './logger';

export async function activate(context: vscode.ExtensionContext) {
    logger.log('🚀 ElysiaJS Route Visualizer is now active!');
    
    // 채널을 subscriptions에 추가하여 확장 프로그램 종료 시 자동 정리
    context.subscriptions.push(logger.getDispose());

    // Check if the current workspace checks specifically for 'elysia' dependency
    const checkElysiaProject = async () => {
        logger.log('Checking if this is an ElysiaJS project...');
        const packageJsonFiles = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**');

        let isElysiaProject = false;

        for (const file of packageJsonFiles) {
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const packageJson = JSON.parse(document.getText());

                const dependencies = packageJson.dependencies || {};
                const devDependencies = packageJson.devDependencies || {};

                if (dependencies['elysia'] || devDependencies['elysia']) {
                    isElysiaProject = true;
                    break;
                }
            } catch (error) {
                logger.error(`Failed to parse package.json at ${file.fsPath}`, error);
            }
        }

        logger.log(`ElysiaJS project detection result: ${isElysiaProject}`);
        vscode.commands.executeCommand('setContext', 'elysia:isElysiaProject', isElysiaProject);
    };

    // Initial check - await를 추가하여 context 설정이 완료될 때까지 대기
    await checkElysiaProject();

    const routeProvider = new RouteTreeProvider();

    // Register the Tree View - 이제 elysia:isElysiaProject context가 설정된 후 실행됨
    vscode.window.registerTreeDataProvider('elysia-routes-view', routeProvider);

    // Refresh only on file save
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.languageId === 'typescript' || document.languageId === 'typescriptreact') {
                logger.log(`Document saved: ${document.fileName}, refreshing routes...`);
                routeProvider.refresh();
            }
        }),
        // Re-check on workspace folder changes
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            logger.log('Workspace folders changed, re-checking project type...');
            checkElysiaProject();
        })
    );
}

export function deactivate() {
    logger.log('ElysiaJS Route Visualizer is deactivating...');
}
