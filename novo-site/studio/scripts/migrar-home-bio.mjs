// Cria os documentos Home (foto de capa) e Bio (texto provisório do site atual).
// Rodar: npx sanity exec scripts/migrar-home-bio.mjs --with-user-token
import fs from 'node:fs'
import crypto from 'node:crypto'
import {getCliClient} from 'sanity/cli'
const client = getCliClient({apiVersion: '2025-01-01'})
const chave = () => crypto.randomBytes(6).toString('hex')
const bloco = (t, marks = []) => ({_type: 'block', _key: chave(), style: 'normal', markDefs: [], children: [{_type: 'span', _key: chave(), text: t, marks}]})

// foto padrão do site atual (assets/home/home-01.jpg); troque no Studio pela capa ativa
const foto = await client.assets.upload('image', fs.createReadStream('/Users/valentinatong/SITE POR CLAUDE/assets/home/home-01.jpg'), {filename: 'home-01.jpg'})
await client.createIfNotExists({_id: 'home', _type: 'home'})
await client.patch('home').setIfMissing({foto: {_type: 'image', asset: {_type: 'reference', _ref: foto._id}}}).commit()

await client.createIfNotExists({
  _id: 'bio', _type: 'bio', nome: 'Valentina Tong', email: 'tongvalentina@gmail.com',
  texto: {_type: 'textoRico', pt: [
    bloco('[Texto provisório — substituir pelo texto de bio definitivo.]', ['em']),
    bloco('[Parágrafo de apresentação: quem é, onde atua, principais linhas de pesquisa/prática — fotografia, geologia, arquivo, curadoria.]'),
    bloco('[Parágrafo de trajetória: formação, prêmios, exposições e publicações relevantes.]'),
    bloco('[Parágrafo final, se houver: representação, colaborações, contato profissional.]'),
  ], en: []},
})
console.log('home e bio criados (se já existiam, não foram sobrescritos)')
