import {useCallback, useEffect, useState} from 'react'
import {useClient, useCurrentUser, type NavbarProps} from 'sanity'
import {Button, Flex, Box} from '@sanity/ui'

// Botão "Publicar site" na barra do Studio.
// Clicar grava a hora em publicarSite → o webhook do Sanity chama a Vercel UMA vez.
// Mostra se há conteúdo publicado no Studio depois do último pedido (ainda não está no site).
const ID = 'publicarSite'
const CONTEUDO = `!(_type match "sanity.*") && _type != "publicacao" && !(_id in path("drafts.**"))`

export function PublicarSiteNavbar(props: NavbarProps) {
  return (
    <Flex align="center">
      <Box flex={1}>{props.renderDefault(props)}</Box>
      <Box paddingX={2}><PublicarSite /></Box>
    </Flex>
  )
}

function hora(iso?: string) {
  return iso ? new Date(iso).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) : ''
}

function PublicarSite() {
  const client = useClient({apiVersion: '2025-08-15'})
  const user = useCurrentUser()
  const [ultimo, setUltimo] = useState<string | undefined>()
  const [pendentes, setPendentes] = useState(0)
  const [estado, setEstado] = useState<'pronto' | 'enviando' | 'enviado' | 'erro'>('pronto')

  const confere = useCallback(async () => {
    const r = await client.fetch(
      `{"ultimo": *[_id == $id][0].pedidoEm, "n": count(*[${CONTEUDO} && _updatedAt > coalesce(*[_id == $id][0].pedidoEm, "1970-01-01")])}`,
      {id: ID},
    )
    setUltimo(r.ultimo)
    setPendentes(r.n)
  }, [client])

  useEffect(() => {
    confere().catch(() => {})
    // quando algo é publicado no Studio, marca que há alterações fora do site
    const sub = client
      .listen(`*[${CONTEUDO}]`, {}, {includeResult: false, visibility: 'query'})
      .subscribe(() => setPendentes((n) => Math.max(n, 1)))
    return () => sub.unsubscribe()
  }, [client, confere])

  const publicar = async () => {
    setEstado('enviando')
    try {
      const agora = new Date().toISOString()
      await client
        .transaction()
        .createIfNotExists({_id: ID, _type: 'publicacao'})
        .patch(ID, (p) => p.set({pedidoEm: agora, pedidoPor: user?.name || ''}))
        .commit()
      setUltimo(agora)
      setPendentes(0)
      setEstado('enviado')
    } catch {
      setEstado('erro')
    }
  }

  const dica =
    estado === 'enviado' ? 'Pedido enviado. O site atualiza em 3–5 minutos.'
    : estado === 'erro' ? 'Não deu certo. Tente de novo em instantes.'
    : pendentes ? 'Há alterações publicadas aqui que ainda não estão no site. Clique para atualizar o site (gasta 1 publicação).'
    : `O site está em dia${ultimo ? ` (última atualização pedida em ${hora(ultimo)})` : ''}.`

  return (
      <Button
        title={dica}
        text={estado === 'enviando' ? 'Enviando…' : estado === 'enviado' ? 'Enviado ✓' : pendentes ? 'Publicar site ●' : 'Publicar site'}
        tone={pendentes && estado !== 'enviado' ? 'primary' : 'default'}
        mode={pendentes && estado !== 'enviado' ? 'default' : 'ghost'}
        fontSize={1}
        padding={2}
        disabled={estado === 'enviando'}
        onClick={publicar}
      />
  )
}
