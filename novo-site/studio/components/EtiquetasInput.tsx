// Campos de etiqueta do fotograma, editados na própria ficha (sem abrir outra janela):
// digita, escolhe da lista ou cria na hora com Enter. Os itens continuam sendo listas fixas
// (tagAtlas / lugar), editáveis nas pastas do Atlas.
import {useCallback, useEffect, useMemo, useState} from 'react'
import {Box, Button, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'
import {insert, set, setIfMissing, unset, useClient, type ArrayOfObjectsInputProps, type ObjectInputProps} from 'sanity'

const API = {apiVersion: '2025-01-01'}
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const chave = () => Math.random().toString(36).slice(2, 14)

type Item = {_id: string; nome: string; detalhe?: string}

// Chip de um item escolhido, com × para tirar
function Chip({texto, aviso, onRemover, readOnly}: {texto: string; aviso?: string; onRemover: () => void; readOnly?: boolean}) {
  return (
    <Card radius={2} padding={1} paddingLeft={2} tone={aviso ? 'caution' : 'primary'} border>
      <Flex align="center" gap={1}>
        <Text size={1}>{texto}</Text>
        {aviso && <Text size={0} muted>· {aviso}</Text>}
        {!readOnly && <Button mode="bleed" padding={1} fontSize={1} text="×" onClick={onRemover} aria-label={`Tirar ${texto}`} />}
      </Flex>
    </Card>
  )
}

// Caixa de digitar com sugestões; Enter escolhe a primeira sugestão ou cria o texto digitado
function Busca({itens, escolhidos, onEscolher, onCriar, placeholder, readOnly}: {
  itens: Item[]; escolhidos: string[]; onEscolher: (id: string) => void; onCriar: (nome: string) => void; placeholder: string; readOnly?: boolean
}) {
  const [q, setQ] = useState('')
  const termo = q.trim()
  const sugestoes = useMemo(() => {
    if (!termo) return []
    return itens.filter((i) => !escolhidos.includes(i._id) && sem(i.nome).includes(sem(termo))).slice(0, 8)
  }, [itens, escolhidos, termo])
  const exato = itens.find((i) => sem(i.nome) === sem(termo))
  const escolher = (id: string) => { onEscolher(id); setQ('') }
  const criar = () => { onCriar(termo); setQ('') }
  return (
    <Stack gap={1}>
      <TextInput
        value={q} placeholder={placeholder} readOnly={readOnly} fontSize={1}
        onChange={(e) => setQ(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !termo) return
          e.preventDefault()
          if (exato) escolher(exato._id)
          else if (sugestoes.length === 1) escolher(sugestoes[0]._id)
          else criar()
        }}
      />
      {termo && (
        <Card radius={2} border padding={1}>
          <Stack gap={1}>
            {sugestoes.map((i) => (
              <Button key={i._id} mode="bleed" justify="flex-start" fontSize={1} padding={2} text={i.detalhe ? `${i.nome} · ${i.detalhe}` : i.nome} onClick={() => escolher(i._id)} />
            ))}
            {!exato && <Button mode="ghost" tone="positive" justify="flex-start" fontSize={1} padding={2} text={`+ Criar “${termo}”`} onClick={criar} />}
          </Stack>
        </Card>
      )}
    </Stack>
  )
}

// Local, Geologia, Contexto, Publicação, Exposição (array de referências a tagAtlas de um grupo)
export function etiquetasInput(grupo: string) {
  return function EtiquetasInput(props: ArrayOfObjectsInputProps) {
    const client = useClient(API)
    const [itens, setItens] = useState<Item[]>([])
    const carregar = useCallback(() => client.fetch<Item[]>(`*[_type=="tagAtlas" && grupo==$g && !(_id in path("drafts.**"))]{_id, "nome": nome.pt} | order(nome asc)`, {g: grupo}).then(setItens), [client])
    useEffect(() => { carregar() }, [carregar])
    const valor = (props.value || []) as {_key: string; _ref: string}[]
    const nomeDe = (id: string) => itens.find((i) => i._id === id)?.nome || '…'
    const adicionar = (id: string) => {
      if (valor.some((v) => v._ref === id)) return
      props.onChange([setIfMissing([]), insert([{_type: 'reference', _ref: id, _key: chave()}], 'after', [-1])])
    }
    const criar = async (nome: string) => {
      const id = `tagatlas-${grupo}-${slug(nome)}`
      await client.createIfNotExists({_id: id, _type: 'tagAtlas', grupo, nome: {_type: 'textoCurto', pt: nome, en: ''}})
      await carregar()
      adicionar(id)
    }
    return (
      <Stack gap={2}>
        {valor.length > 0 && (
          <Flex gap={2} wrap="wrap">
            {valor.map((v) => <Chip key={v._key} texto={nomeDe(v._ref)} readOnly={props.readOnly} onRemover={() => props.onChange(unset([{_key: v._key}]))} />)}
          </Flex>
        )}
        <Busca itens={itens} escolhidos={valor.map((v) => v._ref)} onEscolher={adicionar} onCriar={criar} placeholder="Digite para escolher ou criar (Enter)" readOnly={props.readOnly} />
      </Stack>
    )
  }
}

// Município (uma referência a lugar). Ao criar, pede o estado; latitude/longitude ficam na própria ficha.
type Lugar = Item & {estado?: string; lat?: number; lon?: number}
export function MunicipioInput(props: ObjectInputProps) {
  const client = useClient(API)
  const [itens, setItens] = useState<Lugar[]>([])
  const [novo, setNovo] = useState<string | null>(null)
  const [estado, setEstado] = useState('')
  const carregar = useCallback(() => client.fetch<Lugar[]>(`*[_type=="lugar" && !(_id in path("drafts.**"))]{_id, "nome": municipio, "detalhe": estado, estado, lat, lon} | order(nome asc)`).then(setItens), [client])
  useEffect(() => { carregar() }, [carregar])
  const ref = (props.value as any)?._ref as string | undefined
  const atual = itens.find((i) => i._id === ref)
  const escolher = (id: string) => props.onChange(set({_type: 'reference', _ref: id}))
  const estados = useMemo(() => [...new Set(itens.map((i) => i.estado).filter(Boolean))].sort() as string[], [itens])
  const criar = async () => {
    if (!novo || !estado.trim()) return
    const id = `lugar-${slug(`${novo}-${estado}`)}`
    await client.createIfNotExists({_id: id, _type: 'lugar', municipio: novo, estado: estado.trim()})
    await carregar()
    escolher(id); setNovo(null); setEstado('')
  }
  const coord = async (campo: 'lat' | 'lon', txt: string) => {
    if (!atual) return
    const n = parseFloat(txt.replace(',', '.'))
    await (Number.isFinite(n) ? client.patch(atual._id).set({[campo]: n}) : client.patch(atual._id).unset([campo])).commit()
    carregar()
  }
  return (
    <Stack gap={2}>
      {ref ? (
        <Stack gap={2}>
          <Flex>
            <Chip texto={atual ? `${atual.nome} · ${atual.estado || 'sem estado'}` : '…'} aviso={atual && (atual.lat == null || atual.lon == null) ? 'sem coordenadas, fora do mapa' : undefined} readOnly={props.readOnly} onRemover={() => props.onChange(unset())} />
          </Flex>
          {atual && (
            <Flex gap={2} align="center">
              <Text size={1} muted>Latitude</Text>
              <Box style={{width: 130}}><TextInput key={`lat-${atual._id}`} fontSize={1} defaultValue={atual.lat ?? ''} placeholder="-6.459" readOnly={props.readOnly} onBlur={(e) => coord('lat', e.currentTarget.value)} /></Box>
              <Text size={1} muted>Longitude</Text>
              <Box style={{width: 130}}><TextInput key={`lon-${atual._id}`} fontSize={1} defaultValue={atual.lon ?? ''} placeholder="-37.097" readOnly={props.readOnly} onBlur={(e) => coord('lon', e.currentTarget.value)} /></Box>
            </Flex>
          )}
        </Stack>
      ) : novo ? (
        <Card radius={2} border padding={3} tone="positive">
          <Stack gap={3}>
            <Text size={1}>Novo município: <strong>{novo}</strong></Text>
            <TextInput fontSize={1} value={estado} placeholder="Estado (ex.: Bahia)" list="estados-atlas" autoFocus
              onChange={(e) => setEstado(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); criar() } }} />
            <datalist id="estados-atlas">{estados.map((e) => <option key={e} value={e} />)}</datalist>
            <Flex gap={2}>
              <Button tone="positive" fontSize={1} text="Criar" disabled={!estado.trim()} onClick={criar} />
              <Button mode="bleed" fontSize={1} text="Cancelar" onClick={() => { setNovo(null); setEstado('') }} />
            </Flex>
          </Stack>
        </Card>
      ) : (
        <Busca itens={itens} escolhidos={[]} onEscolher={escolher} onCriar={(n) => setNovo(n)} placeholder="Digite o município para escolher ou criar (Enter)" readOnly={props.readOnly} />
      )}
    </Stack>
  )
}
