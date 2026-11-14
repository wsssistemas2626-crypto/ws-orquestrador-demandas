// test/estatico/migrations-congeladas-qa.test.ts — 06-T03-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; SB-10, RNF-08
// e G4): nenhuma migration da main muda, e a 0010 só acrescenta. As dez migrations de 41108ee (0000 a 0009) e os
// snapshots delas ficam presos pelo SHA-256 dos bytes; as entradas 0 a 9 do diário, campo a campo. Os valores foram
// tirados da árvore com `git diff 41108ee` vazio nesses caminhos (06-T03-testes): são os de 41108ee. A pasta drizzle/ só
// tem as migrations do diário, e o snapshot da 0010 é o da 0009 mais a coluna nova, anulável e sem padrão: nenhuma
// tabela, índice, FK, CHECK, política, papel, enum, sequência ou vista a mais ou a menos.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const sha256 = (caminho: string) => createHash('sha256').update(readFileSync(`${raiz}${caminho}`)).digest('hex');

type Entrada = { idx: number; version: string; when: number; tag: string; breakpoints: boolean };
const diario = JSON.parse(readFileSync(`${raiz}drizzle/meta/_journal.json`, 'utf8')) as { version: string; dialect: string; entries: Entrada[] };

type Tabela = { columns: Record<string, unknown> } & Record<string, unknown>;
type Snapshot = { id: string; prevId: string; tables: Record<string, Tabela> } & Record<string, unknown>;
const snapshot = (n: string) => JSON.parse(readFileSync(`${raiz}drizzle/meta/${n}_snapshot.json`, 'utf8')) as Snapshot;

const entrada = (idx: number, when: number, tag: string): Entrada => ({ idx, version: '7', when, tag, breakpoints: true });
// As entradas 0 a 9 do diário em 41108ee.
const DIARIO_DA_MAIN: readonly Entrada[] = [
  entrada(0, 1792967877818, '0000_amusing_living_lightning'),
  entrada(1, 1792967886529, '0001_rls_privilegios_acesso'),
  entrada(2, 1792969488322, '0002_brown_jackal'),
  entrada(3, 1792969495905, '0003_rls_privilegios_dominio'),
  entrada(4, 1792971032249, '0004_busy_jigsaw'),
  entrada(5, 1792971040045, '0005_rls_privilegios_agentes'),
  entrada(6, 1793020280561, '0006_familiar_crusher_hogan'),
  entrada(7, 1794429250839, '0007_greedy_wendigo'),
  entrada(8, 1794526239103, '0008_slippery_whirlwind'),
  entrada(9, 1794526242801, '0009_rls_andamento_construcao'),
];

// SHA-256 dos bytes de cada superfície da main (10 SQL e 10 snapshots), em 41108ee.
const CONGELADAS: Readonly<Record<string, string>> = {
  'drizzle/0000_amusing_living_lightning.sql': 'a2640912c6bfa6735bb99fb174bc27cfd642213415237148fd79d004d786b57c',
  'drizzle/0001_rls_privilegios_acesso.sql': '9ea6990c47072d11079ba204ac182006349b02931b3c1a1340aa12d43249b626',
  'drizzle/0002_brown_jackal.sql': '04f366ec6e38260cdb80b71d4d8c8b12478429ccf7581c398a4416ba90e99d6c',
  'drizzle/0003_rls_privilegios_dominio.sql': 'bd8da571f910872c819a5a94cdb0908f359e17efcbe2edb49c3318847f953537',
  'drizzle/0004_busy_jigsaw.sql': 'cf70a59c4fffdbb390dd06f0eb3aca61451ce6a63b02736eb9bb6f0bc35daddf',
  'drizzle/0005_rls_privilegios_agentes.sql': '7ae039068d16d779b8ac1282f1df50bbc489b9a4b453b5851b28ee0a441935de',
  'drizzle/0006_familiar_crusher_hogan.sql': '9f110553b529d0be700e9940617b099294e080c03c082c8f8226bc10b2d991ae',
  'drizzle/0007_greedy_wendigo.sql': '96c3d3aa9241abc298b86ab90f2fa5cfbbdee0e45b2f686d78619e588bb3f984',
  'drizzle/0008_slippery_whirlwind.sql': 'd639a5829f8e6615b1157d05ac4afd459c5d89e36239e0064e11a1caa4e407c3',
  'drizzle/0009_rls_andamento_construcao.sql': '43095e880d3f7a5d7c98bba94aee2472bb5821a2086175a2a741bc5a66c5e62a',
  'drizzle/meta/0000_snapshot.json': '17a4e6f80c3158a9eb7e5b3e6ac5919c03903bc4a38543cee1951e7de5e57670',
  'drizzle/meta/0001_snapshot.json': '68d910d1d6df95a24554e9300b29c4958743e740cd679d7f5093add9b361a111',
  'drizzle/meta/0002_snapshot.json': '900d531a20b7ce89d1e689a909289bdd9729c30c56d3308f2dd939bd19a565da',
  'drizzle/meta/0003_snapshot.json': 'e72cafa823abe2c22dda9bf960d020bacfc680d2d78d4b09515b544dba8a7640',
  'drizzle/meta/0004_snapshot.json': '59d96a86fc6c417bce916e4acf16c4fb09b8e735285315ece26871b2d21116eb',
  'drizzle/meta/0005_snapshot.json': 'c197a0bcf1bea79c5500680e1caeaf7a43791a423a19850da2a9a944bc59985f',
  'drizzle/meta/0006_snapshot.json': '07ae65042b1bccd6784d5baac63680999656d229ccf1214b97127156f82ce358',
  'drizzle/meta/0007_snapshot.json': '78aab0bf9a2c1c68290bb10749c81494f278e40e25f334cb9fa6b98120bb8874',
  'drizzle/meta/0008_snapshot.json': 'd79ea15ae063a609101dcce32d0de7b5cee75f05a074468700685efcd6fe72ac',
  'drizzle/meta/0009_snapshot.json': '7a772dcf8990a5b76e0c3de6ae919dc0c5306301c12574932b717540821a1e34',
};

it('as entradas 0 a 9 do diário são as de 41108ee, campo a campo, e o cabeçalho do diário não muda', () => {
  expect(diario.entries.filter((e) => e.idx <= 9)).toEqual(DIARIO_DA_MAIN);
  expect({ version: diario.version, dialect: diario.dialect }).toEqual({ version: '7', dialect: 'postgresql' });
});

it('as dez migrations e os dez snapshots da main têm o SHA-256 de 41108ee', () => {
  const daMain = DIARIO_DA_MAIN.flatMap((e) => [`drizzle/${e.tag}.sql`, `drizzle/meta/${e.tag.slice(0, 4)}_snapshot.json`]);
  expect(Object.keys(CONGELADAS).sort()).toEqual(daMain.sort());
  expect(Object.fromEntries(daMain.map((c) => [c, sha256(c)]))).toEqual(CONGELADAS);
});

it('drizzle/ só tem as migrations do diário, e drizzle/meta/ só o diário e um snapshot por migration', () => {
  const tags = diario.entries.map((e) => e.tag);
  expect(readdirSync(`${raiz}drizzle`).filter((a) => a.endsWith('.sql')).sort()).toEqual(tags.map((t) => `${t}.sql`).sort());
  expect(readdirSync(`${raiz}drizzle/meta`).sort()).toEqual(['_journal.json', ...tags.map((t) => `${t.slice(0, 4)}_snapshot.json`)].sort());
});

it('o snapshot da 0010 é o da 0009 mais a coluna nova, anulável e sem padrão, e nada mais (só aditiva)', () => {
  const s9 = snapshot('0009');
  const s10 = snapshot('0010');
  expect(s10.prevId).toBe(s9.id);
  const { 'public.pacote_decisao': dec9, ...outras9 } = s9.tables;
  const { 'public.pacote_decisao': dec10, ...outras10 } = s10.tables;
  expect(outras10).toEqual(outras9);
  const { caminhos_com_nome_na_criacao: nova, ...colunas10 } = dec10!.columns;
  expect(colunas10).toEqual(dec9!.columns);
  expect(nova).toEqual({ name: 'caminhos_com_nome_na_criacao', type: 'text[]', primaryKey: false, notNull: false });
  expect({ ...dec10, columns: null }).toEqual({ ...dec9, columns: null });
  const resto = (s: Snapshot) => ({ ...s, id: null, prevId: null, tables: null });
  expect(resto(s10)).toEqual(resto(s9));
});
