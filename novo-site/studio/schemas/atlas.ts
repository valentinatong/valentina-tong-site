import {defineArrayMember, defineField, defineType} from 'sanity'
import {orderRankField} from '@sanity/orderable-document-list'
import {ImageIcon} from '@sanity/icons/Image'
import {PinIcon} from '@sanity/icons/Pin'
import {CogIcon} from '@sanity/icons/Cog'
import {TagIcon} from '@sanity/icons/Tag'
import {etiquetasInput, MunicipioInput} from '../components/EtiquetasInput'

const hex = (r: any) => r.regex(/^#?[0-9a-fA-F]{6}$/, {name: 'cor hex'}).warning('Use 6 dígitos, ex.: 080d63')

// Grupos de etiquetas do Atlas (cada um vira uma lista no Studio e um filtro no site)
export const GRUPOS_TAG = [
  {value: 'local', title: 'Locais', campo: 'locais', rotulo: 'Local'},
  {value: 'geologia', title: 'Geologia', campo: 'geologias', rotulo: 'Geologia'},
  {value: 'contexto', title: 'Contexto', campo: 'contextos', rotulo: 'Contexto'},
  {value: 'publicacao', title: 'Publicações', campo: 'publicacoes', rotulo: 'Publicação'},
  {value: 'exposicao', title: 'Exposições', campo: 'exposicoes', rotulo: 'Exposição'},
]

// Etiqueta do Atlas: item de uma lista fixa (Local, Geologia, Contexto, Publicação ou Exposição), com nome PT/EN.
// Mudar o nome aqui muda em todas as fotos que usam a etiqueta.
export const tagAtlas = defineType({
  name: 'tagAtlas',
  title: 'Etiquetas do Atlas',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({name: 'grupo', title: 'Lista', type: 'string', options: {list: GRUPOS_TAG.map(({value, title}) => ({value, title})), layout: 'radio', direction: 'horizontal'}, validation: (r) => r.required()}),
    defineField({name: 'nome', title: 'Nome', type: 'textoCurto', validation: (r) => r.required()}),
  ],
  orderings: [{title: 'Nome', name: 'nome', by: [{field: 'nome.pt', direction: 'asc'}]}],
  preview: {
    select: {pt: 'nome.pt', en: 'nome.en'},
    prepare: ({pt, en}) => ({title: pt, subtitle: en || 'falta EN'}),
  },
})

// Município (lista fixa, como as etiquetas): nome, estado e coordenadas do mapa. Os fotogramas escolhem o município
// (antes: tabela Mapa do Airtable, unida por nome — erros de digitação tiravam a foto do mapa).
export const lugar = defineType({
  name: 'lugar',
  title: 'Municípios',
  type: 'document',
  icon: PinIcon,
  fields: [
    defineField({name: 'municipio', title: 'Município', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'estado', title: 'Estado', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'lat', title: 'Latitude', type: 'number', description: 'Ex.: -6.459'}),
    defineField({name: 'lon', title: 'Longitude', type: 'number', description: 'Ex.: -37.097'}),
  ],
  orderings: [{title: 'Nome', name: 'municipio', by: [{field: 'municipio', direction: 'asc'}]}],
  preview: {select: {title: 'municipio', subtitle: 'estado', lat: 'lat'}, prepare: ({title, subtitle, lat}) => ({title, subtitle: `${subtitle}${lat == null ? ' · sem coordenadas' : ''}`})},
})

// Fotograma do Atlas Fotográfico (antes: tabela Fotogramas).
export const fotograma = defineType({
  name: 'fotograma',
  title: 'Fotogramas',
  type: 'document',
  icon: ImageIcon,
  fields: [
    orderRankField({type: 'fotograma'}),
    defineField({name: 'foto', title: 'Foto', type: 'image', options: {hotspot: true}, validation: (r) => r.required()}),
    defineField({name: 'codigo', title: 'Código (nome do arquivo)', type: 'string', description: 'Ex.: VT_SD_03_06', validation: (r) => r.required()}),
    defineField({name: 'projeto', title: 'Projeto', type: 'reference', to: [{type: 'projeto'}], description: 'Série a que a foto pertence (filtro do Atlas). Opcional.'}),
    defineField({name: 'lugar', title: 'Estado e município', type: 'reference', to: [{type: 'lugar'}], components: {input: MunicipioInput}, description: 'Escolha o estado, depois o município (ou crie um novo). As coordenadas definem a posição no mapa.'}),
    defineField({name: 'locais', title: 'Local', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'tagAtlas'}], options: {filter: 'grupo == \"local\"'}})], components: {input: etiquetasInput('local')}}),
    defineField({name: 'ano', title: 'Ano', type: 'string'}),
    defineField({name: 'geologias', title: 'Geologia', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'tagAtlas'}], options: {filter: 'grupo == \"geologia\"'}})], components: {input: etiquetasInput('geologia')}}),
    defineField({name: 'contextos', title: 'Contexto', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'tagAtlas'}], options: {filter: 'grupo == \"contexto\"'}})], components: {input: etiquetasInput('contexto')}}),
    defineField({name: 'publicacoes', title: 'Publicação', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'tagAtlas'}], options: {filter: 'grupo == \"publicacao\"'}})], components: {input: etiquetasInput('publicacao')}}),
    defineField({name: 'exposicoes', title: 'Exposição', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'tagAtlas'}], options: {filter: 'grupo == \"exposicao\"'}})], components: {input: etiquetasInput('exposicao')}}),
    defineField({name: 'publicado', title: 'Publicado no site', type: 'boolean', initialValue: true}),
  ],
  preview: {
    select: {title: 'codigo', municipio: 'lugar.municipio', ano: 'ano', media: 'foto', publicado: 'publicado'},
    prepare: ({title, municipio, ano, media, publicado}) => ({title, subtitle: [municipio, ano, publicado === false ? 'não publicado' : ''].filter(Boolean).join(' · '), media}),
  },
})

// Configuração da página do Atlas e do Mapa (antes: tabelas Configurações e Configuração de Campos).
export const configAtlas = defineType({
  name: 'configAtlas',
  title: 'Configurações do Atlas',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({name: 'corFundo', title: 'Cor de fundo', type: 'string', validation: hex}),
    defineField({name: 'corTag', title: 'Cor da tag (filtro)', type: 'string', validation: hex}),
    defineField({name: 'abertura', title: 'Texto de abertura do Atlas', type: 'textoRico'}),
    defineField({name: 'aberturaMapa', title: 'Texto de abertura do Mapa', type: 'textoRico'}),
    defineField({name: 'rotuloFiltro', title: 'Rótulo do filtro', type: 'textoCurto'}),
    defineField({name: 'rotuloTodos', title: 'Rótulo "Todos"', type: 'textoCurto'}),
    defineField({
      name: 'campos', title: 'Campos da ficha', description: 'O que aparece embaixo de cada foto, na ordem. Desmarque "Ativo" para esconder.',
      type: 'array',
      of: [defineArrayMember({
        type: 'object', name: 'campoFicha',
        fields: [
          defineField({name: 'campo', title: 'Campo', type: 'string', options: {list: ['Projeto', 'Estado', 'Município', 'Local', 'Ano', 'Geologia', 'Contexto', 'Publicação', 'Exposição']}}),
          defineField({name: 'rotulo', title: 'Rótulo', type: 'textoCurto'}),
          defineField({name: 'ativo', title: 'Ativo', type: 'boolean', initialValue: true}),
        ],
        preview: {select: {title: 'rotulo.pt', campo: 'campo', ativo: 'ativo'}, prepare: ({title, campo, ativo}) => ({title: title || campo, subtitle: ativo === false ? 'desativado' : campo})},
      })],
    }),
  ],
  preview: {prepare: () => ({title: 'Configurações do Atlas'})},
})
