import { type Context } from '../deps/oak.ts'

export type EntryPointConfig = {
  specifiers: string[]
  shouldSplit?: boolean
}

export type ImportMap = {
  imports: Record<string, string>
  resolve: (specifier: string) => string | undefined
}

export type Config = {
  mode: Mode
  version: string
  port: number
  root: URL
  jsxImportSource: string
  ssrRenderFile: (url: URL, routerContext: Context) => Promise<void>
  browserTarget: string[]
  importMap?: ImportMap
  importMapPath?: URL
  prepend?: Middleware[]
  append?: Middleware[]
}

export type Mode = 'dev' | 'prod'
