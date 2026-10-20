import {createClient} from '@sanity/client'
import {createImageUrlBuilder} from '@sanity/image-url'

// Leitura pública do dataset (o plano gratuito só tem datasets públicos).
// Usado SÓ no build: as páginas já saem prontas, as visitas não chamam a API.
export const client = createClient({projectId: 'b25l6bef', dataset: 'production', apiVersion: '2025-08-15', useCdn: false})

const builder = createImageUrlBuilder(client)
export const img = (fonte: any) => builder.image(fonte).auto('format')

export type Lang = 'pt' | 'en'
// campo PT/EN: EN cai para PT quando vazio
export const t = (campo: any, lang: Lang) => (campo && (campo[lang] || campo.pt)) || ''

export const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

// texto rico (blocos do Sanity) → HTML com negrito, itálico e links; parágrafos separados por <br>
export function rico(campo: any, lang: Lang, {paragrafos = false} = {}): string {
  const blocos = (campo && ((campo[lang] && campo[lang].length ? campo[lang] : campo.pt) || [])) || []
  const html = blocos.filter((b: any) => b._type === 'block').map((b: any) => {
    const defs = Object.fromEntries((b.markDefs || []).map((d: any) => [d._key, d]))
    return (b.children || []).map((s: any) => {
      let h = esc(s.text).replace(/\n/g, '<br>')
      for (const m of s.marks || []) {
        if (m === 'strong') h = `<strong>${h}</strong>`
        else if (m === 'em') h = `<em>${h}</em>`
        else if (defs[m]?.href) h = `<a href="${esc(defs[m].href)}" target="_blank" rel="noopener">${h}</a>`
      }
      return h
    }).join('')
  })
  return paragrafos ? html.map((p: string) => `<p>${p}</p>`).join('') : html.join('<br>')
}
export const temTexto = (campo: any) => !!(campo && ((campo.pt && campo.pt.length) || (campo.en && campo.en.length)))

// várias etiquetas viram "A, b e c" (só a 1ª com maiúscula, a não ser que já venha depois de outra frase)
export function frase(nomes: string[], lang: Lang, minuscula = false) {
  const n = nomes.filter(Boolean).map((x, i) => (i > 0 || minuscula ? x.charAt(0).toLocaleLowerCase() + x.slice(1) : x))
  return n.length < 2 ? n[0] || '' : n.slice(0, -1).join(', ') + (lang === 'en' ? ' and ' : ' e ') + n[n.length - 1]
}

export const youtubeId = (u: string) => (String(u || '').match(/(?:youtu\.be\/|[?&]v=|\/(?:shorts|embed|live)\/)([\w-]{11})/) || [])[1] || null

export async function configuracoes() {
  return (await client.fetch(`*[_id=="configuracoes"][0]`)) || {}
}
export const hex = (s: string, padrao: string) => (s ? '#' + String(s).trim().replace(/^#/, '') : padrao)
