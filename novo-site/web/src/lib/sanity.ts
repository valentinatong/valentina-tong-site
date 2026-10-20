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

// texto claro ou escuro, o que tiver mais contraste (WCAG) com a cor de fundo
export function tintaPara(bg: string) {
  const n = parseInt(String(bg).replace('#', ''), 16)
  const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return (0.885 + 0.05) / (L + 0.05) > (L + 0.05) / (0.0118 + 0.05) ? 'claro' : 'escuro'
}

// lista de projetos (ordem, cor, capa) — usada no índice e na linha do tempo
export async function projetos() {
  return client.fetch(`*[_type=="projeto"] | order(orderRank) {nome, "slug": slug.current, ano, corFundo, capa, "primeira": paginas[0]}`)
}

// cores e fonte de um projeto, como variáveis CSS para a página inteira (fundo, texto, abertura)
export function coresProjeto(p: any): Record<string, string> {
  const bg = hex(p.corFundo, '#ebebeb')
  const escuro = tintaPara(bg) === 'claro'
  const fonte = p.corFonte ? hex(p.corFonte, '') : ''
  const FONTES: Record<string, string> = {Newsreader: 'var(--body-font)', Fraunces: 'var(--title-font)', 'Space Mono': 'var(--mono-font)'}
  const c: Record<string, string> = {
    '--bg': bg,
    '--ink': fonte || (escuro ? '#f4f1ea' : '#201D19'),
    '--stone': fonte ? `color-mix(in srgb, ${fonte} 65%, transparent)` : (escuro ? 'rgba(244,241,234,.7)' : '#86806F'),
  }
  if (p.fonteTipo && FONTES[p.fonteTipo]) c['--opening-font'] = FONTES[p.fonteTipo]
  if (p.fonteTamanho) c['--opening-size'] = `${p.fonteTamanho}px`
  if (fonte) c['--opening-color'] = fonte
  return c
}

// texto rico → texto simples (para filtros e etiquetas da ficha do Atlas)
export function simples(campo: any, lang: Lang): string {
  const blocos = (campo && ((campo[lang] && campo[lang].length ? campo[lang] : campo.pt) || [])) || []
  return blocos.filter((b: any) => b._type === 'block').map((b: any) => (b.children || []).map((c: any) => c.text).join('')).join('\n').trim()
}

// Dados do Atlas no MESMO formato da antiga /api/arquivo-fotos ({campos, fotos}),
// gerados no build — assim os filtros, a ficha e o mapa funcionam como antes.
export async function atlasDados(lang: Lang) {
  const [config, fotos] = await Promise.all([
    client.fetch(`*[_id=="configAtlas"][0]`),
    client.fetch(`*[_type=="fotograma" && publicado != false && defined(foto.asset)] | order(orderRank) {
      codigo, foto, ano,
      "locais": locais[]->nome, "geologias": geologias[]->nome, "contextos": contextos[]->nome,
      "publicacoes": publicacoes[]->nome, "exposicoes": exposicoes[]->nome,
      "projeto": projeto->nome, "municipio": lugar->municipio, "estado": lugar->estado, "lat": coalesce(coordenadas.lat, lugar->lat), "lon": coalesce(coordenadas.lng, lugar->lon)
    }`),
  ])
  const campos = ((config && config.campos) || []).filter((c: any) => c.ativo !== false && c.campo)
    .map((c: any, i: number) => ({campo: c.campo, rotulo: t(c.rotulo, lang) || c.campo, ordem: i}))
  const nomes = (l: any[]) => (l || []).filter(Boolean).map((n: any) => t(n, lang)).filter(Boolean)
  const itens = fotos.map((f: any) => {
    const valores: Record<string, any> = {
      'Projeto': f.projeto || '', 'Estado': f.estado || '', 'Município': f.municipio || '', 'Ano': f.ano || '',
      // etiquetas: cada uma é um item (filtro e ficha), no idioma da página (EN cai para PT)
      'Local': nomes(f.locais), 'Geologia': nomes(f.geologias), 'Contexto': nomes(f.contextos),
      'Publicação': nomes(f.publicacoes), 'Exposição': nomes(f.exposicoes),
    }
    return {
      code: f.codigo, projeto: f.projeto || '', valores,
      thumb: img(f.foto).width(480).height(480).url(),
      web: img(f.foto).width(1400).url(),
      estado: f.estado || '', municipio: f.municipio || '', lat: f.lat ?? null, lon: f.lon ?? null,
    }
  })
  return {config: config || {}, campos, fotos: itens}
}
