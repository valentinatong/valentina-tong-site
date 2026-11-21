// Recorte para celular das páginas com UMA foto só.
// As páginas são pranchas 2400×1350 com a foto no meio e margem (transparente ou da cor de fundo) em volta.
// No celular, a prancha inteira deixa a foto pequena; aqui achamos onde está a foto e devolvemos um
// recorte (x, y, w, h) em que ela ocupa ~75% da largura. Dípticos (foto ocupando quase toda a largura)
// voltam null e seguem com a prancha inteira. Roda só no build; se algo falhar, também volta null.
import {img} from './sanity'

const cache = new Map<string, [number, number, number, number] | null>()
let sharpMod: any

// caixa justa da foto dentro da prancha (x, y, w, h em pixels da imagem original), sem margem
export async function caixaFoto(g: any, bgHex: string): Promise<[number, number, number, number] | null> {
  const ref: string = g?.asset?._ref || ''
  const chave = 'cx' + ref + bgHex
  if (cache.has(chave)) return cache.get(chave)!
  let r: [number, number, number, number] | null = null
  try {
    const m = ref.match(/-(\d+)x(\d+)-/); if (!m) throw 0
    const W = +m[1], H = +m[2]
    sharpMod ??= (await import('sharp')).default
    const buf = Buffer.from(await (await fetch(img(g).width(300).format('png').url())).arrayBuffer())
    const {data, info} = await sharpMod(buf).ensureAlpha().raw().toBuffer({resolveWithObject: true})
    const n = parseInt(bgHex, 16), br = n >> 16 & 255, bgG = n >> 8 & 255, bb = n & 255
    let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const o = (y * info.width + x) * 4
      if (data[o + 3] < 128) continue
      if (Math.abs(data[o] - br) + Math.abs(data[o + 1] - bgG) + Math.abs(data[o + 2] - bb) < 24) continue
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
    }
    if (x1 < 0) throw 0
    const k = W / info.width
    const H0 = +m[2]
    const rx = Math.max(0, Math.round(x0 * k)), ry = Math.max(0, Math.round(y0 * k))
    r = [rx, ry, Math.min(W - rx, Math.round((x1 - x0 + 1) * k)), Math.min(H0 - ry, Math.round((y1 - y0 + 1) * k))]
  } catch { r = null }
  cache.set(chave, r)
  return r
}

export async function recorteCelular(g: any, bgHex: string): Promise<[number, number, number, number] | null> {
  const ref: string = g?.asset?._ref || ''
  const chave = ref + bgHex
  if (cache.has(chave)) return cache.get(chave)!
  let r: [number, number, number, number] | null = null
  try {
    const m = ref.match(/-(\d+)x(\d+)-/); if (!m) throw 0
    const W = +m[1], H = +m[2]
    const cx0 = await caixaFoto(g, bgHex); if (!cx0) throw 0
    const [bx, by, bw, bh] = cx0
    if (bw > W * 0.62) throw 0                       // díptico / foto larga: fica como está
    const cw = Math.min(W, bw / 0.75), ch = Math.min(H, bh + H * 0.04)
    const cx = Math.max(0, Math.min(W - cw, bx + bw / 2 - cw / 2))
    const cy = Math.max(0, Math.min(H - ch, by + bh / 2 - ch / 2))
    r = [Math.round(cx), Math.round(cy), Math.round(cw), Math.round(ch)]
  } catch { r = null }
  cache.set(chave, r)
  return r
}
