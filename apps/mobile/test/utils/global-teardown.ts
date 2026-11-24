import type { ChildProcess } from 'node:child_process';

/** Stops the API global-setup.ts started. */
export default async function teardown() {
  (globalThis as { __tawselaApi?: ChildProcess }).__tawselaApi?.kill();
}
