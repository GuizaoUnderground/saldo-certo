// Redireciona 'expo-sqlite' para a imitação baseada em node:sqlite durante os testes.
const falso = new URL('./expo-sqlite.mjs', import.meta.url).href;
export async function resolve(especificador, contexto, proximo) {
  if (especificador === 'expo-sqlite') return { url: falso, shortCircuit: true };
  return proximo(especificador, contexto);
}
