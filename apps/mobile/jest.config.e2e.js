// Screen and API tests: the real API (test/utils/global-setup.ts) on one database,
// tawsela_mobile_test, which every test resets. So the files run one after another.
const unit = require('./jest.config.js');

module.exports = {
  ...unit,
  globalSetup: '<rootDir>/test/utils/global-setup.ts',
  globalTeardown: '<rootDir>/test/utils/global-teardown.ts',
  maxWorkers: 1,
  testMatch: ['<rootDir>/test/e2e/**/*.test.ts?(x)'],
};
