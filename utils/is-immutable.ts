import { canCompile } from '../utils/can-compile.ts'

export function isImmutable(pathname: string): boolean {
  return !!pathname.match(/chunk-\w+\.\w+$/) || !canCompile(pathname)
}
