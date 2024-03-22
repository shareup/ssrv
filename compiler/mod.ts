import { type Config } from '../config/types.ts'
import { contentType } from '../deps/media_types.ts'
import { etag as etagLib } from '../deps/oak.ts'
import { extname, fromFileUrl, parse, relative, toFileUrl } from '../deps/std/path.ts'
import { canCompile } from '../utils/can-compile.ts'
import { isRemote } from '../utils/is-remote.ts'
import { build, type Plugin } from './esbuild.ts'
import { fetchPlugin } from './fetch-plugin.ts'
import { importMapPlugin } from './import-map-plugin.ts'

export type CompiledFile = {
  fileUrl: URL
  urlPath: string
  contents: Uint8Array
  etag?: string
  mime?: string
}

export type CompiledEntrypoint = CompiledFile & {
  specifier: string
}

export type Bundle = {
  entryPoints: CompiledEntrypoint[]
  files: CompiledFile[]
}

export async function compile(
  entryPointUrls: (URL | string)[],
  options: {
    config: Config
    shouldSplit?: boolean
  }
): Promise<Bundle> {
  if (entryPointUrls.length === 0) {
    throw new Error('must compile at least one entryPoint')
  }

  // NOTE: defaults to all true
  options.shouldSplit === undefined && (options.shouldSplit = true)
  const { shouldSplit, config } = options

  const esbuildEntrypoints: string[] = []
  const assetEntrypoints: URL[] = []

  for (const url of entryPointUrls) {
    if (isRemote(url)) {
      esbuildEntrypoints.push(url.toString())
    } else if (canCompile(url)) {
      const onDisk = new URL(url, config.root)

      if (onDisk) {
        esbuildEntrypoints.push(fromFileUrl(onDisk))
      } else {
        throw new Deno.errors.NotFound(`${url} not found`)
      }
    } else {
      assetEntrypoints.push(new URL(url, config.root))
    }
  }

  console.debug(`Bundle assets: ${assetEntrypoints.map(a => fromFileUrl(a))}`)
  console.debug(`Bundle entryPoints: ${esbuildEntrypoints}`)

  const compiledAssetEntrypoints = await readFromDisk(assetEntrypoints, config)

  if (esbuildEntrypoints.length === 0) {
    return { entryPoints: compiledAssetEntrypoints, files: [] }
  }

  const plugins: Plugin[] = [
    importMapPlugin(config),
    fetchPlugin()
  ]

  const assetNames = '[dir]/[name]'
  const chunkNames = '[dir]/[name]-[hash]'
  const entryNames = '[dir]/[name]'

  let pure: string[] | undefined

  if (config.mode === 'prod') {
    pure = ['console.debug', 'console.assert']
  }

  const logLevel = config.mode === 'dev' ? 'debug' : 'warning'

  let logOverride = {}

  if (config.mode === 'dev') {
    logOverride = { 'unsupported-regexp': 'silent' }
  }

  const define: Record<string, string> = {
    'self.Deno': 'false',
    'self.DEV': config.mode === 'dev' ? 'true' : 'false',
    'self.PROD': config.mode === 'prod' ? 'true' : 'false',
    'self.VERSION': `'${config.version}'`
  }

  const result = await build({
    absWorkingDir: fromFileUrl(config.root),
    allowOverwrite: true,
    bundle: true,
    charset: 'utf8',
    define,
    entryPoints: esbuildEntrypoints,
    assetNames,
    chunkNames,
    entryNames,
    legalComments: 'none',
    logLevel,
    logOverride,
    outdir: '.',
    outbase: '.',
    minify: config.mode === 'prod',
    treeShaking: true,
    metafile: true,
    format: 'esm',
    write: false,
    plugins,
    pure,
    jsx: 'automatic',
    jsxImportSource: config.jsxImportSource,
    platform: 'browser',
    target: config.browserTarget,
    sourcemap: 'linked',
    splitting: shouldSplit
  })

  for (const err of result.errors) {
    console.error(err)
  }

  for (const w of result.warnings) {
    console.warn(w)
  }

  if (!result.metafile) {
    throw new Error('[dvsrv/compiler] did not create a metafile')
  }

  const outputFiles: Map<string, CompiledFile> = new Map()
  const rootString = config.root.toString()

  for (const file of result.outputFiles) {
    const mime = contentType(extname(file.path))
    const fileUrl = toFileUrl(file.path)
    const contents = file.contents
    const etag = await etagLib.calculate(contents, { weak: true })
    const pathString = fileUrl.toString()
    const urlPath = `/${relative(rootString, pathString)}`

    outputFiles.set(fileUrl.toString(), { fileUrl, contents, etag, mime, urlPath })
  }

  const compiledFiles: CompiledFile[] = []
  const compiledEntryPoints: CompiledEntrypoint[] = []

  for (const [key, out] of Object.entries(result.metafile.outputs)) {
    const url = new URL(key, config.root)
    const file = outputFiles.get(url.toString())

    if (!file) {
      throw new Error(
        `[dvsrv/compiler] esbuild said it output a file which we cannot find: ${key} - ${url}`
      )
    }

    if (out.entryPoint) {
      compiledEntryPoints.push(
        Object.assign({}, file, {
          specifier: `/${out.entryPoint}`
        })
      )
    } else {
      compiledFiles.push(file)
    }
  }

  if (compiledEntryPoints.length === 0) {
    throw new Error(
      '[dvsrv/compiler] did not find an entryPoint in the meta files in the result bundle'
    )
  }

  const bundle: Bundle = {
    entryPoints: compiledEntryPoints.concat(compiledAssetEntrypoints),
    files: compiledFiles
  }

  return bundle
}

async function readFromDisk(
  locations: URL[],
  config: Config
): Promise<CompiledEntrypoint[]> {
  const entryPoints: CompiledEntrypoint[] = []

  for (const location of locations) {
    const contents = await Deno.readFile(location)
    const stat = await Deno.stat(location)
    const etag = await etagLib.calculate(stat, { weak: true })
    const parsed = parse(fromFileUrl(location))
    const urlPath = `/${relative(fromFileUrl(config.root), fromFileUrl(location))}`
    const specifier = `/${urlPath}`

    entryPoints.push({
      fileUrl: location,
      contents,
      etag,
      mime: contentType(parsed.ext),
      specifier,
      urlPath
    })
  }

  return entryPoints
}
