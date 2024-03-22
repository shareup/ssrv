import { parseArgs } from 'https://deno.land/std@0.220.1/cli/parse_args.ts'
import { dirname, join } from 'https://deno.land/std@0.220.1/path/mod.ts'
import { gzipSync } from 'https://esm.sh/fflate@0.8.2'
import { compile, type CompiledFile } from './compiler/mod.ts'
import { configure } from './config/mod.ts'

if (import.meta.main) {
  const flags = parseArgs(Deno.args, { string: ['o'], boolean: ['h', 'q'], alias: { h: 'help' } })

  if (flags.h) {
    console.error`usage: ./input.ts ./input2.ts # will output the build result to stdout`
    console.error`usage: -o dist ./input.ts ./input2.ts # will write the build result to dist`
    Deno.exit(1)
  }

  const urls = flags._.filter(isString)
  const config = await configure({ mode: 'prod' })
  const bundle = await compile(urls, { config })

  for (const entryPoint of bundle.entryPoints) {
    await outputFile(entryPoint, flags.q, flags.o)
  }

  for (const file of bundle.files) {
    await outputFile(file, flags.q, flags.o)
  }

  Deno.exit(0)
}

function isString(u: unknown): u is string {
  return typeof u === 'string'
}

async function outputFile(file: CompiledFile, beQuiet: boolean, outputDir?: string): Promise<void> {
  if (file.urlPath.endsWith('.map') && !outputDir) {
    return
  }

  const gzip = gzipSync(file.contents)
  const relPath = file.urlPath.replace(/^\//, '')
  const decoder = new TextDecoder()

  if (!beQuiet) {
    console.info(relPath)
    console.info(`file size: ${formatSize(file.contents.byteLength)}`)
    console.info(`gzip size: ${formatSize(gzip.byteLength)}`)
  }

  if (outputDir) {
    const path = join(outputDir, relPath)
    await Deno.mkdir(dirname(path), { recursive: true })
    await Deno.writeFile(path, file.contents)

    if (!beQuiet) {
      console.info(`wrote file to: ${path}`)
    }
  } else {
    console.log(decoder.decode(file.contents))
  }

  console.log('\n')
}

function formatSize(size: number): string {
  let finalSize = 0
  let postfix = ''

  if (size < 1024) {
    finalSize = size
    postfix = ' bytes'
  } else if (size < 1024 * 1024) {
    finalSize = size / 1024
    postfix = 'kb'
  } else if (size < 1024 * 1024 * 1024) {
    finalSize = size / 1024 / 1024
    postfix = 'mb'
  } else if (size < 1024 * 1024 * 1024 * 1024) {
    finalSize = size / 1024 / 1024 / 1024
    postfix = 'gb'
  }

  let sizeString = finalSize.toFixed(2)
  sizeString = sizeString.replace(/0+$/, '')
  sizeString = sizeString.replace(/\.$/, '')

  return `${sizeString}${postfix}`
}
