// jest-expo's native test environment, plus Node's real fetch for the tests that talk to the real
// API. Inside a test, React Native swaps fetch for its polyfill over a mocked XMLHttpRequest, so the
// real one is handed in from outside the test's realm; jest.setup.ts installs it as the global.
const NativeEnvironment = require(require('jest-expo/jest-preset').testEnvironment);

class RealApiEnvironment extends NativeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.global.__nodeFetch = fetch;
  }
}

module.exports = RealApiEnvironment;
