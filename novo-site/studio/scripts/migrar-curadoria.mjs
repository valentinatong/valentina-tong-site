// Migra a Curadoria dos CSVs do Airtable (pasta "AIRTABLE CSV") para o Sanity.
// Imagens: vêm das pastas locais em Curadoria/ (já tratadas), achadas pelo nome do arquivo.
// Rodar:  npx sanity exec scripts/migrar-curadoria.mjs --with-user-token            (teste, não grava)
//         GRAVAR=1 npx sanity exec scripts/migrar-curadoria.mjs --with-user-token   (grava)
// IDs fixos: rodar de novo substitui os documentos em vez de duplicar.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {getCliClient} from 'sanity/cli'

const RAIZ = '/Users/valentinatong/SITE POR CLAUDE'
const CSV = path.join(RAIZ, 'AIRTABLE CSV')
const GRAVAR = process.env.GRAVAR === '1'
const client = getCliClient({apiVersion: '2025-01-01'})

// --- CSV ---
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
const ler = (n) => parseCsv(fs.readFileSync(path.join(CSV, n), 'utf8'))
const lista = (s) => (s ? parseCsv('x\n' + s)[0] && Object.values(parseCsv('a\n' + s)[0]) : []) // não usado
// lista de vínculos "A,\"B, com vírgula\",C"
const vinculos = (s) => { if (!s) return []; const r = parseCsv('x\n' + s.replace(/\n/g, ' ')); return s ? splitCsvLine(s) : [] }
function splitCsvLine(s) { const out = []; let f = '', q = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c } else if (c === '"') q = true; else if (c === ',') { out.push(f.trim()); f = '' } else f += c } if (f.trim()) out.push(f.trim()); return out.filter(Boolean) }
// anexos "nome.webp (https://...),outro (https://...)"
const anexosUrl = (s) => splitCsvLine(s || '').map((x) => x.match(/^(.+) \((https?:\/\/[^)]+)\)$/)).filter(Boolean).map((m) => ({nome: m[1].trim(), url: m[2]}))
const anexos = (s) => anexosUrl(s).map((a) => a.nome)
const urlDe = {}  // nome do arquivo → link do Airtable no CSV (reserva, se não estiver nas pastas)
// "Ordem" vem com vírgula decimal ("2,0")
const num = (s, padrao = 999) => { const n = parseFloat(String(s || '').replace(',', '.')); return Number.isFinite(n) ? n : padrao }

const P = ler('CURADORIA Projetos-Grid view.csv')
const I = ler('CURADORIA Itinerâncias-Grid view.csv')
const G = ler('CURADORIA Galerias-Grid view.csv')
const C = ler('CURADORIA Configurações-Grid view.csv')
for (const r of [...P.map((p) => p['Fotos']), ...G.map((g) => g['Imagem'])]) for (const a of anexosUrlTmp(r)) urlDe[a.nome] = a.url
function anexosUrlTmp(s) { return splitCsvLine(s || '').map((x) => x.match(/^(.+) \((https?:\/\/[^)]+)\)$/)).filter(Boolean).map((m) => ({nome: m[1].trim(), url: m[2]})) }

// --- arquivos locais ---
const arquivos = {}
;(function andar(d) { for (const e of fs.readdirSync(d, {withFileTypes: true})) { const p = path.join(d, e.name); if (e.isDirectory()) andar(p); else (arquivos[e.name] ||= []).push(p) } })(path.join(RAIZ, 'Curadoria'))

// --- utilitários ---
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const chave = () => crypto.randomBytes(6).toString('hex')
const blocos = (txt) => (txt || '').split(/\n+/).map((t) => t.trim()).filter(Boolean).map((t) => ({_type: 'block', _key: chave(), style: 'normal', markDefs: [], children: [{_type: 'span', _key: chave(), text: t, marks: []}]}))
const rico = (pt, en) => (pt || en ? {_type: 'textoRico', pt: blocos(pt), en: blocos(en)} : undefined)
const rank = (i) => `0|${(100000 + i * 1000).toString(36)}:`

// --- etiquetas (tipo/papel), pareando PT e EN pela posição quando as listas batem ---
const etiquetas = {}
function etiqueta(grupo, pt, en) {
  const id = `etiqueta-${grupo}-${slug(pt)}`
  etiquetas[id] ||= {_id: id, _type: 'etiqueta', grupo, nome: {_type: 'textoCurto', pt, en: ''}}
  if (en && !etiquetas[id].nome.en) etiquetas[id].nome.en = en
  return {_type: 'reference', _ref: id, _key: chave()}
}
const refs = (grupo, ptS, enS) => { const pt = splitCsvLine(ptS), en = splitCsvLine(enS); return pt.map((t, i) => etiqueta(grupo, t, pt.length === en.length ? en[i] : '')) }

// --- uploads (com cache por arquivo) ---
const assets = {}
const avisos = []
async function asset(nome) {
  const f = arquivos[nome]
  if (!f) {
    if (!urlDe[nome]) { avisos.push(`imagem não encontrada nas pastas nem no CSV: ${nome}`); return null }
    avisos.push(`não estava nas pastas, baixada do link do CSV: ${nome}`)
    if (!GRAVAR) return 'image-teste'
    if (!assets[nome]) { const r = await fetch(urlDe[nome]); if (!r.ok) { avisos.push(`falhou o download (${r.status}): ${nome}`); return null } assets[nome] = (await client.assets.upload('image', Buffer.from(await r.arrayBuffer()), {filename: nome}))._id }
    return assets[nome]
  }
  if (f.length > 1) avisos.push(`nome repetido em ${f.length} pastas, usei a 1ª: ${nome}`)
  if (!GRAVAR) return 'image-teste'
  if (!assets[nome]) assets[nome] = (await client.assets.upload('image', fs.createReadStream(f[0]), {filename: nome}))._id
  return assets[nome]
}

// --- montagem ---
const titulos = new Map(P.map((p) => [p['Título_PT'], p]))
const sedesDe = {}  // título → itinerâncias
const itinPorLocal = {}
for (const i of I) for (const t of splitCsvLine(i['Projeto'])) { (sedesDe[t] ||= []).push(i); (itinPorLocal[i['Local']] ||= []).push(t) }
const galDe = {}
for (const g of G) {
  let alvo = splitCsvLine(g['Projetos'])[0]
  const itin = splitCsvLine(g['Itinerancia'])[0]
  if (!alvo && itin) { const ps = itinPorLocal[itin] || []; if (ps.length === 1) alvo = ps[0]; else avisos.push(`galeria "${g['Nome']}": itinerância "${itin}" ambígua (${ps.join(' | ')})`) }
  if (!alvo || !titulos.has(alvo)) { avisos.push(`galeria "${g['Nome']}" sem projeto válido (${alvo || '—'})`); continue }
  ;(galDe[alvo] ||= []).push(g)
}

const docs = []
const ordenados = [...P].sort((a, b) => num(a['Ordem']) - num(b['Ordem']))
for (const [idx, p] of ordenados.entries()) {
  const t = p['Título_PT']
  const galeria = []
  const linhas = (galDe[t] || []).sort((a, b) => num(a['Ordem']) - num(b['Ordem']))
  for (const g of linhas) {
    const legenda = rico(g['Legenda PT'], g['Legenda EN'])
    const link = g['Link externo'] || undefined
    for (const nome of anexos(g['Imagem'])) {
      const a = await asset(nome); if (!a) continue
      galeria.push({_type: 'foto', _key: chave(), asset: {_type: 'reference', _ref: a}, ...(legenda && {legenda}), ...(link && {link})})
    }
    if (!anexos(g['Imagem']).length && g['Vídeo']) galeria.push({_type: 'video', _key: chave(), url: g['Vídeo'], ...(legenda && {legenda}), ...(link && {link})})
  }
  // projetos sem Galerias: usa o campo "Fotos" antigo
  if (!galeria.length) for (const nome of anexos(p['Fotos'])) { const a = await asset(nome); if (a) galeria.push({_type: 'foto', _key: chave(), asset: {_type: 'reference', _ref: a}}) }
  const sedes = (sedesDe[t] || []).sort((a, b) => num(a['Ordem']) - num(b['Ordem']))
    .map((i) => ({_type: 'sede', _key: chave(), local: i['Local'], ...(i['Ano'] && {ano: i['Ano']}), ...(i['Link oficial'] && {link: i['Link oficial']})}))
  docs.push({
    _id: `curadoria-${slug(t)}`, _type: 'curadoria', orderRank: rank(idx),
    titulo: {_type: 'textoCurto', pt: t, en: p['Título_EN'] || ''},
    tipos: refs('tipo', p['Tipo_PT'], p['Tipo_EN']), papeis: refs('papel', p['Papel_PT'], p['Papel_EN']),
    ...(p['Local'] && {local: p['Local']}), ...(p['Ano'] && {ano: p['Ano']}), ...(p['Link oficial'] && {link: p['Link oficial']}),
    ...(rico(p['Texto de apresentação_PT'], p['Texto de apresentação_EN']) && {texto: rico(p['Texto de apresentação_PT'], p['Texto de apresentação_EN'])}),
    sedes, galeria,
  })
}
const cor = (nome) => (C.find((c) => c['Página'].toLowerCase().includes(nome)) || {})['Cor de fundo'] || ''
const config = {_id: 'configuracoes', _type: 'configuracoes', corFundoCuradoria: (C.find((c) => !/cor da/i.test(c['Página'])) || {})['Cor de fundo'] || '', corLegendaCuradoria: cor('legenda'), corImagemCuradoria: cor('imagem')}

// --- relatório e gravação ---
for (const d of docs) console.log(`${d.titulo.pt.slice(0, 48).padEnd(48)} sedes ${String(d.sedes.length).padStart(2)}  galeria ${String(d.galeria.length).padStart(2)}  (${d.galeria.filter((x) => x._type === 'video').length} vídeo)`)
console.log(`\n${docs.length} projetos · ${Object.keys(etiquetas).length} etiquetas · ${docs.reduce((n, d) => n + d.galeria.length, 0)} itens de galeria · cores ${JSON.stringify(config)}`)
console.log('etiquetas sem EN:', Object.values(etiquetas).filter((e) => !e.nome.en).map((e) => e.nome.pt).join(', ') || '—')
if (avisos.length) console.log('\nAVISOS:\n- ' + [...new Set(avisos)].join('\n- '))
if (!GRAVAR) { console.log('\n(teste: nada foi gravado)'); process.exit(0) }
let tx = client.transaction()
for (const d of [...Object.values(etiquetas), ...docs, config]) tx = tx.createOrReplace(d)
await tx.commit()
console.log(`\ngravado: ${Object.keys(assets).length} imagens enviadas, ${docs.length + Object.keys(etiquetas).length + 1} documentos`)
