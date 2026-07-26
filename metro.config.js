// metro.config.js
// CRITICAL FIX: disable inlineRequires for Hermes production APK compatibility.
// Without this, babel-preset-expo enables inlineRequires=true which makes named
// imports lazily evaluated. Module-level StyleSheet.create() calls that reference
// imported constants (Radius, Spacing, Typography) execute before those modules
// are ready, giving undefined → Hermes throws "ReferenceError: Property 'X' doesn't exist".

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: false,
  },
});

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && moduleName === 'sql.js') {
    return {
      type: 'empty',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
