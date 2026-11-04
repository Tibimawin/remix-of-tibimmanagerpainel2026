/**
 * Teste do limite de telas simultâneas em api/xtream.js
 * Executar: bun scripts/test-connection-limit.mjs
 *
 * Regras (definidas com o usuário):
 * - Um usuário com limite N só reproduz em N telas ao mesmo tempo.
 * - Tela = IP + User-Agent (dois aparelhos no mesmo Wi-Fi contam como duas telas).
 * - Como os streams são 302 (sem ping do player), a conexão fica ativa por
 *   CONNECTION_TTL_MS após o ÚLTIMO acesso — depois expira e libera a vaga.
 * - /connections mostra as telas ativas e reset=1 libera todas.
 */
import { __connectionLimit } from '../api/xtream.js';

const { checkScreenLimit, listConnections, resetConnections, connKeyOf, ACTIVE_CONNECTIONS } = __connectionLimit;

let falhas = 0;
function check(desc, cond, extra = '') {
  if (cond) console.log(`  ✔ ${desc}`);
  else { falhas++; console.error(`  ✘ ${desc} ${extra}`); }
}

const MIN = 60000;
const TTL = __connectionLimit.CONNECTION_TTL_MS;

async function main() {
  // ---- Cenário A: limite = 1 ----
  {
    const scope = 'contaA::joao';
    let chamadas = 0;
    const validate = () => { chamadas++; return { ok: true, maxConnections: '1' }; };
    const t0 = Date.now();

    const r1 = await checkScreenLimit(scope, '1.1.1.1', 'iPhone/AppA', validate, t0);
    check('1ª tela entra com limite 1', r1.ok === true && r1.active === 1 && r1.max === 1);
    check('validação rodou 1 vez na 1ª tela', chamadas === 1);

    const r2 = await checkScreenLimit(scope, '2.2.2.2', 'Android/AppB', validate, t0 + 5000);
    check('2ª tela BLOQUEADA com limite 1', r2.ok === false && r2.reason === 'limit' && r2.active === 1 && r2.max === 1);

    const r3 = await checkScreenLimit(scope, '1.1.1.1', 'iPhone/AppA', validate, t0 + 10000);
    check('mesma tela volta a entrar (refresh de playlist)', r3.ok === true && r3.active === 1);
    check('tela existente NÃO revalida no Baserow', chamadas === 1);

    const info = listConnections(scope, t0 + 10000);
    check('listConnections vê 1 tela ativa', info.ativas === 1 && info.conexoes.length === 1);

    // Expira o TTL: a vaga abre para outra tela
    const r4 = await checkScreenLimit(scope, '2.2.2.2', 'Android/AppB', validate, t0 + 10000 + TTL + MIN);
    check('após expirar o TTL, outra tela entra', r4.ok === true && r4.active === 1);
    check('nova tela revalidou o limite (refresh do max)', chamadas === 2);
  }

  // ---- Cenário B: limite = 3, quatro telas ----
  {
    const scope = 'contaB::maria';
    const validate = () => ({ ok: true, maxConnections: 3 });
    const t0 = Date.now();
    const telas = [
      ['10.0.0.1', 'TV/Samsung'],
      ['10.0.0.1', 'iPhone/App'],      // mesmo IP, UA diferente => outra tela
      ['10.0.0.2', 'Android/App'],
    ];
    let todasOk = true;
    for (let i = 0; i < telas.length; i++) {
      const r = await checkScreenLimit(scope, telas[i][0], telas[i][1], validate, t0 + i * 1000);
      if (!r.ok) todasOk = false;
    }
    check('3 telas distintas entram com limite 3', todasOk && listConnections(scope, t0).ativas === 3);

    const rExtra = await checkScreenLimit(scope, '10.0.0.3', 'PC/VLC', validate, t0 + 5000);
    check('4ª tela é bloqueada', rExtra.ok === false && rExtra.reason === 'limit');

    // Uma tela expira → a 4ª passa a entrar
    const rDepois = await checkScreenLimit(scope, '10.0.0.3', 'PC/VLC', validate, t0 + TTL + 2 * MIN);
    check('após uma tela expirar, a 4ª entra', rDepois.ok === true && rDepois.active === 3);
  }

  // ---- Cenário C: usuário inválido ----
  {
    const scope = 'contaC::fantasma';
    const validate = () => ({ ok: false, message: 'Usuário não encontrado' });
    const r = await checkScreenLimit(scope, '9.9.9.9', 'App', validate, Date.now());
    check('tela de usuário inválido é recusada como auth', r.ok === false && r.reason === 'auth');
    check('usuário inválido não fica registrado', listConnections(scope, Date.now()).ativas === 0);
  }

  // ---- Cenário D: reset ----
  {
    const scope = 'contaD::reset';
    const validate = () => ({ ok: true, maxConnections: '1' });
    await checkScreenLimit(scope, '7.7.7.7', 'AppA', validate, Date.now());
    const antes = listConnections(scope, Date.now());
    const res = resetConnections(scope);
    const depois = listConnections(scope, Date.now());
    check('reset limpa as telas ativas', antes.ativas === 1 && res.resetadas === 1 && depois.ativas === 0);
    const r = await checkScreenLimit(scope, '8.8.8.8', 'AppB', validate, Date.now());
    check('após o reset outra tela entra', r.ok === true);
  }

  // ---- Cenário E: chave da tela ----
  {
    check('mesmo IP + UA diferente = telas diferentes', connKeyOf('1.1.1.1', 'A') !== connKeyOf('1.1.1.1', 'B'));
    check('IP diferente + mesmo UA = telas diferentes', connKeyOf('1.1.1.1', 'A') !== connKeyOf('2.2.2.2', 'A'));
    check('sem UA não crasha', connKeyOf('1.1.1.1', undefined).includes('1.1.1.1'));
  }

  // Higiene: mapas de teste não devem vazar para outros testes
  ACTIVE_CONNECTIONS.clear();

  console.log(falhas === 0 ? '\nTodos os testes de limite de telas passaram.' : `\n${falhas} teste(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
}

main();
