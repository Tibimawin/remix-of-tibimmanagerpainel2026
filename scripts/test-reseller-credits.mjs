/**
 * Teste do módulo de revendas (créditos) em api/xtream.js
 * Executar: node scripts/test-reseller-credits.mjs
 *
 * Regras (definidas pelo dono do painel):
 * - 1 crédito = 1 linha de 30 dias; débito nunca deixa saldo negativo.
 * - Revenda bloqueada não cria linha; sem saldo (0) também não.
 * - Renovação parte do maior entre "agora" e o vencimento atual (nunca encurta).
 * - Pacote de créditos tem preço próprio; avulso usa o preço por crédito.
 * - Links M3U/Xtream levam a conta (master) na query.
 * - Linhas da revenda são marcadas com a tag revenda:<uid>.
 */
import handler, { __reseller } from '../api/xtream.js';

const A = (cond, msg) => { if (!cond) throw new Error('FALHOU: ' + msg); console.log('ok -', msg); };
const r = __reseller;

A(r.calcNewBalance(10, 1) === 9 && r.calcNewBalance(0, 1) === 0 && r.calcNewBalance(3, 5) === 0, 'débito de crédito nunca fica negativo');
A(r.canCreateLine({ status: 'ativo', creditBalance: 1 }) === true && r.canCreateLine({ status: 'ativo', creditBalance: 0 }) === false, 'linha exige saldo >= 1');
A(r.canCreateLine({ status: 'bloqueado', creditBalance: 9 }) === false, 'revenda bloqueada não cria linha');

const base = Date.parse('2026-03-10T12:00:00Z');
const now = Date.parse('2026-03-05T00:00:00Z');
A(r.calcRenewalExpiry(base, now).getTime() === Date.parse('2026-04-09T12:00:00Z'), 'renovação parte do vencimento atual quando futuro');
A(r.calcRenewalExpiry(Date.parse('2026-01-01T00:00:00Z'), now).getTime() === now + 30 * 24 * 3600 * 1000, 'renovação parte de hoje quando linha vencida');

const s = { creditPrice: 5, packages: [{ credits: 10, price: 45 }] };
A(r.resolvePurchaseValue(10, s).value === 45 && r.resolvePurchaseValue(3, s).value === 15, 'pacote tem preço próprio, avulso usa preço do crédito');

const links = r.buildLineLinks('https://api.tibimmanagerpainel.shop/', 'uid1', 'joao', '123');
A(links.m3u_ts.includes('username=joao') && links.m3u_ts.includes('account=uid1') && !links.m3u_ts.includes('//get'), 'links M3U com conta do master');

A(r.isOwnLine({ 'Revenda': 'revenda:abc' }, 'abc') === true && r.isOwnLine({ 'Obs': 'revenda:abc' }, 'abc') === true && r.isOwnLine({ 'Revenda': 'revenda:xyz' }, 'abc') === false, 'tag revenda identifica linhas próprias');

const f = r.mapUserTableFields(['Nome', 'Usuario', 'Senha', 'Status', 'Vencimento', 'Observação']);
A(f.nome === 'Nome' && f.usuario === 'Usuario' && f.senha === 'Senha' && f.revenda === 'Observação', 'mapeia colunas reais da tabela usuarios');

A(typeof handler === 'function', 'handler segue exportado');

console.log('TODOS OS TESTES DE REVENDAS PASSARAM');
