const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const SHIM_PATH = path.resolve(__dirname, 'src/lib/rnShim.js');
const TEXT_SHIM_PATH = path.resolve(__dirname, 'src/lib/TextShim.tsx');

const orijinalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Sadece çıplak 'react-native' import'larını shim'e yönlendir.
  // Shim ve TextShim kendileri 'react-native'i orijinal olarak alabilsin
  // (sonsuz döngüyü önlemek için).
  if (moduleName === 'react-native') {
    const origin = context.originModulePath || '';
    const isShim = origin === SHIM_PATH || origin === TEXT_SHIM_PATH;
    if (!isShim) {
      return {
        type: 'sourceFile',
        filePath: SHIM_PATH,
      };
    }
  }
  if (typeof orijinalResolveRequest === 'function') {
    return orijinalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
