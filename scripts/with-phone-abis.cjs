const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withPhoneAbis(config) {
  if (process.env.ROJNISHI_PHONE_APK !== '1') return config;

  return withGradleProperties(config, configWithProperties => {
    const properties = configWithProperties.modResults.filter(entry =>
      entry.type !== 'property' || entry.key !== 'reactNativeArchitectures'
    );
    properties.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: 'armeabi-v7a,arm64-v8a',
    });
    configWithProperties.modResults = properties;
    return configWithProperties;
  });
};
