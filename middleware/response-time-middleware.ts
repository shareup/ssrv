import { type Middleware } from '../deps/oak.ts'

export const responseTimeMiddleware: () => Middleware = () => async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  ctx.state.responseTime = ms
  ctx.response.headers.set('X-Response-Time', `${ms}ms`)
}
