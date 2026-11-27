// Jest compiles with the React Compiler too, as the app does (experiments.reactCompiler in
// app.config.ts). Metro turns it on through babel-preset-expo; Jest never asks for it, so before this
// the tests ran code the phones never run, and a crash only the compiler makes (AddressesSheet reading
// `deleting.id` while rendering, build 75, 2026-11-27) passed every test.
//
// babel-preset-expo is not a direct dependency (pnpm keeps it inside expo), so it is resolved through
// expo, the way Expo finds it when there is no config file; the compiler plugin comes from the preset,
// the same version Metro uses. Like Metro, the compiler runs only on the app's own code.
const path = require('node:path');

const preset = require.resolve('babel-preset-expo', { paths: [require.resolve('expo/package.json')] });

module.exports = function config(api) {
  const test = api.env('test');
  api.cache.using(() => test);
  if (!test) return { presets: [preset] };
  const compiler = require.resolve('babel-plugin-react-compiler', { paths: [preset] });
  const src = path.join(__dirname, 'src') + path.sep;
  return {
    presets: [preset],
    plugins: [[compiler, { target: '19', sources: (file) => file.startsWith(src) }]],
  };
};
