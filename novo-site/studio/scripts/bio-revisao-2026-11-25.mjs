// Revisão da Bio (25/11/2026): aspas curvas nas palestras, "Nova Iorque, Brasil" e telefone legível.
// Uma única transação = um único build na Vercel.
// Rodar: npx sanity exec scripts/bio-revisao-2026-11-25.mjs --with-user-token
import {getCliClient} from 'sanity/cli'
const client = getCliClient({apiVersion: '2025-01-01'})

const curvas = (t) => t.replace(/"([^"]*)"/g, '“$1”')
const trocas = (t) => curvas(t).replace('Nova York/Brasil', 'Nova Iorque, Brasil').replace('New York/Brazil', 'New York, Brazil')

const ids = ['bio', 'drafts.bio']
const tx = client.transaction()
let mudou = 0
for (const id of ids) {
  const doc = await client.getDocument(id)
  if (!doc) continue
  const sets = {}
  for (const lang of ['pt', 'en']) {
    for (const b of doc.texto?.[lang] || []) {
      for (const s of b.children || []) {
        if (typeof s.text !== 'string') continue
        const novo = trocas(s.text)
        if (novo !== s.text) sets[`texto.${lang}[_key=="${b._key}"].children[_key=="${s._key}"].text`] = novo
      }
    }
  }
  if (doc.telefone === '+5511987530664') sets.telefone = '+55 11 98753-0664'
  if (Object.keys(sets).length) {
    tx.patch(id, (p) => p.ifRevisionId(doc._rev).set(sets))
    mudou += Object.keys(sets).length
    console.log(id, Object.keys(sets))
  }
}
if (mudou) await tx.commit()
console.log(mudou ? `ok: ${mudou} campos alterados` : 'nada a alterar')
