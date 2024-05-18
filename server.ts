import { type Config, configure } from './config/mod.ts'
import { Application, type ListenOptions } from './deps/oak.ts'
import { debounce } from './deps/std/debounce.ts'
import { cacheMiddleware } from './middleware/cache-middleware.ts'
import { compilerMiddleware } from './middleware/compiler-middleware.ts'
import { crossOriginMiddleware } from './middleware/cross-origin-middleware.ts'
import { renderMiddleware } from './middleware/render-middleware.ts'
import { requestLogMiddleware } from './middleware/request-log-middleware.ts'
import { responseTimeMiddleware } from './middleware/response-time-middleware.ts'

export type Opts = ListenOptions

export type ServeSetup = (a: Application) => void | Promise<void>

export async function serve(
  config?: Config,
  { immediatelyReturn }: { immediatelyReturn: boolean } = { immediatelyReturn: false }
) {
  config || (config = await configure())

  if (immediatelyReturn) {
    return createApp(config)
  }

  const watcher = Deno.watchFs('./')

  Deno.addSignalListener('SIGTERM', () => {
    console.info('SIGTERM!')
    watcher.close()
  })

  let isBooting = false
  let hasBootedOnce = false
  let listener: Promise<void> | undefined = undefined
  let controller: AbortController | undefined = undefined

  const reboot = debounce(async () => {
    if (isBooting) {
      return
    }

    if (hasBootedOnce) {
      console.warn('Rebooting...')
    }

    hasBootedOnce = true
    isBooting = true

    if (controller) {
      controller.abort('reboot')
      controller = undefined
    }

    if (listener) {
      await listener
      listener = undefined
    }

    const newApp = createApp(config)
    listener = newApp.listener
    controller = newApp.controller

    isBooting = false
  }, 100)

  reboot()

  for await (const _event of watcher) {
    reboot()
  }
}

function createApp(config: Config) {
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

  const signalHandler = () => {
    controller.abort('sigterm')
  }

  Deno.addSignalListener('SIGTERM', signalHandler)

  app.use(requestLogMiddleware())
  app.use(responseTimeMiddleware())

  if (config.prepend) {
    for (const m of config.prepend) {
      app.use(m)
    }
  }

  app.use(crossOriginMiddleware())
  app.use(cacheMiddleware())
  app.use(renderMiddleware(config))
  app.use(compilerMiddleware(config))

  if (config.append) {
    for (const m of config.append) {
      app.use(m)
    }
  }

  const listener = app.listen(opts).finally(() => {
    Deno.removeSignalListener('SIGTERM', signalHandler)
  })

  return { listener, controller }
}
