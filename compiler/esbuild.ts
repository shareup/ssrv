import { initialize, stop as esbuildStop, wasmURL } from '../deps/esbuild.ts'

export { build } from '../deps/esbuild.ts'
export type { Loader, OnLoadArgs, Plugin } from '../deps/esbuild.ts'

let esbuildInitialized: boolean | Promise<void> = false

export async function stop() {
  // NOTE: none of us like this code, but technically this fixes a very weird
  // interaction between esbuild and Deno.test. esbuild appears to be leaving a
  // promise around, but it's unclear who is really at fault. We don't know why
  // the setTimeout() + clearTimeout() work, but it does appear to work
  // everytime.
  esbuildInitialized = false
  const t = setTimeout(() => {}, 100_000)
  await esbuildStop()
  clearTimeout(t)
}

export async function ensureEsbuildInitialized() {
  if (!esbuildInitialized) {
    if (Deno.Command === undefined) {
      console.debug(`Initializing esbuild with wasm: ${wasmURL}`)
      esbuildInitialized = initialize({ wasmURL, worker: false })
    } else {
      console.debug(`Initializing esbuild with deno`)
      initialize({})
    }
    await esbuildInitialized
    esbuildInitialized = true
    console.debug(`Initialized.`)
  } else if (esbuildInitialized instanceof Promise) {
    await esbuildInitialized
  }
}
