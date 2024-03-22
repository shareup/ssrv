export function canCompile(url: URL | string): boolean {
  const path = url instanceof URL ? url.pathname : url
  return !!(['.ts', '.tsx', '.js', '.jsx', '.css'].find(ext => path.endsWith(ext)))
}
