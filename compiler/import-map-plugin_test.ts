import { type Config, configure } from '../config/mod.ts'
import { assertEquals } from '../deps/std/assert.ts'
import { fromFileUrl } from '../deps/std/path.ts'
import { build, ensureEsbuildInitialized, stop } from './esbuild.ts'
import { importMapPlugin } from './import-map-plugin.ts'

const expected =
  `import{v4 as r}from"https://deno.land/std@0.151.0/uuid/mod.ts";import{A as e}from"./a.ts";function t(){return new e(r.generate())}export{t as newA};\n`

Deno.test('import map plugin does nothing if no import map is provided', async () => {
  await ensureEsbuildInitialized()

  try {
    const config = await configure({
      root: fromFileUrl(new URL('.', import.meta.url))
    })

    const result = await simulateBuild(
      [fromFileUrl(new URL('./test-fixtures/simple-imports.ts', config.root))],
      config
    )

    assertEquals(result.outputFiles.length, 1)

    const output = result.outputFiles[0].text

    assertEquals(output, expected)
  } finally {
    await stop()
  }
})

Deno.test('import map plugin rewrites bare specifiers', async () => {
  await ensureEsbuildInitialized()

  try {
    const config = await configure({
      root: fromFileUrl(new URL('.', import.meta.url)),
      importMap: { imports: { uuid: 'https://deno.land/std@0.151.0/uuid/mod.ts' } }
    })

    const result = await simulateBuild(
      [fromFileUrl(new URL('./test-fixtures/bare-imports.ts.test', config.root))],
      config
    )

    assertEquals(result.outputFiles.length, 1)

    const output = result.outputFiles[0].text

    assertEquals(output, expected)
  } finally {
    await stop()
  }
})

Deno.test('import map plugin rewrites through directory-style base specifiers', async () => {
  await ensureEsbuildInitialized()

  try {
    const config = await configure({
      root: fromFileUrl(new URL('.', import.meta.url)),
      importMap: { imports: { 'std/': 'https://deno.land/std@0.151.0/' } }
    })

    const result = await simulateBuild(
      [fromFileUrl(new URL('./test-fixtures/bare-directory-imports.ts.test', config.root))],
      config
    )

    assertEquals(result.outputFiles.length, 1)

    const output = result.outputFiles[0].text

    assertEquals(output, expected)
  } finally {
    await stop()
  }
})

Deno.test('import map plugin rewrites file paths', async () => {
  await ensureEsbuildInitialized()

  try {
    const config = await configure({
      root: fromFileUrl(new URL('.', import.meta.url)),
      importMap: { imports: { './foo/': './' } }
    })

    const result = await simulateBuild(
      [fromFileUrl(new URL('./test-fixtures/remapped-directory-imports.ts.test', config.root))],
      config
    )

    assertEquals(result.outputFiles.length, 1)

    const output = result.outputFiles[0].text

    assertEquals(output, expected)
  } finally {
    await stop()
  }
})

Deno.test('import map plugin rewrites URLs', async () => {
  await ensureEsbuildInitialized()

  try {
    const config = await configure({
      root: fromFileUrl(new URL('.', import.meta.url)),
      importMap: { imports: { 'https://example.com/': 'https://deno.land/std@0.151.0/' } }
    })

    const result = await simulateBuild(
      [fromFileUrl(new URL('./test-fixtures/remapped-url-imports.ts.test', config.root))],
      config
    )

    assertEquals(result.outputFiles.length, 1)

    const output = result.outputFiles[0].text

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
    entryPoints,
    external: ['./a.ts'],
    loader: { '.test': 'ts' },
    outdir: fromFileUrl(config.root),
    outbase: fromFileUrl(config.root),
    minify: true,
    treeShaking: true,
    metafile: true,
    format: 'esm',
    write: false,
    plugins: [importMapPlugin(config)],
    platform: 'neutral',
    target: 'esnext'
  })
}
