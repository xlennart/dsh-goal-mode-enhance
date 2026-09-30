/**
 * Single-file client + ESM host build for dsh-goal-mode.
 *
 * The web server serves exactly one file per plugin
 * (/plugins/ui-goal-mode/client.js — the module id in the banner stays the
 * package name), so the client half is one CJS bundle wrapped in the
 * ModuleLoader factory handshake; @deepseek-ai/dsh-* and react stay external
 * (the profile's healed node_modules and the app's module system provide
 * them). The host half is plain ESM for Node, externalizing @deepseek-ai/dsh-*
 * and cordis while bundling schemastery (the Loader validates Config against
 * the schema).
 */
import { build } from 'esbuild'
import { mkdirSync, readFileSync } from 'node:fs'

mkdirSync('lib', { recursive: true })

const dshExternal = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-*']

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: true,
  external: dshExternal,
  logLevel: 'info',
})

await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  jsx: 'automatic',
  external: [...dshExternal, 'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'scheduler'],
  banner: {
    js: "window.__ModuleLoader__.load({ id: 'dsh-goal-mode', factory: (require) => { var module = { exports: {} }; var exports = module.exports;",
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
})

const clientBundle = readFileSync('lib/client.js', 'utf8')
const forbiddenClientRequires = [
  '@deepseek-ai/dsh-settings',
  '@deepseek-ai/cordis',
]
for (const moduleName of forbiddenClientRequires) {
  if (clientBundle.includes(`require(\"${moduleName}\")`) || clientBundle.includes(`require('${moduleName}')`)) {
    throw new Error(`client bundle contains forbidden Host runtime import: ${moduleName}`)
  }
}

// Type declarations are generated separately (`pnpm run typecheck` proves the
// program; tsc -p emits lib/types). Bundling stops here: the dsh loader reads
// lib/index.js and lib/client.js only, so declaration emit is not required
// for installation.
