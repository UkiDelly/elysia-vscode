
// Mock types
interface RouteItem {
  method: string;
  path: string;
  line: number;
  parentVar?: string;
}

interface ParsedData {
  routes: RouteItem[];
  exports: Record<string, RouteItem[]>;
  usages: {
    variable: string;
    prefix: string;
    line: number;
    parentVar?: string;
  }[];
  imports: Record<string, string>;
}

// Logic Function (Copied/Adapted from route-provider.ts)
function resolveRoutes(parsedFiles: Map<string, ParsedData>) {

  const getModuleKey = (filePath: string, varName: string) => `${filePath}::${varName}`;

  interface UsageEdge {
    fromFile: string;
    fromVar?: string;
    toFile: string;
    toVar: string;
    prefix: string;
  }

  const edges: UsageEdge[] = [];

  // Build Graph
  for (const [fsPath, data] of parsedFiles.entries()) {
    for (const usage of data.usages) {
      const originalName = data.imports[usage.variable];
      if (originalName) {
        for (const [otherPath, otherData] of parsedFiles.entries()) {
          if (otherPath === fsPath) continue;
          if (otherData.exports[originalName]) {
            edges.push({
              fromFile: fsPath,
              fromVar: usage.parentVar,
              toFile: otherPath,
              toVar: originalName,
              prefix: usage.prefix
            });
          }
        }
      } else {
        if (data.exports[usage.variable] || data.routes.some(r => r.parentVar === usage.variable)) {
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

  const resolvedPrefixes = new Map<string, Set<string>>();

  const resolvePrefixes = (file: string, varName: string, stack: string[] = []): Set<string> => {
    const key = getModuleKey(file, varName);
    if (resolvedPrefixes.has(key)) return resolvedPrefixes.get(key)!;
    if (stack.includes(key)) return new Set(['']);

    const incoming = edges.filter(e => e.toFile === file && e.toVar === varName);
    const results = new Set<string>();

    if (incoming.length === 0) {
      results.add('');
    } else {
      for (const edge of incoming) {
        let parentPrefixes: Set<string>;
        if (edge.fromVar) {
          parentPrefixes = resolvePrefixes(edge.fromFile, edge.fromVar, [...stack, key]);
        } else {
          parentPrefixes = new Set(['']);
        }

        for (const pp of parentPrefixes) {
          // joinPaths mock
          const join = (p1: string, p2: string) => {
            const n1 = p1 === '/' ? '' : p1;
            const n2 = p2.startsWith('/') ? p2 : '/' + p2;
            return (n1 + n2).replace('//', '/');
          };
          results.add(join(pp, edge.prefix));
        }
      }
    }

    resolvedPrefixes.set(key, results);
    return results;
  };

  const finalOutput: Record<string, string[]> = {};

  for (const [fsPath, data] of parsedFiles.entries()) {
    const routes: string[] = [];
    for (const route of data.routes) {
      if (route.parentVar) {
        const prefixes = resolvePrefixes(fsPath, route.parentVar, []);
        for (const prefix of prefixes) {
          // joinPaths mock matching above
          const join = (p1: string, p2: string) => {
            const n1 = p1 === '/' ? '' : p1;
            const n2 = p2.startsWith('/') ? p2 : '/' + p2;
            return (n1 + n2).replace('//', '/');
          };
          routes.push(`${route.method} ${join(prefix, route.path)}`);
        }
      } else {
        routes.push(`${route.method} ${route.path}`);
      }
    }
    finalOutput[fsPath] = routes;
  }
  return finalOutput;
}

// Test Data
const userFile = '/src/user.routes.ts';
const indexFile = '/src/index.ts';

const userData: ParsedData = {
  routes: [
    { method: 'POST', path: '/login', line: 10, parentVar: 'userRoutes' }
  ],
  exports: {
    'userRoutes': [{ method: 'POST', path: '/login', line: 10, parentVar: 'userRoutes' }]
  },
  usages: [],
  imports: {}
};

const indexData: ParsedData = {
  routes: [
    { method: 'GET', path: '/', line: 100 } // Orhan
  ],
  exports: {},
  usages: [
    { variable: 'userRoutes', prefix: '/users', line: 50 } // Top level usage (no parentVar)
  ],
  imports: {
    'userRoutes': 'userRoutes'
  }
};

const parsedFiles = new Map<string, ParsedData>();
parsedFiles.set(userFile, userData);
parsedFiles.set(indexFile, indexData);

const result = resolveRoutes(parsedFiles);
console.log(JSON.stringify(result, null, 2));

if (result[userFile].includes('POST /users/login') && !result[indexFile].includes('/users/login')) {
  console.log("PASSED");
} else {
  console.log("FAILED");
}
