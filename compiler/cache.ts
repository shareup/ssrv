import { delay } from '../deps/std/async.ts'
import { encodeHex } from '../deps/std/encoding.ts'
import { dirname, join, resolve } from '../deps/std/path.ts'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

type CachedFile = Meta & {
  contents: Uint8Array
}

type Meta = {
  url: string
  contentType?: string
}

const _cacheDir = cachedir()

export class CacheFetchError extends Error {}

export async function cache(url: string | URL): Promise<CachedFile> {
  if (typeof url === 'string') {
    url = new URL(url)
  }

  const hash = await hashFor(url)
  const filePath = join(_cacheDir, hash)
  const metaPath = join(_cacheDir, hash + '.meta.json')

  try {
    const contents = await Deno.readFile(filePath)
    const meta = JSON.parse(decoder.decode(await Deno.readFile(metaPath))) as Meta

    console.debug(`Loaded from cache on disk: ${url}`)

    return { contents, ...meta }
  } catch {
    // NOOP
  }

  console.debug(`Fetching from remote: ${url}`)

  const response = await fetchWithRetry(url.toString())

  if (response.status !== 200) {
    throw new CacheFetchError(`Request failed: ${url}`)
  }

  const buffer = await response.arrayBuffer()
  const contents = new Uint8Array(buffer)
  const contentType = response.headers.get('Content-type') || undefined

  const meta: Meta = {
    url: url.toString(),
    contentType
  }

  await Deno.mkdir(dirname(filePath), { recursive: true })
  await Deno.writeFile(filePath, contents)
  await Deno.writeFile(metaPath, encoder.encode(JSON.stringify(meta)))

  return { contents, ...meta }
}

async function fetchWithRetry(url: string): Promise<Response> {
  let attempts = 0
  let response: Response | undefined
  let error: unknown

  while (attempts < 5) {
    attempts += 1

    try {
      response = await fetch(url.toString(), {
        redirect: 'follow',
        cache: 'force-cache'
      })

      if ([408, 429, 500, 502, 503, 504].includes(response.status)) {
        await delay(attempts * 100)
      } else {
        // We are successful!
        break
      }
    } catch (e) {
      error = e
    }
  }

  if (error) {
    throw error
  }

  return response || new Response(new Uint8Array(), { status: 499 })
}

// Based on: https://deno.land/x/cache@0.2.13/directories.ts
function cachedir(): string {
  const os = Deno.build.os

  const deno = Deno.env.get('DENO_DIR')

  if (deno) { return resolve(deno) }

  let home: string | undefined
  let path = ''

  switch (os) {
    case 'linux': {
      const xdg = Deno.env.get('XDG_CACHE_HOME')
      home = xdg ?? Deno.env.get('HOME')
      path = xdg ? 'deno' : join('.cache', 'deno', 'esbuild')
      break
    }
    case 'darwin':
      home = Deno.env.get('HOME')
      path = join('Library', 'Caches', 'deno', 'esbuild')
      break

    case 'windows':
      home = Deno.env.get('LOCALAPPDATA')
      home = home ?? Deno.env.get('USERPROFILE')
      path = join('deno', 'esbuild')
      break
  }

  console.assert(!!path, 'failed to find the path to cache esbuild data')

  if (!home) {
    return resolve(path)
  }

  return resolve(join(home, path))
}

async function hashFor(url: URL) {
  const urlBytes = encoder.encode(url.toString())
  const hashBytes = await crypto.subtle.digest('SHA-256', urlBytes)
  return encodeHex(new Uint8Array(hashBytes))
}
