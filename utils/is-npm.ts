export function isNpm(path: string | URL): boolean {
  return !!path.toString().match(/^npm:/)
}
