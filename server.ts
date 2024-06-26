#! /usr/bin/env -S deno run -A

import { type Config, configure } from './config/mod.ts'
import { Application, type ListenOptions, type Middleware } from './deps/oak.ts'
import { debounce } from './deps/std/debounce.ts'
import { join } from './deps/std/path.ts'
import { cacheMiddleware } from './middleware/cache-middleware.ts'
import { compilerMiddleware } from './middleware/compiler-middleware.ts'
import { crossOriginMiddleware } from './middleware/cross-origin-middleware.ts'
import { renderMiddleware } from './middleware/render-middleware.ts'
import { requestLogMiddleware } from './middleware/request-log-middleware.ts'
import { responseTimeMiddleware } from './middleware/response-time-middleware.ts'

export type Opts = ListenOptions

export type MiddlewareOpts = {
  prepend?: Middleware[]
  append?: Middleware[]
}

export type ServeSetup = (a: Application) => void | Promise<void>

export async function serve(config?: Config, middlewareOpts?: MiddlewareOpts) {
  config || (config = await configure())

  const opts: Opts = { port: config.port }
  const app = new Application({ logErrors: false })
  const controller = new AbortController()
  opts.signal = controller.signal

  app.addEventListener('listen', () => {
    const scheme = opts.secure ? 'https:' : 'http:'
    console.info(`Listening ${scheme}//0.0.0.0:${opts.port}`)
  })

  app.addEventListener('error', e => {
    let out

    if (e.error.stack) {
      out = e.error.stack
    } else {
      out = e.error
    }

    console.error(`Internal application error: ${out}`)
  })

  app.use(requestLogMiddleware())
  app.use(responseTimeMiddleware())

  if (middlewareOpts?.prepend) {
    for (const m of middlewareOpts.prepend) {
      app.use(m)
    }
  }

  app.use(crossOriginMiddleware())
  app.use(cacheMiddleware())
  app.use(renderMiddleware(config))
  app.use(compilerMiddleware(config))

  if (middlewareOpts?.append) {
    for (const m of middlewareOpts.append) {
      app.use(m)
    }
  }

  const listener = app.listen(opts)

  Deno.addSignalListener('SIGTERM', () => {
    console.info('SIGTERM!')
    controller.abort()
  })

  return { listener, controller }
}

if (import.meta.main) {
  const args = Deno.args

  console.debug(Deno.inspect(args))

  let configureFn = configure
  let importFileName = args.find(arg => !arg.startsWith('-'))

  if (args.includes('--watch') || args.includes('-w')) {
    console.warn('Watching. Will restart when any file changes...')

    const watcher = Deno.watchFs('./')
    let child: Deno.ChildProcess | undefined = undefined
    let isBooting = false
    let hasBootedOnce = false

    Deno.addSignalListener('SIGTERM', () => {
      if (child) {
        child.kill('SIGTERM')
      }
    })

    const boot = debounce(async () => {
      if (isBooting) {
        return
      }

      hasBootedOnce = true
      isBooting = true

      if (hasBootedOnce) {
        console.warn('Rebooting...')
      }

      if (child) {
        child.kill('SIGTERM')
        await child.status
      }

      const command = new Deno.Command(Deno.execPath(), {
        args: importFileName ? [importFileName] : []
      })

      console.debug({ command: [Deno.execPath(), importFileName] })

      child = command.spawn()
      isBooting = false
    }, 100)

    boot()

    for await (const _event of watcher) {
      boot()
    }
  } else {
    if (importFileName) {
      console.warn(`Loading ${importFileName}...`)

      console.debug(join(Deno.cwd(), importFileName))

      const mod = await import(join(Deno.cwd(), importFileName))

      if (mod.configure) {
        configureFn = mod.configure
      }
    }

    const config = await configureFn()
    const server = await serve(config)

    await server.listener

    Deno.exit(0)
  }
}
