// Metro resolver bu modülü 'react-native' yerine sunar (kendi içinden gelen
// import'lar için bypass uygulanır, bkz. metro.config.js).
const RN = require('react-native');
const { ScaledText } = require('./TextShim');

module.exports = new Proxy(RN, {
  get(hedef, prop) {
    if (prop === 'Text') return ScaledText;
    return hedef[prop];
  },
});
