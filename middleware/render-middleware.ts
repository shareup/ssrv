import { type Config } from '../config/mod.ts'
import { type Middleware } from '../deps/oak.ts'
import { webUrlPathOnDisk } from '../utils/web-url-path-on-disk.ts'

export function renderMiddleware(config: Config): Middleware {
  return async (ctx, next) => {
    const url = ctx.request.url
    const urlsToTry: URL[] = []

    if (url.pathname.endsWith('/')) {
      urlsToTry.push(new URL('./index.html.tsx', url))
      urlsToTry.push(new URL('./index.html.jsx', url))
    }

    if (url.pathname.endsWith('.html.tsx') || url.pathname.endsWith('.html.jsx')) {
      urlsToTry.push(url)
    }

    let localUrl: URL | undefined

    for (const toTry of urlsToTry) {
      localUrl = await webUrlPathOnDisk(toTry, config.root)
      if (localUrl) { break }
    }

    if (!localUrl) { return next() }

    await config.ssrRenderFile(localUrl, ctx)
  }
}
