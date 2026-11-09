/**
 * Offline smoke test for the built client half (lib/client.js).
 *
 * It reproduces the host's CJS module-loader handshake
 * (`window.__ModuleLoader__.load({ id, factory })`), runs the factory with a
 * minimal `require` table holding the only externals the bundle may reference,
 * then calls the plugin body against a stub client Context and asserts the four
 * registrations land on the expected slot keys. No browser, no host needed.
 *
 * Externals are the profile-provided modules: `@deepseek-ai/dsh-client-store`,
 * `react`, and `react/jsx-runtime`. Anything else appearing in a `require()`
 * call is a leak of a Host-only dependency and fails the smoke.
 */
import { readFileSync } from 'node:fs'
import * as clientStore from '@deepseek-ai/dsh-client-store'
import * as react from 'react'
import * as jsxRuntime from 'react/jsx-runtime'

const BUNDLE = 'lib/client.js'
const EXPECTED_REGISTRATIONS = [
  ['conversation.input.dock', 'goal'],
  ['conversation.input.left', 'goal-mode'],
  ['settings.general.item', 'goal-mode'],
  ['settings.section', 'goal-mode'],
]

const code = readFileSync(BUNDLE, 'utf8')
const externals = {
  '@deepseek-ai/dsh-client-store': clientStore,
  'react': react,
  'react/jsx-runtime': jsxRuntime,
}

function fail(message) {
  console.error(`smoke: FAIL ${message}`)
  process.exit(1)
}

// The bundle is a CJS factory wrapped in the loader handshake; capture it.
let handshake
globalThis.window = {
  __ModuleLoader__: {
    load: (descriptor) => { handshake = descriptor },
  },
}
globalThis.document = {
  getElementById: () => null,
  createElement: () => ({ set textContent(_v) {}, id: '' }),
  head: { appendChild: () => {} },
}
globalThis.HTMLStyleElement = class {}

new Function('require', code)((name) => {
  const external = externals[name]
  if (external === undefined) fail(`client bundle requires an unexpected external: ${name}`)
  return external
})

if (handshake === undefined) fail('bundle did not call window.__ModuleLoader__.load')
if (handshake.id !== 'dsh-goal-mode') fail(`loader id is ${JSON.stringify(handshake.id)}, expected "dsh-goal-mode"`)
if (typeof handshake.factory !== 'function') fail('handshake carries no factory')

const exports = handshake.factory((name) => {
  const external = externals[name]
  if (external === undefined) fail(`factory requires an unexpected external: ${name}`)
  return external
})

if (typeof exports.apply !== 'function') fail('factory exports no apply()')
if (!Array.isArray(exports.inject)) fail('factory exports no inject list')
for (const service of ['slots', 'sessions', 'remote', 'remote.goals', 'locale', 'configForms']) {
  if (!exports.inject.includes(service)) fail(`inject list is missing the ${service} service`)
}

// --- Stub client Context: only the services the plugin body touches. ---
const registrations = []
const injectedSlots = []
const reported = []
const log = (...args) => reported.push(args.join(' '))

const stub = {
  effect: (fn, label) => { log('effect', label); fn(); return () => {} },
  locale: {
    register: (ns, dictionaries) => {
      for (const lang of ['zh', 'en']) {
        if (dictionaries?.[lang] === undefined) fail(`locale ${ns} misses the ${lang} dictionary`)
      }
      return () => {}
    },
    bind: (ns) => (key) => `${ns}:${key}`,
  },
  sessions: {
    binding: () => undefined,
    list: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} },
  },
  remote: {
    goals: {
      create: async () => ({ ok: true }),
      edit: async () => ({ ok: true }),
      pause: async () => ({ ok: true }),
      resume: async () => ({ ok: true }),
      complete: async () => ({ ok: true }),
      clear: async () => ({ ok: true }),
    },
  },
  configForms: {
    get: () => ({
      getSnapshot: () => ({ value: undefined }),
      subscribe: () => () => {},
      set: async () => ({ ok: true }),
    }),
  },
  slots: {
    inject: (name, produce) => {
      injectedSlots.push(name)
      produce()
      return () => {}
    },
    register: (spec, component) => {
      if (typeof component !== 'function') fail(`slot ${spec.name}: ${spec.id} registered no component`)
      if (typeof spec.inject !== 'function') fail(`slot ${spec.name}: ${spec.id} declares no inject factory`)
      registrations.push([spec.name, spec.id])
      return () => {}
    },
  },
}

exports.apply(stub)

// --- Assertions. ---
for (const expected of EXPECTED_REGISTRATIONS) {
  const [name, id] = expected
  if (!registrations.some(([n, i]) => n === name && i === id)) {
    fail(`missing registration ${name}:${id} (got ${JSON.stringify(registrations)})`)
  }
  if (!injectedSlots.includes(name)) fail(`slot ${name} was never injected`)
}

console.log(`smoke: OK client bundle ${handshake.id} — ${registrations.length} registrations: ${registrations.map(([n, i]) => `${n}:${i}`).join(', ')}`)
