declare module 'stream-chain' {
  import type { Readable } from 'node:stream';
  export function chain(streams: unknown[]): Readable;
}

declare module 'stream-json' {
  import type { Transform } from 'node:stream';
  export function parser(): Transform;
}

declare module 'stream-json/streamers/StreamArray' {
  import type { Transform } from 'node:stream';
  export function streamArray(): Transform;
}
