// Ficha catalográfica do fotograma: um campo por linha, rótulo à esquerda, linhas juntas
// com um fio entre elas (em vez do formulário padrão do Studio, com títulos e descrições espaçados).
import type {ReactNode} from 'react'
import {Box, Card, Flex, Text} from '@sanity/ui'
import {MemberField, type FieldProps, type ObjectInputProps} from 'sanity'

export function Linha({rotulo, children}: {rotulo: string; children: ReactNode}) {
  return (
    <Flex align="flex-start" gap={3} paddingY={2} paddingX={3} style={{borderBottom: '1px solid var(--card-border-color)'}}>
      <Box style={{width: 110, flex: 'none', paddingTop: 8}}><Text size={1} weight="medium" muted>{rotulo}</Text></Box>
      <Box flex={1} style={{minWidth: 0}}>{children}</Box>
    </Flex>
  )
}

// Campos que desenham as próprias linhas (Estado / Município / Coordenadas)
const SEM_LINHA = ['lugar']

function campo(p: FieldProps) {
  if (SEM_LINHA.includes(p.name)) return <>{p.children}</>
  const erro = p.validation?.find((v) => v.level === 'error')
  return (
    <Linha rotulo={p.title || p.name}>
      {p.name === 'foto' ? <div data-ficha-foto="">{p.children}</div> : p.children}
      {erro && <Box paddingTop={1}><Text size={0} style={{color: 'var(--card-badge-critical-dot-color, #e5484d)'}}>{erro.message}</Text></Box>}
    </Linha>
  )
}

export function FichaInput(props: ObjectInputProps) {
  return (
    <Card radius={2} border style={{overflow: 'visible'}}>
      {/* foto alinhada à esquerda (o Studio centraliza a imagem na caixa) */}
      <style>{'[data-ficha-foto] img{object-position:left center !important}'}</style>
      {props.members.map((m) => m.kind === 'field' && (
        <MemberField key={m.key} member={m} renderField={campo} renderInput={props.renderInput} renderItem={props.renderItem} renderPreview={props.renderPreview} />
      ))}
    </Card>
  )
}
