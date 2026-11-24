import type { Environment } from 'vitest/environments';
import { builtinEnvironments } from 'vitest/environments';

/**
 * jsdom, but with Node's FormData and File. The tests call the real API with Node's fetch,
 * which cannot read jsdom's FormData (an image upload would arrive empty). In a browser the page's
 * fetch and FormData come from the same place; this keeps them together in the tests too.
 */
const { FormData, File } = globalThis;

export default {
  name: 'jsdom-real-api',
  viteEnvironment: 'client',
  async setup(global, options) {
    const env = await builtinEnvironments.jsdom.setup(global, options);
    Object.assign(global, { FormData, File });
    return env;
  },
} satisfies Environment;
