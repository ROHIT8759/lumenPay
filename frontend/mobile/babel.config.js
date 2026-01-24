module.exports = function (api) {
    api.cache(true);
    const plugins = ['react-native-reanimated/plugin'];
    
    // Only use NativeWind for native platforms
    if (process.env.EXPO_PLATFORM !== 'web') {
        plugins.unshift('nativewind/babel');
    }
    
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            'nativewind/babel',
            'react-native-reanimated/plugin',
        ],
    };
};
