// Faz 'expo-sqlite' apontar para a imitação baseada em node:sqlite (só nos testes).
import Module, { register } from 'node:module';
import { fileURLToPath } from 'node:url';

register('./hooks.mjs', import.meta.url);                     // import (ESM)
const falso = fileURLToPath(new URL('./expo-sqlite.mjs', import.meta.url));
const original = Module._resolveFilename;
Module._resolveFilename = function (pedido, ...resto) {       // require (CJS)
  return pedido === 'expo-sqlite' ? falso : original.call(this, pedido, ...resto);
};
