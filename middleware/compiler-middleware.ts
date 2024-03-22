import { type Bundle, compile } from '../compiler/mod.ts'
import { type Config } from '../config/mod.ts'
import { type Middleware } from '../deps/oak.ts'
import { responseCache } from '../response-cache.ts'
import { webUrlPathOnDisk } from '../utils/web-url-path-on-disk.ts'

export async function compileAndCache(
  urls: (URL | string)[],
  config: Config
): Promise<Bundle> {
  const bundle = await compile(urls, { config })

  // @ts-ignore toGMTString() is a real method ts! Get with it.
  const lastModified = (new Date()).toGMTString()

  for (const entryPoint of bundle.entryPoints) {
    // NOTE: we cache both the .ts and .js versions of the files just in case

    responseCache.set(entryPoint.specifier, {
      etag: entryPoint.etag,
      contents: entryPoint.contents,
      mime: entryPoint.mime,
      lastModified
    })

    responseCache.set(entryPoint.urlPath, {
      etag: entryPoint.etag,
      contents: entryPoint.contents,
      mime: entryPoint.mime,
      lastModified
    })
  }

  for (const file of bundle.files) {
    responseCache.set(file.urlPath, {
      etag: file.etag,
      contents: file.contents,
      mime: file.mime,
      lastModified
    })
  }

  return bundle
}

export function compilerMiddleware(config: Config): Middleware {
  return async (ctx, next) => {
    try {
      const url = ctx.request.url

      // NOTE: we can't use a directory as an entrypoint so we rewrite to
      // index.html and hope for the best
      if (url.pathname.endsWith('/')) {
        url.pathname += 'index.html'
      }

      const entryPointUrl = await webUrlPathOnDisk(url, config.root)

      if (!entryPointUrl) {
        return next()
      }

      const bundle = await compileAndCache([entryPointUrl], config)

      let entryPoint = bundle.entryPoints.find(e => e.urlPath === ctx.request.url.pathname)
      entryPoint ||= bundle.entryPoints[0]
      // TODO: have yet another || for a not found style response

      ctx.response.body = entryPoint.contents
      ctx.response.type = entryPoint.mime

      if (entryPoint.etag) {
        ctx.response.headers.set('etag', entryPoint.etag)
      }
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        // NOTE: it's very important to return next()
        return next()
      } else {
        throw e
      }
    }
  }
}
