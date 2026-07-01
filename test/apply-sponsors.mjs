// Simula lo step "Salva i tag sponsor della tappa" del workflow: lancia apply-sponsors.mjs
// con un input sponsor e 2 link, scrivendo su un sponsor.json TEMPORANEO (SPONSOR_FILE),
// e verifica che entrambi gli id vengano aggiornati senza toccare le altre voci.
//   node test/apply-sponsors.mjs
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

const root = fileURLToPath(new URL('..', import.meta.url));
const script = fileURLToPath(new URL('../apply-sponsors.mjs', import.meta.url));
const tmp = fileURLToPath(new URL('./_tmp-sponsor.json', import.meta.url));

// Seed: file preesistente con una tappa e "default" da preservare.
writeFileSync(tmp, JSON.stringify({ '99999': ['vecchio'], default: [] }, null, 2) + '\n');

const out = execFileSync('node', [script], {
  cwd: root,
  env: {
    ...process.env,
    SPONSOR_FILE: tmp,
    TAPPE_IN: 'https://beachvolley.federvolley.it/node/66769\nhttps://beachvolley.federvolley.it/node/66770',
    SPONSOR_IN: '@sponsor1 sponsor2, @sponsor1\n@orbite volley!'   // dup + @ da pulire + handle invalido "volley!"
  },
  encoding: 'utf8'
});
console.log(out.trim());

const data = JSON.parse(readFileSync(tmp, 'utf8'));
const expected = ['sponsor1', 'sponsor2', 'orbite'];   // dedup, @ tolti, "volley!" scartato
assert.deepStrictEqual(data['66769'], expected, 'tappa 66769 deve avere gli sponsor puliti');
assert.deepStrictEqual(data['66770'], expected, 'tappa 66770 deve avere gli sponsor puliti');
assert.deepStrictEqual(data['99999'], ['vecchio'], 'le altre tappe non vanno toccate');
assert.deepStrictEqual(data.default, [], '"default" va preservato');

rmSync(tmp, { force: true });
console.log('\nOK — sponsor.json aggiornato per i 2 id, dedup/@/validazione corretti, resto intatto.');
