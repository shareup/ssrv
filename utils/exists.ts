export async function exists(path: string | URL): Promise<boolean> {
  try {
    return (await Deno.stat(path)).isFile
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return false
    } else {
      throw e
    }
  }
}
