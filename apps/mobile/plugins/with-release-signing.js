// Signs Android release builds (APK and AAB) with the upload key, read from environment variables
// at build time. The key itself never enters the repo: CI decodes it from a GitHub secret.
//
//   ANDROID_UPLOAD_STORE_FILE      path to the .jks file
//   ANDROID_UPLOAD_STORE_PASSWORD  its password
//   ANDROID_UPLOAD_KEY_ALIAS       the key's alias
//   ANDROID_UPLOAD_KEY_PASSWORD    the key's password
//
// Without ANDROID_UPLOAD_STORE_FILE a release build keeps React Native's default (the debug key),
// which is fine for a quick local test but never for a store upload.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// tawsela: release signing';

const BLOCK = `
${MARKER}
android {
    signingConfigs {
        release {
            def uploadStore = System.getenv('ANDROID_UPLOAD_STORE_FILE')
            if (uploadStore) {
                storeFile file(uploadStore)
                storePassword System.getenv('ANDROID_UPLOAD_STORE_PASSWORD')
                keyAlias System.getenv('ANDROID_UPLOAD_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_UPLOAD_KEY_PASSWORD')
            }
        }
    }
    buildTypes {
        release {
            if (System.getenv('ANDROID_UPLOAD_STORE_FILE')) {
                signingConfig signingConfigs.release
            }
        }
    }
}
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('with-release-signing: expected a Groovy android/app/build.gradle');
    }
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += BLOCK;
    }
    return cfg;
  });
};
