import * as ts from 'typescript';

export interface RouteItem {
    method: string;
    path: string;
    line: number;
}

export interface ParsedData {
    routes: RouteItem[];
    // Map of exported variable names to their defined routes (if they are Elysia instances)
    exports: Record<string, RouteItem[]>;
    // List of .use() calls to other variables
    usages: {
        variable: string;
        prefix: string;
        line: number;
    }[];
    // Map of local variable names to imported original names (e.g. { AdminModules: 'AdminModules' })
    imports: Record<string, string>;
}


const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];



function normalizePath(path: string): string {
    if (!path) return '';
    if (!path.startsWith('/')) {
        return '/' + path;
    }
    return path;
}

export function joinPaths(prefix: string, path: string): string {
    const normalizedPrefix = normalizePath(prefix);
    const normalizedPath = normalizePath(path);

    // If we have a prefix but no path (e.g. group('/api') -> get('')), return prefix.
    // Ensure we handle root prefix '/' correctly (return '/')
    if (!normalizedPath) {
        if (!normalizedPrefix) return '/';
        // Strip trailing slash from prefix if it exists and prefix is not just root
        if (normalizedPrefix.endsWith('/') && normalizedPrefix.length > 1) {
            return normalizedPrefix.slice(0, -1);
        }
        return normalizedPrefix;
    }

    // If we have path but no prefix (e.g. get('/info')), return path
    if (!normalizedPrefix || normalizedPrefix === '/') {
        return normalizedPath || '/';
    }

    // Both exist
    const cleanPrefix = normalizedPrefix.endsWith('/') && normalizedPrefix.length > 1
        ? normalizedPrefix.slice(0, -1)
        : normalizedPrefix;

    return cleanPrefix + normalizedPath;
}

// Helper to find 'prefix' in 'new Elysia({ prefix: "..." })'
function getElysiaInstancePrefix(node: ts.CallExpression): string {
    let expr: ts.Expression = node.expression;

    // Traverse down the chain: app.get().post() -> new Elysia()
    while (ts.isPropertyAccessExpression(expr) || ts.isCallExpression(expr) || ts.isParenthesizedExpression(expr)) {
        if (ts.isPropertyAccessExpression(expr)) {
            expr = expr.expression;
        } else if (ts.isCallExpression(expr)) {
            expr = expr.expression; // Go deeper into the call chain
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
                        return normalizePath(prefixProp.initializer.text);
                    }
                }
            }
        }
    }

    return '';
}

export function parseRoutes(code: string): ParsedData {
    const sourceFile = ts.createSourceFile('temp.ts', code, ts.ScriptTarget.Latest, true);

    const routes: RouteItem[] = []; // Routes found "loosely" (not tracked to a specific variable yet, or all routes)
    // Actually, we want to group routes by the variable that defines them.
    // For now, let's keep 'routes' as a flat list of ALL routes found in the file, 
    // but also track 'exports' specifically.
    // Issue: If we just list all valid routes in 'routes', the provider shows duplicates or un-nested ones.
    // Strategy: 'routes' will contain ALL routes found. Usage resolution will happen in provider 
    // to APPEND nested routes to this list or create a clean view.

    // Better: 'routes' contains all inline defined routes.

    const exports: Record<string, RouteItem[]> = {};
    const usages: { variable: string; prefix: string; line: number; }[] = [];
    const imports: Record<string, string> = {};

    // 1. Parse Imports
    // import { AdminModules } from './admin.module';
    // import Admin from './admin'; 
    function visitImports(node: ts.Node) {
        if (ts.isImportDeclaration(node)) {
            const importClause = node.importClause;
            if (importClause) {
                // Default import
                if (importClause.name) {
                    imports[importClause.name.text] = importClause.name.text; // Simplification: assume mostly same name reuse or tracked by file
                }

                // Named imports
                if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
                    importClause.namedBindings.elements.forEach(element => {
                        imports[element.name.text] = element.propertyName?.text || element.name.text;
                    });
                }
            }
        }
        ts.forEachChild(node, visitImports);
    }
    visitImports(sourceFile);

    // 2. Track Variable Declarations (to identify Exports)
    // export const app = ...
    // or const app = ...; export { app };
    const exportedVariables = new Set<string>();

    function visitExports(node: ts.Node) {
        if (ts.isExportDeclaration(node)) {
            if (node.exportClause && ts.isNamedExports(node.exportClause)) {
                node.exportClause.elements.forEach(el => {
                    exportedVariables.add(el.name.text);
                });
            }
        }
        if (ts.isVariableStatement(node)) {
            if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                node.declarationList.declarations.forEach(decl => {
                    if (ts.isIdentifier(decl.name)) {
                        exportedVariables.add(decl.name.text);
                    }
                });
            }
        }
        ts.forEachChild(node, visitExports);
    }
    visitExports(sourceFile);

    // 3. Main Traversal for Routes and Usages
    // We need to associate routes with the variable they are attached to.
    // Traverse VariableDeclarations -> initializer call chain.

    function visit(node: ts.Node, prefix: string = '') {
        // Checking for routes directly in the AST (like original logic)
        // But also checking if it's part of a variable declaration we care about.

        // Let's reuse original logic for finding route CALLS, 
        // but now we also look for .use().

        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            const methodName = node.expression.name.text;
            const instancePrefix = getElysiaInstancePrefix(node);
            const effectivePrefix = prefix || instancePrefix;

            if (methodName === 'group') {
                const pathArg = node.arguments[0];
                const callback = node.arguments[1];
                if (pathArg && ts.isStringLiteral(pathArg)) {
                    const newPrefix = joinPaths(effectivePrefix, pathArg.text);
                    if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
                        visit(callback.body, newPrefix);
                    }
                }
                visit(node.expression, prefix);
                if (pathArg) visit(pathArg, prefix);
                for (let i = 2; i < node.arguments.length; i++) visit(node.arguments[i], prefix);
                return;
            } else if (methodName === 'guard') {
                // ... handled similar to original ...
                // Simplified for brevity, same logic as before to dive into callback
                const callback = node.arguments.find(arg => ts.isArrowFunction(arg) || ts.isFunctionExpression(arg));
                if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
                    visit(callback.body, effectivePrefix);
                }
                visit(node.expression, prefix);
                node.arguments.forEach(arg => arg !== callback && visit(arg, prefix));
                return;

            } else if (methodName === 'use') {
                // .use(adminRoutes)
                const useArg = node.arguments[0];
                if (useArg && ts.isIdentifier(useArg)) {
                    // It's a variable usage!
                    usages.push({
                        variable: useArg.text,
                        prefix: effectivePrefix,
                        line: sourceFile.getLineAndCharacterOfPosition(useArg.getStart()).line + 1
                    });
                }
            } else if (HTTP_METHODS.includes(methodName)) {
                if (node.arguments.length >= 2) {
                    const pathArg = node.arguments[0];
                    if (pathArg && ts.isStringLiteral(pathArg)) {
                        const fullPath = joinPaths(effectivePrefix, pathArg.text);
                        const { line } = sourceFile.getLineAndCharacterOfPosition(node.expression.name.getStart());

                        const route = {
                            method: methodName.toUpperCase(),
                            path: fullPath,
                            line: line + 1,
                        };
                        routes.push(route);

                        // Try to find which variable this belongs to
                        let current: ts.Node = node;
                        while (current.parent) {
                            if (ts.isVariableDeclaration(current.parent) && ts.isIdentifier(current.parent.name)) {
                                const varName = current.parent.name.text;
                                if (exportedVariables.has(varName)) {
                                    if (!exports[varName]) exports[varName] = [];
                                    exports[varName].push(route);
                                }
                                break;
                            }
                            current = current.parent;
                        }
                    }
                }
            }
        }

        ts.forEachChild(node, (child) => visit(child, prefix));
    }

    visit(sourceFile);

    // Also attach usages to exports if they are inside the declaration
    // (The usage visitor above just pushes to global 'usages', but we might want to know WHO used it.
    // For now, global usages per file is enough for the provider to link them if we assume one main app or interconnected modules.)

    return { routes, exports, usages, imports };
}
