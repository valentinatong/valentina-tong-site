// Campos de etiqueta do fotograma, editados na própria ficha (sem abrir outra janela):
// clica para ver a lista, digita para filtrar, escolhe ou cria na hora com Enter.
// Os itens continuam sendo listas fixas (tagAtlas / lugar), editáveis nas pastas do Atlas.
import {useCallback, useEffect, useMemo, useState} from 'react'
import {Box, Button, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'
import {Linha} from './Ficha'
import {insert, set, setIfMissing, unset, useClient, type ArrayOfObjectsInputProps, type ObjectInputProps} from 'sanity'

const API = {apiVersion: '2025-01-01'}
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const chave = () => Math.random().toString(36).slice(2, 14)

type Item = {_id: string; nome: string; detalhe?: string}

// Plaquinha de um item escolhido, com × para tirar
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

// Caixa com a lista: abre ao clicar, filtra ao digitar; Enter escolhe o item igual (ou único) ou cria o texto digitado
function Busca({itens, escolhidos, onEscolher, onCriar, placeholder, readOnly, criarRotulo = 'Criar'}: {
  itens: Item[]; escolhidos: string[]; onEscolher: (id: string) => void; onCriar?: (nome: string) => void
  placeholder: string; readOnly?: boolean; criarRotulo?: string
}) {
  const [q, setQ] = useState('')
  const [aberta, setAberta] = useState(false)
  const termo = q.trim()
  const sugestoes = useMemo(
    () => itens.filter((i) => !escolhidos.includes(i._id) && (!termo || sem(i.nome).includes(sem(termo)))),
    [itens, escolhidos, termo],
  )
  const exato = termo ? itens.find((i) => sem(i.nome) === sem(termo)) : undefined
  const escolher = (id: string) => { onEscolher(id); setQ('') }
  const podeCriar = !!onCriar && !!termo && !exato
  const criar = () => { onCriar?.(termo); setQ(''); setAberta(false) }
  // onMouseDown + preventDefault: o clique na lista não tira o foco da caixa antes de escolher
  const segura = (e: React.MouseEvent) => e.preventDefault()
  return (
    <Stack gap={1}>
      <TextInput
        value={q} placeholder={placeholder} readOnly={readOnly} fontSize={1}
        onFocus={() => setAberta(true)} onClick={() => setAberta(true)} onBlur={() => setAberta(false)}
        onChange={(e) => { setQ(e.currentTarget.value); setAberta(true) }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setAberta(false); return }
          if (e.key !== 'Enter' || !termo) return
          e.preventDefault()
          if (exato) escolher(exato._id)
          else if (sugestoes.length === 1) escolher(sugestoes[0]._id)
          else if (podeCriar) criar()
        }}
      />
      {aberta && !readOnly && (sugestoes.length > 0 || podeCriar) && (
        <Card radius={2} border padding={1} shadow={1} style={{maxHeight: 260, overflowY: 'auto'}} onMouseDown={segura}>
          <Stack gap={1}>
            {podeCriar && <Button mode="ghost" tone="positive" justify="flex-start" fontSize={1} padding={2} text={`+ ${criarRotulo} “${termo}”`} onClick={criar} />}
            {sugestoes.map((i) => (
              <Button key={i._id} mode="bleed" justify="flex-start" fontSize={1} padding={2} text={i.detalhe ? `${i.nome} · ${i.detalhe}` : i.nome} onClick={() => escolher(i._id)} />
            ))}
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
        <Busca itens={itens} escolhidos={valor.map((v) => v._ref)} onEscolher={adicionar} onCriar={criar} placeholder="Escolher ou criar…" readOnly={props.readOnly} />
      </Stack>
    )
  }
}

// Projeto (uma referência a projeto): só escolhe da lista; projetos novos são criados na pasta Projetos
export function ProjetoInput(props: ObjectInputProps) {
  const client = useClient(API)
  const [itens, setItens] = useState<Item[]>([])
  useEffect(() => { client.fetch<Item[]>(`*[_type=="projeto" && !(_id in path("drafts.**"))]{_id, nome} | order(nome asc)`).then(setItens) }, [client])
  const ref = (props.value as any)?._ref as string | undefined
  if (ref) return <Flex><Chip texto={itens.find((i) => i._id === ref)?.nome || '…'} readOnly={props.readOnly} onRemover={() => props.onChange(unset())} /></Flex>
  return <Busca itens={itens} escolhidos={[]} onEscolher={(id) => props.onChange(set({_type: 'reference', _ref: id}))} placeholder="Escolher…" readOnly={props.readOnly} />
}

// Estado + Município + coordenadas (uma referência a lugar). O estado filtra a lista de municípios
// e é usado ao criar um município novo; latitude/longitude ficam na própria ficha.
type Lugar = Item & {estado?: string; lat?: number; lon?: number}

export function MunicipioInput(props: ObjectInputProps) {
  const client = useClient(API)
  const [itens, setItens] = useState<Lugar[]>([])
  const [estadoLivre, setEstadoLivre] = useState('')
  const carregar = useCallback(() => client.fetch<Lugar[]>(`*[_type=="lugar" && !(_id in path("drafts.**"))]{_id, "nome": municipio, "detalhe": estado, estado, lat, lon} | order(nome asc)`).then(setItens), [client])
  useEffect(() => { carregar() }, [carregar])
  const ref = (props.value as any)?._ref as string | undefined
  const atual = itens.find((i) => i._id === ref)
  const estado = atual?.estado || estadoLivre
  const estados: Item[] = useMemo(() => [...new Set(itens.map((i) => i.estado).filter(Boolean) as string[])].sort().map((e) => ({_id: e, nome: e})), [itens])
  const municipios = useMemo(() => itens.filter((i) => !estado || i.estado === estado).map((i) => (estado ? {...i, detalhe: undefined} : i)), [itens, estado])
  const escolher = (id: string) => props.onChange(set({_type: 'reference', _ref: id}))
  const tirarEstado = () => { setEstadoLivre(''); if (ref) props.onChange(unset()) }
  const criar = async (nome: string) => {
    const id = `lugar-${slug(`${nome}-${estado}`)}`
    await client.createIfNotExists({_id: id, _type: 'lugar', municipio: nome, estado})
    await carregar()
    escolher(id)
  }
  const coord = async (campo: 'lat' | 'lon', txt: string) => {
    if (!atual) return
    const n = parseFloat(txt.replace(',', '.'))
    await (Number.isFinite(n) ? client.patch(atual._id).set({[campo]: n}) : client.patch(atual._id).unset([campo])).commit()
    carregar()
  }
  return (
    <>
      <Linha rotulo="Estado">
        {estado
          ? <Flex><Chip texto={estado} readOnly={props.readOnly} onRemover={tirarEstado} /></Flex>
          : <Busca itens={estados} escolhidos={[]} onEscolher={setEstadoLivre} onCriar={setEstadoLivre} criarRotulo="Usar" placeholder="Escolher ou criar…" readOnly={props.readOnly} />}
      </Linha>
      <Linha rotulo="Município">
        {ref ? (
          <Flex>
            <Chip texto={atual?.nome || '…'} aviso={atual && (atual.lat == null || atual.lon == null) ? 'sem coordenadas, fora do mapa' : undefined} readOnly={props.readOnly} onRemover={() => props.onChange(unset())} />
          </Flex>
        ) : estado ? (
          <Busca itens={municipios} escolhidos={[]} onEscolher={escolher} onCriar={criar} placeholder="Escolher ou criar…" readOnly={props.readOnly} />
        ) : (
          <Box paddingTop={2}><Text size={1} muted>Escolha o estado primeiro.</Text></Box>
        )}
      </Linha>
      {atual && (
        <Linha rotulo="Coordenadas">
          <Flex gap={2} align="center">
            <Box style={{width: 120}}><TextInput key={`lat-${atual._id}`} fontSize={1} defaultValue={atual.lat ?? ''} placeholder="lat -6.459" readOnly={props.readOnly} onBlur={(e) => coord('lat', e.currentTarget.value)} /></Box>
            <Box style={{width: 120}}><TextInput key={`lon-${atual._id}`} fontSize={1} defaultValue={atual.lon ?? ''} placeholder="lon -37.097" readOnly={props.readOnly} onBlur={(e) => coord('lon', e.currentTarget.value)} /></Box>
          </Flex>
        </Linha>
      )}
    </>
  )
}
