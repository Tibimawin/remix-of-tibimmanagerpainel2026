/**
 * Teste do bloqueio de conteúdo adulto (+18) em api/xtream.js
 * Executar: bun scripts/test-adult-filter.mjs
 *
 * Regras (definidas com o usuário):
 * - Canais +18, Filmes +18 e Séries +18 são ocultados quando o link/painel pede noadulto=1.
 * - A detecção é por CATEGORIA; no título só marcadores inequívocos (+18 / Porn*)
 *   para NÃO bloquear conteúdo legítimo por engano.
 */
import { __adultFilter } from '../api/xtream.js';

const { isAdultText, isAdultContentRow } = __adultFilter;

const casos = [
  // [descrição, resultadoEsperado, chamada]
  ['Categoria "CANAIS | +18" é adulta', true, () => isAdultText('CANAIS | +18')],
  ['Categoria "FILMES | +18" é adulta', true, () => isAdultText('FILMES | +18')],
  ['Categoria "SÉRIES | ADULTO" é adulta', true, () => isAdultText('SÉRIES | ADULTO')],
  ['Categoria "CANAIS | XXX" é adulta', true, () => isAdultText('CANAIS | XXX')],
  ['Categoria "CANAIS | CANAIS FILMES" NÃO é adulta', false, () => isAdultText('CANAIS | CANAIS FILMES')],
  ['Categoria "FILMES | AÇÃO" NÃO é adulta', false, () => isAdultText('FILMES | AÇÃO')],
  ['Categoria "SÉRIES | NOVELAS" NÃO é adulta', false, () => isAdultText('SÉRIES | NOVELAS')],
  ['Categoria "CANAIS | X SPORTS" NÃO é adulta', false, () => isAdultText('CANAIS | X SPORTS')],
  ['Canal ADULT SWIM (título) NÃO é bloqueado', false, () => isAdultContentRow({ nome: 'ADULT SWIM HD', categoria: 'CANAIS | ENTRETENIMENTO' }, ['categoria'], ['nome'])],
  ['Filme "xXx: Reativado" NÃO é bloqueado', false, () => isAdultContentRow({ nome: 'xXx: Reativado', categoria: 'FILMES | AÇÃO' }, ['categoria', 'genero'], ['nome', 'titulo'])],
  ['Filme "The Adults" NÃO é bloqueado', false, () => isAdultContentRow({ nome: 'The Adults', categoria: 'FILMES | DRAMA' }, ['categoria', 'genero'], ['nome', 'titulo'])],
  ['Filme "Pornô: Sedutora e Fatal" é bloqueado pelo título', true, () => isAdultContentRow({ nome: 'Pornô: Sedutora e Fatal', categoria: 'FILMES | VARIADOS' }, ['categoria', 'genero'], ['nome', 'titulo'])],
  ['Filme com título "+18" no nome é bloqueado', true, () => isAdultContentRow({ nome: 'Coleção +18', categoria: 'FILMES | VARIADOS' }, ['categoria', 'genero'], ['nome', 'titulo'])],
  ['Canal com categoria "CANAIS | +18" é bloqueado mesmo com nome comum', true, () => isAdultContentRow({ nome: 'Canal VIP', categoria: '+18' }, ['categoria', 'canalCategoria'], ['nome', 'canalNome'])],
  ['Categoria com acento "SÉRIES | ERÓTICO" é adulta', true, () => isAdultText('SÉRIES | ERÓTICO')],
  ['Categoria "CANAIS | SEXO" é adulta', true, () => isAdultText('CANAIS | SEXO')],
];

let falhas = 0;
for (const [desc, esperado, fn] of casos) {
  let resultado;
  try {
    resultado = fn();
  } catch (e) {
    console.error(`✗ ${desc}: ERRO ${e.message}`);
    falhas++;
    continue;
  }
  if (resultado === esperado) {
    console.log(`✓ ${desc}`);
  } else {
    console.error(`✗ ${desc}: esperado ${esperado}, obtido ${resultado}`);
    falhas++;
  }
}

// Valores concretos do caso real da conta: só "CANAIS | +18" deve ser detectada
const catsReais = ['CANAIS | GLOBO', 'CANAIS | +18', 'CANAIS | ESPORTES', 'CANAIS | CANAIS INFANTIL', 'FILMES | AÇÃO', 'SÉRIES | ANIMES'];
const detectadas = catsReais.filter(c => isAdultText(c));
if (detectadas.length === 1 && detectadas[0] === 'CANAIS | +18') {
  console.log('✓ Nas categorias reais da conta, apenas "CANAIS | +18" é detectada como adulta');
} else {
  console.error(`✗ Detecção nas categorias reais: ${JSON.stringify(detectadas)}`);
  falhas++;
}

if (falhas > 0) {
  console.error(`\nFALHAS: ${falhas}`);
  process.exit(1);
}
console.log('\nTodos os testes do bloqueio +18 passaram.');
