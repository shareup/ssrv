import { type Config, configure } from '../config/mod.ts'
import { assertEquals } from '../deps/std/assert.ts'
import { fromFileUrl } from '../deps/std/path.ts'
import { build, ensureEsbuildInitialized, stop } from './esbuild.ts'
import { fetchPlugin } from './fetch-plugin.ts'

const config = await configure({
  root: fromFileUrl(new URL('.', import.meta.url))
})

Deno.test('fetch plugin retrieves the remote code', async () => {
  await ensureEsbuildInitialized()

  try {
    const result = await simulateBuild(
      [fromFileUrl(new URL('./test-fixtures/remote-imports.ts', config.root))],
      config
    )

    assertEquals(result.outputFiles.length, 1)

    const output = result.outputFiles[0].text
    const expected =
      `var e=class extends Error{constructor(){super("Deadline"),this.name="DeadlineError"}};export{e as DeadlineError};\n`

    assertEquals(output, expected)
  } finally {
    await stop()
  }
})

Deno.test('fetch plugin retrieves npm packages', async () => {
  await ensureEsbuildInitialized()

  try {
    const result = await simulateBuild(
      [fromFileUrl(new URL('./test-fixtures/npm-imports.ts', config.root))],
      config
    )

    assertEquals(result.outputFiles.length, 1)

    const output = result.outputFiles[0].text
    const expected =
      `var v=Object.create,l=Object.defineProperty,b=Object.getOwnPropertyDescriptor,y=Object.getOwnPropertyNames,d=Object.getPrototypeOf,i=Object.prototype.hasOwnProperty,m=(r,e)=>()=>(e||r((e={exports:{}}).exports,e),e.exports),O=(r,e)=>{for(var t in e)l(r,t,{get:e[t],enumerable:!0})},o=(r,e,t,f)=>{if(e&&typeof e=="object"||typeof e=="function")for(let a of y(e))!i.call(r,a)&&a!==t&&l(r,a,{get:()=>e[a],enumerable:!(f=b(e,a))||f.enumerable});return r},x=(r,e,t)=>(o(r,e,"default"),t&&o(t,e,"default")),n=(r,e,t)=>(t=r!=null?v(d(r)):{},o(e||!r||!r.__esModule?l(t,"default",{value:r,enumerable:!0}):t,r)),s=m((r,e)=>{"use strict";e.exports=function(t){return Math.min.apply(Math,Array.isArray(t)?t:arguments)}}),c={};O(c,{default:()=>p});var g=n(s());x(c,n(s()));var{default:u,...j}=g,p=u!==void 0?u:j;export{p as smallest};\n`

    assertEquals(output, expected)
  } finally {
    await stop()
  }
})

Deno.test('fetch plugin retrieves jsr packages', async () => {
  await ensureEsbuildInitialized()

  try {
    const result = await simulateBuild(
      [fromFileUrl(new URL('./test-fixtures/jsr-imports.ts', config.root))],
      config
    )

    assertEquals(result.outputFiles.length, 1)

    const output = result.outputFiles[0].text

    const expected =
      `function o(){return{info:console.info,warn:console.warn,error:console.error,trace:console.trace}}export{o as useLogger};\n`

    assertEquals(output, expected)
  } finally {
    await stop()
  }
})

function simulateBuild(entryPoints: string[], config: Config) {
  return build({
    absWorkingDir: fromFileUrl(config.root),
    allowOverwrite: true,
    bundle: true,
    define: {},
    entryPoints,
    outdir: fromFileUrl(config.root),
    outbase: fromFileUrl(config.root),
    minify: true,
    treeShaking: true,
    metafile: true,
    format: 'esm',
    write: false,
    plugins: [fetchPlugin()],
    platform: 'neutral',
    pure: ['console.debug'],
    target: 'esnext'
  })
}
