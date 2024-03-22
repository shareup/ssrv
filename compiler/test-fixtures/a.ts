export class A {
  name = 'A #1'
  message: string

  constructor(message: string) {
    this.message = message
  }
}

export function isA(what: unknown): boolean {
  return what instanceof A
}
