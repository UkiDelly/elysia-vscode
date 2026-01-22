import * as vscode from 'vscode';
import { RouteTreeProvider } from './route-provider';

export function activate(context: vscode.ExtensionContext) {
    console.log('ElysiaJS Route Visualizer is now active!');

    const routeProvider = new RouteTreeProvider();

    // Register the Tree View
    vscode.window.registerTreeDataProvider('elysia-routes-view', routeProvider);

    // Refresh on file save or active editor change
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => routeProvider.refresh()),
        vscode.workspace.onDidChangeTextDocument(e => {
            if (vscode.window.activeTextEditor && e.document === vscode.window.activeTextEditor.document) {
                routeProvider.refresh();
            }
        })
    );
}

export function deactivate() {}
