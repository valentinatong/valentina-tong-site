// Escolher a coordenada num mapa: busca um lugar (OpenStreetMap, via Photon / Nominatim), escolhe um resultado,
// ajusta arrastando o pin (ou clicando no mapa) e fixa. Mapa de fundo: OpenFreeMap (grátis, sem chave).
import {useEffect, useRef, useState} from 'react'
import type maplibregl from 'maplibre-gl'
import {Box, Button, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'

type Resultado = {nome: string; lat: number; lon: number}
const arred = (n: number) => Math.round(n * 1e6) / 1e6

export function MapaCoordenadas({lat, lon, busca, aviso, onFixar, readOnly}: {
  lat?: number; lon?: number; busca: string; aviso?: string; onFixar: (lat: number, lon: number) => Promise<void>; readOnly?: boolean
}) {
  const div = useRef<HTMLDivElement>(null)
  const mapa = useRef<maplibregl.Map | null>(null)
  const pin = useRef<maplibregl.Marker | null>(null)
  const salvo = lat != null && lon != null ? [arred(lon), arred(lat)] : null
  const [pos, setPos] = useState<number[] | null>(salvo)
  const [q, setQ] = useState(busca)
  const [res, setRes] = useState<Resultado[] | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    // carregado só quando o mapa abre (o deploy do Studio lê os schemas fora do navegador)
    let m: maplibregl.Map | undefined, vivo = true
    Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]).then(([{default: maplibregl}]) => {
    if (!vivo) return
    m = new maplibregl.Map({
      container: div.current!, style: 'https://tiles.openfreemap.org/styles/positron',
      center: (salvo as [number, number]) ?? [-47.9, -15.8], zoom: salvo ? 11 : 3.5, attributionControl: {compact: true},
    })
    m.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-right')
    const mk = new maplibregl.Marker({draggable: !readOnly, color: '#080d63'})
    mk.on('dragend', () => { const p = mk.getLngLat(); setPos([arred(p.lng), arred(p.lat)]) })
    if (salvo) mk.setLngLat(salvo as [number, number]).addTo(m)
    m.on('click', (e) => {
      if (readOnly) return
      mk.setLngLat(e.lngLat).addTo(m)
      setPos([arred(e.lngLat.lng), arred(e.lngLat.lat)])
    })
    mapa.current = m; pin.current = mk
    })
    return () => { vivo = false; m?.remove() }
  }, [])

  const ir = (r: Resultado) => {
    pin.current!.setLngLat([r.lon, r.lat]).addTo(mapa.current!)
    mapa.current!.flyTo({center: [r.lon, r.lat], zoom: 13})
    setPos([arred(r.lon), arred(r.lat)]); setRes(null)
  }
  const buscar = async () => {
    if (!q.trim()) return
    setOcupado(true)
    try {
      // Photon (aceita nomes aproximados), limitado ao Brasil; se não achar nada, tenta o Nominatim
      const termo = encodeURIComponent(q.trim())
      const ph = await (await fetch(`https://photon.komoot.io/api/?limit=8&bbox=-74,-34,-34,6&q=${termo}`)).json()
      let lista: Resultado[] = ph.features.map((f: any) => {
        const p = f.properties
        return {nome: [p.name, p.city || p.county, p.state].filter(Boolean).filter((x: string, i: number, a: string[]) => a.indexOf(x) === i).join(' · '), lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1]}
      })
      if (!lista.length) {
        const nm = await (await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=br&limit=6&accept-language=pt-BR&q=${termo}`)).json()
        lista = nm.map((d: any) => ({nome: d.display_name, lat: +d.lat, lon: +d.lon}))
      }
      setRes(lista)
    } catch { setRes([]) } finally { setOcupado(false) }
  }
  const mudou = !!pos && (!salvo || pos[0] !== salvo[0] || pos[1] !== salvo[1])
  const fixar = async () => { if (!pos) return; setOcupado(true); try { await onFixar(pos[1], pos[0]) } finally { setOcupado(false) } }

  return (
    <Stack gap={2}>
      {!readOnly && (
        <Flex gap={2}>
          <Box flex={1}>
            <TextInput fontSize={1} value={q} placeholder="Buscar um lugar…" onChange={(e) => setQ(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscar() } }} />
          </Box>
          <Button fontSize={1} mode="ghost" text="Buscar" onClick={buscar} disabled={ocupado} />
        </Flex>
      )}
      {res && (
        <Card radius={2} border padding={1} style={{maxHeight: 200, overflowY: 'auto'}}>
          <Stack gap={1}>
            {res.length === 0 && <Box padding={2}><Text size={1} muted>Nada encontrado. Tente outro nome, ou clique no mapa.</Text></Box>}
            {res.map((r, i) => <Button key={i} mode="bleed" justify="flex-start" fontSize={1} padding={2} text={r.nome} onClick={() => ir(r)} />)}
          </Stack>
        </Card>
      )}
      <div ref={div} style={{height: 320, borderRadius: 4, overflow: 'hidden'}} />
      <Flex gap={2} align="center" wrap="wrap">
        <Text size={1} muted>{pos ? `${pos[1]}, ${pos[0]}` : 'Sem ponto: busque um lugar ou clique no mapa.'}</Text>
        {!readOnly && <Button fontSize={1} tone="positive" text={mudou ? 'Fixar coordenada' : 'Coordenada fixada'} disabled={!mudou || ocupado} onClick={fixar} />}
      </Flex>
      {!readOnly && <Text size={0} muted>Arraste o pin ou clique no mapa para ajustar. {aviso}</Text>}
    </Stack>
  )
}
