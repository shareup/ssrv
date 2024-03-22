import renderToString from 'https://esm.sh/preact-render-to-string@6.0.2'
import { createContext, h, type VNode } from 'https://esm.sh/preact@10.20.0'
import { useContext } from 'https://esm.sh/preact@10.20.0/hooks'
import { type Context } from './deps/oak.ts'

export type ResponseValue = {
  status?: number
  headers?: Record<string, string>
}

type RenderResult = {
  html: string
  status: number
  headers: Record<string, string>
}

export const ResponseContext = createContext<ResponseValue>({})

export function setResponseStatus(status: number): void {
  const context = useContext(ResponseContext)
  context.status = status
}

export function setResponseHeader(name: string, value: string): void {
  const context = useContext(ResponseContext)
  context.headers ||= {}
  context.headers[name] = value
}

export async function renderFile(url: URL, routerContext: Context): Promise<void> {
  const mod = await import(url.href)
  return renderResponse(h(mod.default, {}, []), routerContext)
}

export function renderResponse(
  // deno-lint-ignore no-explicit-any
  vnode: VNode<any>,
  routerContext: Context
): void {
  try {
    const { status, html, headers } = render(vnode)

    routerContext.response.status = status

    for (const [name, value] of Object.entries(headers)) {
      routerContext.response.headers.set(name, value)
    }

    routerContext.response.body = '<!doctype html>' + html
    routerContext.response.type = 'html'
  } catch (e) {
    console.error('renderSync threw')
    console.error(e)
    routerContext.response.status = 500
    routerContext.response.body = 'our rendering broke'
    routerContext.response.type = 'text'
  }
}

export function render(
  // deno-lint-ignore no-explicit-any
  vnode: VNode<any>
): RenderResult {
  const mutableResponseValue: ResponseValue = {}

  const wrapped = h(ResponseContext.Provider, {
    value: mutableResponseValue,
    children: vnode
  })

  // deno-lint-ignore no-explicit-any
  const html = renderToString(wrapped as VNode<any>)
  const status = mutableResponseValue.status || 200
  const headers = mutableResponseValue.headers || {}

  return { html, status, headers }
}
