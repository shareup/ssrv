export function isJsr(path: string | URL): boolean {
  return !!path.toString().match(/^jsr:/)
}
