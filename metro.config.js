const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const config = {
  // Excluir carpetas que no contienen código fuente de la app.
  // Soluciona el crash de file watcher en Windows por rutas demasiado largas.
  watchFolders: [],
  resolver: {
    blockList: [
      // Ignorar carpetas de build de Android
      new RegExp(`${path.resolve(__dirname, 'android/app/build').replace(/\\/g, '\\\\')}.*`),
      new RegExp(`${path.resolve(__dirname, 'android/.gradle').replace(/\\/g, '\\\\')}.*`),
      new RegExp(`${path.resolve(__dirname, 'android/build').replace(/\\/g, '\\\\')}.*`),
      // Ignorar carpeta de modelos ML si existe
      new RegExp(`${path.resolve(__dirname, 'ml-trainer').replace(/\\/g, '\\\\')}.*`),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

