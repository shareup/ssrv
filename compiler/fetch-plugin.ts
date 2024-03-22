import { isJsr } from '../utils/is-jsr.ts'
import { isNpm } from '../utils/is-npm.ts'
import { isRemote } from '../utils/is-remote.ts'
import { cache } from './cache.ts'
import type { Plugin } from './esbuild.ts'

export function fetchPlugin(): Plugin {
  return {
    name: 'fetch',
    setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        const isEntryPoint = args.kind === 'entry-point'

        if (isNpm(args.path)) {
          const name = args.path.toString().slice(4)
          args.path = new URL(`/${name}`, 'https://esm.sh/').href
        } else if (isJsr(args.path)) {
          const name = args.path.toString().slice(4)
          args.path = new URL(`/jsr/${name}`, 'https://esm.sh/').href
        }

        if (isRemote(args.path) || args.namespace === 'fetch') {
          let path

          if (isEntryPoint || args.namespace === 'file') {
            // NOTE: if we are the entrypoint, then we must be a full URL
            // NOTE: if the namespace is file, then this is a URL being loaded
            // by a local file, so we just load the URL as-is
            path = args.path
          } else {
            // NOTE: we are now in the fetch namespace, so each import should be
            // resolved relative to it's importer's URL
            path = new URL(args.path, args.importer).toString()
          }

          return { external: false, path, namespace: 'fetch' }
        }
      })

      build.onLoad({ filter: /.*/, namespace: 'fetch' }, async args => {
        let url: URL

        try {
          url = new URL(args.path)
        } catch {
          console.error(`Cannot make '${args.path}' into a url`)
          return
        }

        const file = await cache(url)
        const contents = file.contents
        const contentType = file.contentType

        if (url.pathname.endsWith('.tsx')) {
          return { contents, loader: 'tsx' }
        } else if (url.pathname.endsWith('.jsx')) {
          return { contents, loader: 'jsx' }
        } else if (contentType?.includes('typescript') || url.pathname.endsWith('.ts')) {
          return { contents, loader: 'ts' }
        } else if (contentType?.includes('javascript') || url.pathname.endsWith('.js')) {
          return { contents, loader: 'js' }
        } else if (contentType?.includes('css') || url.pathname.endsWith('.css')) {
          return { contents, loader: 'css' }
        } else {
          return { contents }
        }
      })
    }
  }
}
