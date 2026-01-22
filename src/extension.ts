import * as vscode from 'vscode';
import { RouteTreeProvider } from './route-provider';

export async function activate(context: vscode.ExtensionContext) {
    console.log('ElysiaJS Route Visualizer is now active!');

    // Check if the current workspace checks specifically for 'elysia' dependency
    const checkElysiaProject = async () => {
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
                console.error(`Failed to parse package.json at ${file.fsPath}:`, error);
            }
        }

        vscode.commands.executeCommand('setContext', 'elysia:isElysiaProject', isElysiaProject);
    };

    // Initial check - await를 추가하여 context 설정이 완료될 때까지 대기
    await checkElysiaProject();

    const routeProvider = new RouteTreeProvider();

    // Register the Tree View - 이제 elysia:isElysiaProject context가 설정된 후 실행됨
    vscode.window.registerTreeDataProvider('elysia-routes-view', routeProvider);

    // Refresh on file save or active editor change
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => routeProvider.refresh()),
        vscode.workspace.onDidChangeTextDocument(e => {
            if (vscode.window.activeTextEditor && e.document === vscode.window.activeTextEditor.document) {
                routeProvider.refresh();
            }
        }),
        // Re-check on workspace folder changes
        vscode.workspace.onDidChangeWorkspaceFolders(() => checkElysiaProject())
    );
}

export function deactivate() {}
