# ssrv is a javascript build server for local development and (eventually) production

(Pronounced “serve.”)

`ssrv` uses `deno` and `esbuild` to server render and JIT compile `.tsx`, `.ts`, `.jsx`, and `.js` files with sensible conventions to make writing HTML, CSS, and Javascript websites and apps enjoyable again.

**_Under construction 🚧 not ready for production use._ Follow to be notified when the first release is published.**

## Features

* URL imports work both on the server and in the browser (esbuild plugin)
* Start rendering html by creating an `index.html.tsx` file in the root or any sub-directory
* `.ts` and `.tsx` files are compiled JIT when requested using `esbuild`
* Cache headers are set to sensible defaults. Files are compiled only once, then returned from an in-memory cache from there.
* The entire server restarts when a file changes.
* _More explaination to come..._

## Usage

To get up and running as quickly as possible, create a `ssrv.ts` in your project directory:

```ts
import { serve } from 'https://raw.githubusercontent.com/shareup/ssrv/main/mod.ts'
serve()
```

And run that with deno:

```sh
deno run -A ssrv.ts
```

_Anytime any file changes the entire server will restart._

_Use `^C` to exit._

### Custom configuration

Or if you want to customize the configuration you can write your own server.ts:

```ts server.ts
import { configure, serve } from 'https://raw.githubusercontent.com/shareup/ssrv/main/mod.ts'

const config = configure({
  port: 5678,
  // ... see config/types.ts
})

await serve(config)
```

_More explaination to come..._
