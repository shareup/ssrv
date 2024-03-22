type CachedFile = {
  lastModified: string
  etag?: string
  contents?: Uint8Array
  mime?: string
}

export const responseCache: Map<string, CachedFile> = new Map()
