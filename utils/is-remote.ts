export function isRemote(path: string | URL): boolean {
  return !!path.toString().match(/^https?:\/\//)
}
