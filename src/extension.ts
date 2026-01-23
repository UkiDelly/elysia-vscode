import * as vscode from 'vscode';
import { logger } from './logger';
import { RouteTreeProvider } from './route-provider';

export async function activate(context: vscode.ExtensionContext) {
    try {
        logger.log('🚀 ElysiaJS Route Visualizer is now active!');

        // Add channel to subscriptions for automatic disposal
        // 채널을 subscriptions에 추가하여 확장 프로그램 종료 시 자동 정리
        context.subscriptions.push(logger.getDispose());

        const routeProvider = new RouteTreeProvider();

        // Register the Tree View
        // 트리 뷰 등록
        context.subscriptions.push(
            vscode.window.registerTreeDataProvider('elysia-routes-view', routeProvider)
        );

        // Check if the current workspace checks specifically for 'elysia' dependency
        // 현재 워크스페이스가 'elysia' 의존성을 가지고 있는지 확인
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

            // Refresh provider if it is an elysia project to ensure nodes are shown
            // elysia 프로젝트인 경우 노드가 표시되도록 공급자 새로고침
            if (isElysiaProject) {
                routeProvider.refresh();
            }
        };

        // Run check in background, do not await
        // 백그라운드에서 확인 실행 (await 하지 않음)
        checkElysiaProject();

        // Register Refresh Command
        // 새로고침 명령어 등록
        context.subscriptions.push(
            vscode.commands.registerCommand('elysia.refreshRoutes', () => {
                routeProvider.refresh();
            })
        );

        // Refresh only on file save
        // 파일 저장 시에만 새로고침
        context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument(document => {
                if (document.languageId === 'typescript' || document.languageId === 'typescriptreact') {
                    logger.log(`Document saved: ${document.fileName}, refreshing routes...`);
                    routeProvider.refresh();
                }
            }),
            // Re-check on workspace folder changes
            // 워크스페이스 폴더 변경 시 재확인
            vscode.workspace.onDidChangeWorkspaceFolders(() => {
                logger.log('Workspace folders changed, re-checking project type...');
                checkElysiaProject();
            })
        );
    } catch (error) {
        logger.error('Failed to activate ElysiaJS extension', error);
        vscode.window.showErrorMessage('ElysiaJS Route Visualizer failed to activate. See output for details.');
    }
}

export function deactivate() {
    logger.log('ElysiaJS Route Visualizer is deactivating...');
}
