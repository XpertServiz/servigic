// Resource shrinking removes any resource it cannot see referenced from code. Servigic's notification and voice-alert
// sounds (res/raw/*.wav, *.ogg) are looked up by NAME at runtime (a notification channel says "new_job_alert"), so the
// shrinker would delete them and push alerts would go silent. This keeps everything in res/raw.
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withKeepRawResources(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, "app", "src", "main", "res", "raw");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "keep.xml"),
        `<?xml version="1.0" encoding="utf-8"?>\n<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="@raw/*" tools:shrinkMode="lenient" />\n`,
      );
      return cfg;
    },
  ]);
};
