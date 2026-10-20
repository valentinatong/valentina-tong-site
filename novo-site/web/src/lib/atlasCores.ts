import {hex} from './sanity'
// cores do Atlas (fundo = painel da ficha; tag = filtro selecionado, com texto legível sobre ela)
export function coresAtlas(config: any): Record<string, string> {
  const bg = hex(config?.corFundo, '#080d63')
  const tag = hex(config?.corTag, '#EDEAE2')
  const n = parseInt(tag.replace('#', ''), 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return {'--bg': bg, '--panel': bg, '--tag-bg': tag, '--tag-fg': lum > 0.6 ? '#1a1815' : '#EDEAE2'}
}
