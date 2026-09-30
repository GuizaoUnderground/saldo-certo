// Gera web-preview/dist/app.js a partir do mesmo código do aplicativo.
import { build } from '/home/claude/.npm-global/lib/node_modules/tsx/node_modules/esbuild/lib/main.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const G = '/home/claude/.npm-global/lib/node_modules';

await build({
  entryPoints: [path.join(aqui, 'main.tsx')],
  bundle: true,
  outfile: path.join(aqui, 'dist', 'app.js'),
  format: 'iife',
  minify: true,
  jsx: 'automatic',
  resolveExtensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.js'],
  alias: {
    'react-native': path.join(aqui, 'rn-shim.tsx'),
    'expo-status-bar': path.join(aqui, 'stubs.tsx'),
    'react-native-safe-area-context': path.join(aqui, 'stubs.tsx'),
    react: path.join(G, 'react'),
    'react-dom': path.join(G, 'react-dom'),
  },
  nodePaths: [G],
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
});
