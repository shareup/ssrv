import { type Middleware } from '../deps/oak.ts'
import { cyan, green, red, yellow } from '../deps/std/fmt-colors.ts'

export const requestLogMiddleware = (): Middleware => {
  return async (ctx, next) => {
    await next()
    const method = ctx.request.method
    const path = ctx.request.url.pathname
    const date = (new Date()).toISOString()
    const ua = ctx.request.headers.get('User-Agent') || 'unknown UA'
    const responseTime = ctx.response.headers.get('X-Response-Time') || -1
    const status = ctx.response.status

    const msg = JSON.stringify({
      status,
      responseTime,
      method,
      path,
      date,
      ua
    })

    if (status >= 500) {
      console.error(red(msg))
    } else if (status >= 400) {
      console.error(yellow(msg))
    } else if (status >= 300) {
      console.info(cyan(msg))
    } else if (status >= 200) {
      console.info(green(msg))
    } else {
      console.warn(red(msg))
    }
  }
}
