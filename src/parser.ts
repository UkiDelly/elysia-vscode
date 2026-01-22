import * as ts from 'typescript';

export interface RouteItem {
    method: string;
    path: string;
    line: number;
    children?: RouteItem[];
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

// Helper to find 'prefix' in 'new Elysia({ prefix: "..." })'
function getElysiaInstancePrefix(node: ts.CallExpression): string {
    let expr: ts.Expression = node.expression;

    // Traverse down the chain: app.get().post() -> new Elysia()
    while (ts.isPropertyAccessExpression(expr) || ts.isCallExpression(expr) || ts.isParenthesizedExpression(expr)) {
        if (ts.isPropertyAccessExpression(expr)) {
            expr = expr.expression;
        } else if (ts.isCallExpression(expr)) {
            expr = expr.expression;
        } else if (ts.isParenthesizedExpression(expr)) {
            expr = expr.expression;
        }
    }

    if (ts.isNewExpression(expr)) {
        // Check if it is 'new Elysia(...)'
        if (ts.isIdentifier(expr.expression) && expr.expression.text === 'Elysia') {
            const configArg = expr.arguments?.[0];
            if (configArg && ts.isObjectLiteralExpression(configArg)) {
                const prefixProp = configArg.properties.find(p =>
                    p.name && ts.isIdentifier(p.name) && p.name.text === 'prefix'
                );

                if (prefixProp && ts.isPropertyAssignment(prefixProp)) {
                    if (ts.isStringLiteral(prefixProp.initializer)) {
                        return prefixProp.initializer.text;
                    }
                }
            }
        }
    }

    return '';
}

export function parseRoutes(code: string): RouteItem[] {
    const sourceFile = ts.createSourceFile('temp.ts', code, ts.ScriptTarget.Latest, true);
    const routes: RouteItem[] = [];

    function visit(node: ts.Node, prefix: string = '') {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            const methodName = node.expression.name.text;

            const instancePrefix = getElysiaInstancePrefix(node);
            const effectivePrefix = prefix || instancePrefix;

            if (methodName === 'group') {
                // Handle .group('/prefix', callback)
                const pathArg = node.arguments[0];
                const callback = node.arguments[1];

                if (pathArg && ts.isStringLiteral(pathArg)) {
                    const newPrefix = effectivePrefix + pathArg.text;
                    // Traverse the callback body with the accumulated prefix
                    if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
                        visit(callback.body, newPrefix);
                    }
                }

                // Custom traversal to avoid double-visiting the callback with empty prefix
                visit(node.expression, prefix); // Continue traversing up the chain
                if (pathArg) visit(pathArg, prefix);
                // Skip 'callback' (node.arguments[1]) here because we manually visited it above
                for (let i = 2; i < node.arguments.length; i++) {
                    visit(node.arguments[i], prefix);
                }
                return; // Stop standard forEachChild
            } else if (HTTP_METHODS.includes(methodName)) {
                // Ensure it has at least 2 arguments (path, handler) to avoid matching 'headers.get("key")'
                if (node.arguments.length < 2) {
                    return;
                }

                // Handle .get('/path', ...)
                const pathArg = node.arguments[0];
                if (pathArg && ts.isStringLiteral(pathArg)) {
                    const fullPath = effectivePrefix + pathArg.text;
                    const { line } = sourceFile.getLineAndCharacterOfPosition(node.expression.name.getStart());

                    routes.push({
                        method: methodName.toUpperCase(),
                        path: fullPath,
                        line: line + 1,
                    });
                }
            }
        }

        ts.forEachChild(node, (child) => visit(child, prefix));
    }

    visit(sourceFile);
    return routes;
}
