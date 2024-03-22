declare global {
  interface Window {
    DEV?: boolean
    PROD?: boolean
    VERSION?: string
  }
}

import { type Context } from '../deps/oak.ts'
import { encodeBase64 } from '../deps/std/encoding.ts'
import { dirname, resolve, toFileUrl } from '../deps/std/path.ts'
import { exists } from '../utils/exists.ts'
import { prepareImportMap } from './import-map.ts'
import { type Config, type ImportMap, type Mode } from './types.ts'

export * from './types.ts'

const decoder = new TextDecoder()

export async function configure(
  opts?: {
    mode?: Mode
    version?: string
    defaultPort?: number
    root?: string
    jsxImportSource?: string
    ssrRenderFile?: (url: URL, routerContext: Context) => Promise<void>
    browserTarget?: string[]
    importMap?: { imports: Record<string, string> }
    importMapPath?: string
  }
): Promise<Config> {
  opts || (opts = {})

  const mode: Mode = opts.mode ?? (Deno.env.get('MODE') === 'prod' ? 'prod' : 'dev')
  const version: string = opts.version ?? (Deno.env.get('VERSION') || randomVersion())
  const browserTarget = opts.browserTarget ?? ['esnext']
  const jsxImportSource = opts.jsxImportSource ?? 'preact'
  const ssrRenderFile = opts.ssrRenderFile ?? (await import('../preact.ts')).renderFile

  self.DEV = mode === 'dev'
  self.PROD = mode === 'prod'
  self.VERSION = version

  let rootPath = resolve(opts.root || Deno.cwd())

  if (!rootPath.endsWith('/')) {
    rootPath = rootPath + '/'
  }

  const root = toFileUrl(rootPath)

  console.debug(`Root ${root}`)

  let importMap: ImportMap | undefined = undefined
  let importMapPath: URL | undefined = undefined

  if (!opts.importMap && !opts.importMapPath) {
    const importMapURL = new URL('./import_map.json', root)

    if (await exists(importMapURL)) {
      // TODO: we need another property named importMapFileName or something I guess
      opts.importMapPath = dirname(importMapURL.pathname)

      const importMapContents = await Deno.readFile(importMapURL)
      const importMapJSON = decoder.decode(importMapContents)
      opts.importMap = prepareImportMap(JSON.parse(importMapJSON))
    }
  }

  if (opts.importMap) {
    importMap = prepareImportMap(opts.importMap)

    if (opts.importMapPath) {
      importMapPath = new URL(opts.importMapPath, root)
    } else {
      importMapPath = new URL(root)
    }
  }

  const defaultPort = opts.defaultPort || 8080
  const port = parseInt(Deno.env.get('PORT') || String(defaultPort), 10)

  return {
    mode,
    version,
    port,
    root,
    jsxImportSource,
    ssrRenderFile,
    browserTarget,
    importMap,
    importMapPath
  }
}

function randomVersion(): string {
  const randomBytes = new Uint8Array(8)
  crypto.getRandomValues(randomBytes)
  return encodeBase64(randomBytes)
}
