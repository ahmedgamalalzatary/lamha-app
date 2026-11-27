// Keep rules for the release build's R8 (android/app/proguard-rules.pro, made by prebuild).
//
// WorkManager (pulled in by the push libraries) starts at launch and creates its Room database by
// reflection: the generated androidx.work.impl.WorkDatabase_Impl through its no-argument
// constructor. The stricter R8 of AGP 9 drops that constructor, and the release app crashed on
// launch with "Failed to create an instance of ... WorkDatabase" (build 74, 2026-11-27). Keeping every
// Room database's constructor fixes it for WorkManager and any other Room user.
const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const MARKER = '# tawsela: keep rules';

const RULES = `
${MARKER}
# Room creates generated databases (e.g. WorkManager's WorkDatabase_Impl) by reflection.
-keep class * extends androidx.room.RoomDatabase { <init>(); }
`;

module.exports = function withProguardKeeps(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (!current.includes(MARKER)) fs.writeFileSync(file, current + RULES);
      return cfg;
    },
  ]);
};
