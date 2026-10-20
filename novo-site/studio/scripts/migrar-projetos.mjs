// Migra os Projetos do Portfólio (CSVs "PROJETOS Projetos" e "PROJETOS Imagens") para o Sanity.
// Imagens: as versões WebP em Projetos/<pasta>/web/<Nome do arquivo>.webp (geradas a partir do Airtable).
// Rodar:  npx sanity exec scripts/migrar-projetos.mjs --with-user-token            (teste, não grava)
//         GRAVAR=1 npx sanity exec scripts/migrar-projetos.mjs --with-user-token   (grava)
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
const ler = (n) => parseCsv(fs.readFileSync(path.join(RAIZ, 'AIRTABLE CSV', n), 'utf8'))
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
// "Ordem" pode vir com vírgula decimal ("2,0")
const num = (s, padrao = 999) => { const n = parseFloat(String(s || '').replace(',', '.')); return Number.isFinite(n) ? n : padrao }
const chave = () => crypto.randomBytes(6).toString('hex')
const blocos = (txt) => (txt || '').split(/\n+/).map((t) => t.trim()).filter(Boolean).map((t) => ({_type: 'block', _key: chave(), style: 'normal', markDefs: [], children: [{_type: 'span', _key: chave(), text: t, marks: []}]}))
const rico = (pt, en) => (pt || en ? {_type: 'textoRico', pt: blocos(pt), en: blocos(en)} : undefined)
const rank = (i) => `0|${(100000 + i * 1000).toString(36)}:`
const hex = (s) => (s || '').trim().replace(/^#/, '') || undefined

const P = ler('PROJETOS Projetos-Grid view.csv')
const I = ler('PROJETOS Imagens-Grid view.csv')
const pastas = Object.fromEntries(fs.readdirSync(path.join(RAIZ, 'Projetos'), {withFileTypes: true}).filter((d) => d.isDirectory()).map((d) => [slug(d.name), d.name]))

const avisos = []
const assets = {}
async function asset(arq) {
  if (!fs.existsSync(arq)) { avisos.push('arquivo não encontrado: ' + arq); return null }
  if (!GRAVAR) return 'image-teste'
  assets[arq] ||= (await client.assets.upload('image', fs.createReadStream(arq), {filename: path.basename(arq)}))._id
  return assets[arq]
}

const docs = []
for (const [idx, p] of [...P].sort((a, b) => num(a['Ordem']) - num(b['Ordem'])).entries()) {
  const nome = p['Nome'].trim()
  const pasta = pastas[slug(nome)]
  if (!pasta) avisos.push(`sem pasta local para ${nome}`)
  const imgs = I.filter((r) => r['Projeto'].trim() === nome).sort((a, b) => num(a['Ordem']) - num(b['Ordem']))
  const paginas = []
  for (const r of imgs) {
    // nome do arquivo convertido: "Nome do arquivo" ou, se vazio, o nome do anexo do Airtable
    const anexo = (r['Foto'].match(/^"?(.+?) \(https?:/) || [])[1] || ''
    const base = path.parse(r['Nome do arquivo'] || anexo).name
    const a = await asset(path.join(RAIZ, 'Projetos', pasta || nome, 'web', base + '.webp'))
    if (!a) continue
    const legenda = rico(r['Legenda_PT'], r['Legenda_EN']), legenda2 = rico(r['Legenda_PT_2'], r['Legenda_EN_2'])
    paginas.push({_type: 'pagina', _key: chave(), asset: {_type: 'reference', _ref: a}, ...(legenda && {legenda}), ...(legenda2 && {legenda2})})
  }
  if (p['Capa']) avisos.push(`${nome}: tinha capa própria no Airtable (${p['Capa'].split(' (')[0]}); o link do CSV já expirou, então usa a 1ª imagem até você subir a capa no Studio`)
  const fonteTipo = ['Newsreader', 'Fraunces', 'Space Mono'].includes(p['Tipo de Fonte']) ? p['Tipo de Fonte'] : undefined
  const abertura = rico(p['Texto de abertura_PT'], p['Texto de abertura_EN'])
  const creditos = rico(p['Créditos_PT'], p['Créditos_EN'])
  docs.push({
    _id: `projeto-${slug(nome)}`, _type: 'projeto', orderRank: rank(idx),
    nome, slug: {_type: 'slug', current: slug(nome)}, ano: p['Ano'] || undefined,
    ...(abertura && {abertura}), ...(creditos && {creditos}),
    corFundo: hex(p['Cor de fundo']), corFonte: hex(p['Cor da Fonte']), fonteTipo,
    ...(num(p['Tamanho da Fonte'], NaN) > 0 && {fonteTamanho: num(p['Tamanho da Fonte'])}),
    paginas,
  })
}
for (const d of docs) console.log(`${d.nome.padEnd(24)} ${String(d.paginas.length).padStart(3)} imagens  dípticos ${d.paginas.filter((x) => x.legenda2).length}  cor ${d.corFundo || '—'}  abertura ${d.abertura ? 'sim' : '—'}  créditos ${d.creditos ? 'sim' : '—'}`)
console.log(`\n${docs.length} projetos · ${docs.reduce((n, d) => n + d.paginas.length, 0)} imagens`)
if (avisos.length) console.log('\nAVISOS:\n- ' + [...new Set(avisos)].join('\n- '))
if (!GRAVAR) { console.log('\n(teste: nada foi gravado)'); process.exit(0) }
let tx = client.transaction()
for (const d of docs) tx = tx.createOrReplace(JSON.parse(JSON.stringify(d)))
await tx.commit()
console.log(`\ngravado: ${Object.keys(assets).length} imagens enviadas, ${docs.length} projetos`)
