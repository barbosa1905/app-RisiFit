    const { getDefaultConfig } = require('expo/metro-config');
    const path = require('path'); // Certifique-se de que esta linha está presente

    const config = getDefaultConfig(__dirname);

    // Mantenha as suas configurações existentes
    config.resolver.unstable_enablePackageExports = false;
    config.resolver.sourceExts.push('cjs');

    // Adicionar a pasta 'functions' à lista de exclusão
    // Usando uma regex mais robusta para garantir que ignora o caminho completo
    config.resolver.blockList = [
      ...(config.resolver.blockList || []), // Mantém outras exclusões se existirem
      new RegExp(path.resolve(__dirname, 'functions', '.*')), // Ignora qualquer coisa dentro da pasta 'functions'
      // Uma alternativa mais simples que geralmente funciona:
      // /.*\/functions\/.*/,
    ];

    // Se por algum motivo 'blockList' não funcionar, tente 'blacklistRE' (para versões mais antigas do Metro)
    // config.resolver.blacklistRE = [
    //   ...(config.resolver.blacklistRE || []),
    //   new RegExp(path.resolve(__dirname, 'functions', '.*')),
    // ];

    module.exports = config;