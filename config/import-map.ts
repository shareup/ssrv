import { ImportMap } from './types.ts'

export function prepareImportMap(opts: { imports: Record<string, string> }): ImportMap {
  const imports = opts.imports

  // TODO: validate imports
  // TODO: re-enter the loop after finding a value, because an import map value
  // can be further expanded by other entries

  const map = {
    imports,
    resolve(specifier: string): string | undefined {
      for (const [key, value] of Object.entries(imports)) {
        if (key.endsWith('/') && specifier.startsWith(key)) {
          return value + specifier.slice(key.length)
        }

        if (specifier === key) {
          return value
        }
      }
    }
  }

  return map
}
