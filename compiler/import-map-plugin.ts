import { type Config } from '../config/types.ts'
import { fromFileUrl } from '../deps/std/path.ts'
import { type Plugin } from './esbuild.ts'

export function importMapPlugin(config: Config): Plugin {
  return {
    name: 'importMap',
    setup(build) {
      if (!config.importMap || !config.importMapPath) {
        return
      }

      build.onResolve({ filter: /.+/ }, async args => {
        if (!config.importMap || !config.importMapPath) {
          return
        }

        const newPath = config.importMap.resolve(args.path)

        if (newPath) {
          return await build.resolve(newPath, {
            kind: args.kind,
            resolveDir: fromFileUrl(config.importMapPath),
            importer: args.importer,
            namespace: args.namespace,
            pluginData: args.pluginData,
            pluginName: 'importMap'
          })
        }
      })
    }
  }
}
