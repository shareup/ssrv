import { type Middleware } from '../deps/oak.ts'
import { responseCache } from '../response-cache.ts'
import { isImmutable } from '../utils/is-immutable.ts'

const cacheControlMustRevalidate = 'public, max-age=0, must-revalidate'
const cacheControlImmutable = 'public, max-age=604800, stale-while-revalidate=604800, immutable'

export function cacheMiddleware(): Middleware {
  return (ctx, next) => {
    const fileIsImmutable = isImmutable(ctx.request.url.pathname)

    const cacheControl = fileIsImmutable
      ? cacheControlImmutable
      : cacheControlMustRevalidate

    const cachedFile = responseCache.get(ctx.request.url.pathname)
    const ifNoneMatch = ctx.request.headers.get('if-none-match')
    const ifModifiedSince = ctx.request.headers.get('if-modified-since')

    if (cachedFile) {
      if (
        (ifNoneMatch && cachedFile.etag === ifNoneMatch)
        || (ifModifiedSince && cachedFile.lastModified === ifModifiedSince)
      ) {
        ctx.response.headers.set('cache-control', cacheControl)
        ctx.response.headers.set('last-modified', cachedFile.lastModified)

        if (!fileIsImmutable) {
          ctx.response.headers.set('expires', '-1')
        }

        if (cachedFile.etag) {
          ctx.response.headers.set('etag', cachedFile.etag)
        }

        ctx.response.status = 304
        ctx.response.body = null

        return
      }

      if (cachedFile.contents) {
        ctx.response.headers.set('cache-control', cacheControl)
        ctx.response.headers.set('last-modified', cachedFile.lastModified)

        if (!fileIsImmutable) {
          ctx.response.headers.set('expires', '-1')
        }

        if (cachedFile.etag) {
          ctx.response.headers.set('etag', cachedFile.etag)
        }

        ctx.response.status = 200
        ctx.response.body = Uint8Array.from(cachedFile.contents)
        ctx.response.type = cachedFile.mime

        return
      }
    }

    return next()
  }
}
