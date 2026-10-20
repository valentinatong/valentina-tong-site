// Transforma Local, Geologia, Contexto, Publicação e Exposição do Atlas em etiquetas (listas fixas, PT/EN)
// e liga cada fotograma às suas — a partir do CSV "ATLAS Fotogramas" (campos de múltipla escolha do Airtable).
// Rodar:  npx sanity exec scripts/migrar-tags-atlas.mjs --with-user-token            (teste)
//         GRAVAR=1 npx sanity exec scripts/migrar-tags-atlas.mjs --with-user-token   (grava)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {getCliClient} from 'sanity/cli'

const RAIZ = '/Users/valentinatong/SITE POR CLAUDE'
const GRAVAR = process.env.GRAVAR === '1'
const client = getCliClient({apiVersion: '2025-01-01'})

function parseCsv(txt) {
  const rows = []; let row = [], f = '', q = false
  txt = txt.replace(/^﻿/, '')
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i]
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = '' }
    else f += c
  }
  if (f || row.length) { row.push(f); rows.push(row) }
  const [h, ...d] = rows.filter((r) => r.some((x) => x !== ''))
  return d.map((r) => Object.fromEntries(h.map((k, i) => [k, (r[i] ?? '').trim()])))
}
// valor de múltipla escolha: "A,\"B, com vírgula\",C"
function lista(s) { const out = []; let f = '', q = false; for (let i = 0; i < (s || '').length; i++) { const c = s[i]; if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c } else if (c === '"') q = true; else if (c === ',') { out.push(f.trim()); f = '' } else f += c } if (f.trim()) out.push(f.trim()); return out.filter(Boolean) }
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
const chave = () => crypto.randomBytes(6).toString('hex')

const F = parseCsv(fs.readFileSync(path.join(RAIZ, 'AIRTABLE CSV', 'ATLAS Fotogramas-Grid view.csv'), 'utf8'))
// [grupo, campo no fotograma, coluna PT, coluna EN]
const GRUPOS = [['local', 'locais', 'Local', null], ['geologia', 'geologias', 'Geologia_PT', 'Geologia_EN'], ['contexto', 'contextos', 'Contexto_PT', 'Contexto_EN'], ['publicacao', 'publicacoes', 'Publicação', null], ['exposicao', 'exposicoes', 'Exposição', null]]

// tradução PT→EN aprendida das fotos em que as duas listas têm o mesmo tamanho
const traducao = {}
for (const [g, , cpt, cen] of GRUPOS) if (cen) for (const f of F) { const pt = lista(f[cpt]), en = lista(f[cen]); if (pt.length === en.length) pt.forEach((p, i) => { traducao[`${g}|${p}`] ||= en[i] }) }

const tags = {}
const tag = (g, pt) => { const id = `tagatlas-${g}-${slug(pt)}`; tags[id] ||= {_id: id, _type: 'tagAtlas', grupo: g, nome: {_type: 'textoCurto', pt, en: traducao[`${g}|${pt}`] || ''}}; return {_type: 'reference', _ref: id, _key: chave()} }

const existentes = new Set(await client.fetch(`*[_type=="fotograma"]._id`))
const patches = []
for (const f of F) {
  const id = `fotograma-${slug(path.parse(f['Nome do arquivo'] || '').name)}`
  if (!existentes.has(id)) continue
  const set = {}
  for (const [g, campo, cpt] of GRUPOS) set[campo] = lista(f[cpt]).map((v) => tag(g, v))
  patches.push({id, set})
}

const porGrupo = (g) => Object.values(tags).filter((t) => t.grupo === g)
for (const [g] of GRUPOS) console.log(`${g.padEnd(11)} ${String(porGrupo(g).length).padStart(3)} etiquetas  (sem EN: ${porGrupo(g).filter((t) => !t.nome.en).length})`)
console.log(`${patches.length} fotogramas ligados às etiquetas`)
const exemplo = patches.find((p) => p.set.geologias.length > 1)
if (exemplo) console.log('exemplo', exemplo.id, exemplo.set.geologias.map((r) => tags[r._ref].nome.pt))
if (!GRAVAR) { console.log('\n(teste: nada foi gravado)'); process.exit(0) }
let tx = client.transaction()
for (const t of Object.values(tags)) tx = tx.createOrReplace(t)
for (const p of patches) tx = tx.patch(p.id, (q) => q.set(p.set).unset(['local', 'geologia', 'contexto']))
await tx.commit()
console.log(`\ngravado: ${Object.keys(tags).length} etiquetas, ${patches.length} fotogramas atualizados`)
