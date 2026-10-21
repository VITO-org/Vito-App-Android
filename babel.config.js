/**
 * Babel config.
 *
 * IMPORTANTE: usar `babel-preset-expo` y NO `module:@react-native/babel-preset`.
 *
 * El preset de Expo es el único que trae el plugin `expo-inline-or-reference-env-vars`,
 * que reemplaza `process.env.EXPO_PUBLIC_*` por su valor literal durante el bundling.
 * React Native NO define esas variables en runtime: su polyfill de `process.env`
 * solo expone NODE_ENV (ver react-native/Libraries/Core/setUpGlobals.js), por lo que
 * con el preset de RN cualquier `process.env.EXPO_PUBLIC_X` llegaba a la app como
 * `undefined` y el chat fallaba con "La autenticación del chat no está configurada".
 *
 * Además, `babel-preset-expo` ya estaba en devDependencies sin referenciarse.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
