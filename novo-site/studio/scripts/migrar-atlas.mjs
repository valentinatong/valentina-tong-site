// Migra o Atlas (CSVs "ATLAS Fotogramas", "ATLAS Mapa", "ATLAS Configuração de Campos", "ATLAS Configurações").
// Fotos: Arquivo/web/<código>.webp (2000px, q85, convertidas dos originais do Airtable).
// Rodar:  npx sanity exec scripts/migrar-atlas.mjs --with-user-token            (teste, não grava)
//         GRAVAR=1 npx sanity exec scripts/migrar-atlas.mjs --with-user-token   (grava)
// IDs fixos: rodar de novo substitui os documentos em vez de duplicar.
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
function lista(s) { const out = []; let f = '', q = false; for (let i = 0; i < (s || '').length; i++) { const c = s[i]; if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c } else if (c === '"') q = true; else if (c === ',') { out.push(f.trim()); f = '' } else f += c } if (f.trim()) out.push(f.trim()); return out.filter(Boolean) }
const ler = (n) => parseCsv(fs.readFileSync(path.join(RAIZ, 'AIRTABLE CSV', n), 'utf8'))
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const num = (s) => { const n = parseFloat(String(s || '').replace(',', '.')); return Number.isFinite(n) ? n : undefined }
const chave = () => crypto.randomBytes(6).toString('hex')
const blocos = (txt) => (txt || '').split(/\n+/).map((t) => t.trim()).filter(Boolean).map((t) => ({_type: 'block', _key: chave(), style: 'normal', markDefs: [], children: [{_type: 'span', _key: chave(), text: t, marks: []}]}))
const rico = (pt, en) => (pt || en ? {_type: 'textoRico', pt: blocos(pt), en: blocos(en)} : undefined)
const curto = (pt, en) => ({_type: 'textoCurto', pt: pt || '', en: en || ''})
const rank = (i) => `0|${(100000 + i * 1000).toString(36)}:`
const hex = (s) => (s || '').trim().replace(/^#/, '') || undefined

const F = ler('ATLAS Fotogramas-Grid view.csv')
const M = ler('ATLAS Mapa-Grid view.csv')
const CC = ler('ATLAS Configuração de Campos-Grid view.csv')
const [CG] = ler('ATLAS Configurações-Grid view.csv')
const avisos = []

// lugares: todos os (município, estado) das fotos + os do Mapa, com coordenadas do Mapa
const chaveLugar = (m, e) => slug(`${m}-${e}`)
const lugares = {}
for (const m of M) if (m['Município']) lugares[chaveLugar(m['Município'], m['Estado'])] = {_id: `lugar-${chaveLugar(m['Município'], m['Estado'])}`, _type: 'lugar', municipio: m['Município'], estado: m['Estado'], lat: num(m['Latitude']), lon: num(m['Longitude'])}
for (const f of F) if (f['Município'] && f['Estado'] && !lugares[chaveLugar(f['Município'], f['Estado'])]) {
  lugares[chaveLugar(f['Município'], f['Estado'])] = {_id: `lugar-${chaveLugar(f['Município'], f['Estado'])}`, _type: 'lugar', municipio: f['Município'], estado: f['Estado']}
  avisos.push(`lugar sem coordenadas no Mapa: ${f['Município']} (${f['Estado']})`)
}

const projetosExistentes = new Set((await client.fetch(`*[_type=="projeto"]._id`)))
const assets = {}
async function asset(arq) {
  if (!GRAVAR) return 'image-teste'
  assets[arq] ||= (await client.assets.upload('image', fs.createReadStream(arq), {filename: path.basename(arq)}))._id
  return assets[arq]
}

const docs = []
let i = 0
for (const f of F) {
  const codigo = path.parse(f['Nome do arquivo'] || '').name
  if (!codigo) { avisos.push('linha sem nome do arquivo, ignorada'); continue }
  const arq = path.join(RAIZ, 'Arquivo', 'web', codigo + '.webp')
  if (!fs.existsSync(arq)) { avisos.push(`${codigo}: sem foto no Airtable, não migrado`); continue }
  const a = await asset(arq)
  const proj = f['Projeto'] && f['Projeto'] !== '-' ? `projeto-${slug(f['Projeto'])}` : null
  if (proj && !projetosExistentes.has(proj)) avisos.push(`${codigo}: projeto "${f['Projeto']}" não existe nos Projetos, ficou sem vínculo`)
  const lg = f['Município'] && f['Estado'] ? lugares[chaveLugar(f['Município'], f['Estado'])] : null
  if (!lg) avisos.push(`${codigo}: sem município/estado, fica fora do mapa`)
  const geologia = rico(f['Geologia_PT'], f['Geologia_EN']), contexto = rico(f['Contexto_PT'], f['Contexto_EN'])
  docs.push({
    _id: `fotograma-${slug(codigo)}`, _type: 'fotograma', orderRank: rank(i++), codigo,
    foto: {_type: 'image', asset: {_type: 'reference', _ref: a}},
    publicado: !!f['Publicado no site'],
    ...(proj && projetosExistentes.has(proj) && {projeto: {_type: 'reference', _ref: proj}}),
    ...(lg && {lugar: {_type: 'reference', _ref: lg._id}}),
    ...(f['Local'] && {local: f['Local']}), ...(f['Ano'] && {ano: f['Ano']}),
    ...(geologia && {geologia}), ...(contexto && {contexto}),
    publicacoes: lista(f['Publicação']), exposicoes: lista(f['Exposição']),
  })
}

const config = {
  _id: 'configAtlas', _type: 'configAtlas',
  corFundo: hex(CG['Cor de fundo']), corTag: hex(CG['Cor da tag']),
  abertura: rico(CG['Texto de abertura'], CG['Texto de abertura_EN']),
  aberturaMapa: rico(CG['Texto de abertura do Mapa'], CG['Texto de abertura do Mapa_EN']),
  rotuloFiltro: curto(CG['Rótulo filtro'], CG['Rótulo Filtro_EN']),
  rotuloTodos: curto(CG['Rótulo TODOS'], CG['Rótulo Todos_EN']),
  campos: [...CC].sort((a, b) => (num(a['Ordem']) ?? 99) - (num(b['Ordem']) ?? 99)).map((c) => ({_type: 'campoFicha', _key: chave(), campo: c['Campo'], rotulo: curto(c['Rótulo'], c['Rótulo_EN']), ativo: !!c['Ativo']})),
}

console.log(`${docs.length} fotogramas (${docs.filter((d) => d.publicado).length} publicados) · ${Object.keys(lugares).length} lugares (${Object.values(lugares).filter((l) => l.lat != null).length} com coordenadas) · ${config.campos.length} campos da ficha`)
console.log(`com projeto: ${docs.filter((d) => d.projeto).length} · com lugar: ${docs.filter((d) => d.lugar).length} · com publicação: ${docs.filter((d) => d.publicacoes.length).length} · com exposição: ${docs.filter((d) => d.exposicoes.length).length}`)
if (avisos.length) console.log('\nAVISOS:\n- ' + [...new Set(avisos)].join('\n- '))
if (!GRAVAR) { console.log('\n(teste: nada foi gravado)'); process.exit(0) }
let tx = client.transaction()
for (const d of [...Object.values(lugares), ...docs, config]) tx = tx.createOrReplace(JSON.parse(JSON.stringify(d)))
await tx.commit()
console.log(`\ngravado: ${Object.keys(assets).length} fotos enviadas, ${docs.length} fotogramas, ${Object.keys(lugares).length} lugares`)
