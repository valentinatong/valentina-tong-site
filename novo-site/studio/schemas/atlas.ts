import {defineArrayMember, defineField, defineType} from 'sanity'
import {orderRankField} from '@sanity/orderable-document-list'
import {ImageIcon} from '@sanity/icons/Image'
import {PinIcon} from '@sanity/icons/Pin'
import {CogIcon} from '@sanity/icons/Cog'

const hex = (r: any) => r.regex(/^#?[0-9a-fA-F]{6}$/, {name: 'cor hex'}).warning('Use 6 dígitos, ex.: 080d63')

// Lugar do mapa: um município com coordenadas. Os fotogramas escolhem o lugar
// (antes: tabela Mapa do Airtable, unida por nome — erros de digitação tiravam a foto do mapa).
export const lugar = defineType({
  name: 'lugar',
  title: 'Lugares (mapa)',
  type: 'document',
  icon: PinIcon,
  fields: [
    defineField({name: 'municipio', title: 'Município', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'estado', title: 'Estado', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'lat', title: 'Latitude', type: 'number', description: 'Ex.: -6.459'}),
    defineField({name: 'lon', title: 'Longitude', type: 'number', description: 'Ex.: -37.097'}),
  ],
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
    defineField({name: 'codigo', title: 'Código (nome do arquivo)', type: 'string', description: 'Ex.: VT_SD_03_06', validation: (r) => r.required()}),
    defineField({name: 'foto', title: 'Foto', type: 'image', options: {hotspot: true}, validation: (r) => r.required()}),
    defineField({name: 'publicado', title: 'Publicado no site', type: 'boolean', initialValue: true}),
    defineField({name: 'projeto', title: 'Projeto', type: 'reference', to: [{type: 'projeto'}], description: 'Série a que a foto pertence (filtro do Atlas). Opcional.'}),
    defineField({name: 'lugar', title: 'Lugar (município)', type: 'reference', to: [{type: 'lugar'}], description: 'Define estado, município e a posição no mapa.'}),
    defineField({name: 'local', title: 'Local', type: 'string', description: 'Ex.: Viaduto 13'}),
    defineField({name: 'ano', title: 'Ano', type: 'string'}),
    defineField({name: 'geologia', title: 'Geologia', type: 'textoRico'}),
    defineField({name: 'contexto', title: 'Contexto', type: 'textoRico'}),
    defineField({name: 'publicacoes', title: 'Publicação', type: 'array', of: [defineArrayMember({type: 'string'})], options: {layout: 'tags'}}),
    defineField({name: 'exposicoes', title: 'Exposição', type: 'array', of: [defineArrayMember({type: 'string'})], options: {layout: 'tags'}}),
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
