const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite en web usa wa-sqlite (WASM) — sin esto Metro intenta parsear el .wasm
// como JS y el bundle de web falla por completo.
config.resolver.assetExts.push('wasm');

// wa-sqlite necesita SharedArrayBuffer, que el navegador solo habilita con estos headers
// (cross-origin isolation). Sin esto expo-sqlite funciona en preview/build pero no en
// `expo start --web` (dev server no manda estos headers por defecto).
config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => {
        return (req, res, next) => {
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            // 'credentialless' en vez de 'require-corp': habilita el mismo aislamiento
            // (SharedArrayBuffer para wa-sqlite) sin exigir que CADA sub-recurso mande
            // Cross-Origin-Resource-Policy — con 'require-corp' el navegador bloqueaba
            // recursos del propio bundle de Metro y la página nunca terminaba de cargar.
            res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
            return middleware(req, res, next);
        };
    },
};

module.exports = config;
