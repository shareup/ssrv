import type { Middleware } from '../deps/oak.ts'

export function crossOriginMiddleware(): Middleware {
  return (ctx, next) => {
    ctx.response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
    return next()
  }
}
