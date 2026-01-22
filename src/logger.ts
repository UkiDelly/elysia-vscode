import * as vscode from 'vscode';

class Logger {
    private channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel('Elysia Visualizer');
    }

    public log(message: string) {
        this.channel.appendLine(`[INFO] ${message}`);
    }

    public error(message: string, error?: any) {
        const errorMsg = error ? `: ${error.message || error}` : '';
        this.channel.appendLine(`[ERROR] ${message}${errorMsg}`);
    }

    public show() {
        this.channel.show(true);
    }

    public getDispose() {
        return this.channel;
    }
}

export const logger = new Logger();