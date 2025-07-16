// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path'); // Certifique-se de que esta linha está presente

const config = getDefaultConfig(__dirname);

// Mantenha as suas configurações existentes
config.resolver.unstable_enablePackageExports = false;
config.resolver.sourceExts.push('cjs');

// =====================================================================
// INÍCIO DA CORREÇÃO PARA blockList
// =====================================================================
// Garante que config.resolver.blockList é um array antes de qualquer operação.
// Isto é uma verificação mais robusta para evitar o TypeError.
if (!Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList = [];
}

// Adicionar a pasta 'functions' à lista de exclusão
// Usando uma regex mais robusta para garantir que ignora o caminho completo
config.resolver.blockList = config.resolver.blockList.concat([
  new RegExp(path.resolve(__dirname, 'functions', '.*')), // Ignora qualquer coisa dentro da pasta 'functions'
]);
// =====================================================================
// FIM DA CORREÇÃO
// =====================================================================

module.exports = config;
