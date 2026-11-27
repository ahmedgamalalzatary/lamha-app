// Jest compiles with the React Compiler too, as the app does (experiments.reactCompiler in
// app.config.ts). Metro turns it on through babel-preset-expo; Jest never asks for it, so before this
// the tests ran code the phones never run, and a crash only the compiler makes (AddressesSheet reading
// `deleting.id` while rendering, build 75, 2026-11-27) passed every test.
//
// The plugin comes with babel-preset-expo (same version Metro uses), so it is resolved from there.
// Like Metro, it compiles only the app's own code, never node_modules.
const path = require('node:path');

module.exports = function config(api) {
  const test = api.env('test');
  api.cache.using(() => test);
  if (!test) return { presets: ['babel-preset-expo'] };
  const compiler = require.resolve('babel-plugin-react-compiler', { paths: [require.resolve('babel-preset-expo')] });
  const src = path.join(__dirname, 'src') + path.sep;
  return {
    presets: ['babel-preset-expo'],
    plugins: [[compiler, { target: '19', sources: (file) => file.startsWith(src) }]],
  };
};
