const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Google Play "Android Developer Verification" akışı için
// adi-registration.properties dosyasını APK'nın assets klasörüne kopyalar.
module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, 'adi-registration.properties');
      const destDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets');
      const dest = path.join(destDir, 'adi-registration.properties');

      if (!fs.existsSync(src)) {
        throw new Error(
          'adi-registration.properties projenin kök dizininde bulunamadı. Google Play snippet ile bir dosya oluşturun.'
        );
      }

      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
      return cfg;
    },
  ]);
};
