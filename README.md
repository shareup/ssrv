# ssrv is a javascript build server for local development and (eventually) production

(Pronounced “serve.”)

`ssrv` uses `deno` and `esbuild` to server render and JIT compile `.tsx`, `.ts`, `.jsx`, and `.js` files with sensible conventions to make writing HTML, CSS, and Javascript websites and apps enjoyable again.

**_Under construction 🚧 not ready for production use._ Follow to be notified when the first release is published.**

## Features

* URL imports work both on the server and in the browser (esbuild plugin)
* Start rendering html by creating an `index.html.tsx` file in the root or any sub-directory
* `.ts` and `.tsx` files are compiled JIT when requested using `esbuild`
* Cache headers are set to sensible defaults. Files are compiled only once, then returned from an in-memory cache from there.
* _More explaination to come..._

## Usage

To get up and running as quickly as possible, you can execute the server in your project directory:

```sh
$ deno compile --output ssrv https://raw.githubusercontent.com/shareup/ssrv/main/server.ts
$ ssrv --watch
Watcher Process started.
Root file:///Users/username/path/to/project/
Listening http://0.0.0.0:8080
```

_Anytime any file changes the entire server will restart._

_Use `^C` to exit._

### Custom configuration

Or if you want to customize the configuration you can write your own server.ts:

```ts server.ts
import { configure } from 'https://raw.githubusercontent.com/shareup/ssrv/main/mod.ts'

export default {
  configure() {
    return configure({
      port: 5678,
      // ... see config/types.ts
    })
  }
}
```

Then you can execute your server file like:

```sh
$ ssrv --watch server.ts
```

_This will automatically use your local `deno.json` file if you have one._

_Use `^C` to exit._

_More explaination to come..._
