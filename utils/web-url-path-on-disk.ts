import { exists } from '../utils/exists.ts'

export async function webUrlPathOnDisk(url: URL, root: URL): Promise<URL | undefined> {
  const pathname = url.pathname.replace(/^\//, '')

  // NOTE: don't even try directories
  if (pathname.endsWith('/')) {
    return undefined
  }

  const fullpath = new URL(pathname, root)

  if (await exists(fullpath)) {
    return fullpath
  }
}
