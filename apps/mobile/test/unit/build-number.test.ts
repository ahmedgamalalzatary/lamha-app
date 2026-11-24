import type { ConfigContext } from 'expo/config';
import appConfig from '../../app.config';

// Review F56 (realestate's OPS-03 rule): each store build carries a number that goes up, set by CI
// from main's commit count, so Google Play and the App Store accept the next upload.
const build = () => appConfig({ config: {} } as ConfigContext);

afterEach(() => {
  delete process.env.APP_BUILD_NUMBER;
});

describe('the store build number', () => {
  it('goes to Android as versionCode and to iOS as buildNumber', () => {
    process.env.APP_BUILD_NUMBER = '412';
    const c = build();
    expect(c.android?.versionCode).toBe(412);
    expect(c.ios?.buildNumber).toBe('412');
  });

  it('is 1 for a build on this PC', () => {
    expect(build().android?.versionCode).toBe(1);
  });

  it.each(['0', '-3', '1.5', 'abc', '2200000000'])('stops the build when it is %s, which no store accepts', (n) => {
    process.env.APP_BUILD_NUMBER = n;
    expect(build).toThrow(/APP_BUILD_NUMBER/);
  });
});
