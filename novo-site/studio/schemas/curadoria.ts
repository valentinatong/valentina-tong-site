import {defineArrayMember, defineField, defineType} from 'sanity'
import {orderRankField} from '@sanity/orderable-document-list'
import {ImagesIcon} from '@sanity/icons/Images'
import {PinIcon} from '@sanity/icons/Pin'
import {PlayIcon} from '@sanity/icons/Play'
import {ImageIcon} from '@sanity/icons/Image'

// Um projeto de curadoria = uma linha da lista em curadoria.html.
// Sedes (itinerâncias) e galeria ficam DENTRO do projeto, na ordem em que aparecem.
export const curadoria = defineType({
  name: 'curadoria',
  title: 'Curadoria',
  type: 'document',
  icon: ImagesIcon,
  groups: [
    {name: 'info', title: 'Informações', default: true},
    {name: 'sedes', title: 'Sedes'},
    {name: 'galeria', title: 'Galeria'},
  ],
  fields: [
    orderRankField({type: 'curadoria'}),
    defineField({name: 'titulo', title: 'Título', type: 'textoCurto', group: 'info', validation: (r) => r.required()}),
    defineField({
      name: 'tipos',
      title: 'Tipo de projeto',
      description: 'Ex.: Exposição, Publicação. Aparece em negrito na lista.',
      type: 'array',
      group: 'info',
      of: [defineArrayMember({type: 'reference', to: [{type: 'etiqueta'}], options: {filter: 'grupo == "tipo"'}})],
    }),
    defineField({
      name: 'papeis',
      title: 'Papel',
      description: 'Ex.: Curadora assistente, Editora.',
      type: 'array',
      group: 'info',
      of: [defineArrayMember({type: 'reference', to: [{type: 'etiqueta'}], options: {filter: 'grupo == "papel"'}})],
    }),
    defineField({name: 'local', title: 'Local principal', type: 'string', group: 'info'}),
    defineField({name: 'ano', title: 'Ano', type: 'string', description: 'Ex.: 2018/19', group: 'info'}),
    defineField({name: 'link', title: 'Link oficial do local principal', type: 'url', group: 'info'}),
    defineField({name: 'texto', title: 'Texto de apresentação', type: 'textoRico', group: 'info'}),
    defineField({
      name: 'miniatura',
      title: 'Miniatura da lista',
      description: 'Opcional. Sem ela, o site usa a primeira imagem da galeria.',
      type: 'image',
      options: {hotspot: true},
      group: 'info',
    }),
    defineField({
      name: 'sedes',
      title: 'Itinerâncias (outras sedes)',
      description: 'Arraste para reordenar.',
      type: 'array',
      group: 'sedes',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'sede',
          icon: PinIcon,
          fields: [
            defineField({name: 'local', title: 'Local', type: 'string', validation: (r) => r.required()}),
            defineField({name: 'ano', title: 'Ano', type: 'string'}),
            defineField({name: 'link', title: 'Link oficial', type: 'url'}),
          ],
          preview: {select: {title: 'local', subtitle: 'ano'}},
        }),
      ],
    }),
    defineField({
      name: 'galeria',
      title: 'Galeria',
      description: 'Fotos e vídeos na ordem da fileira. Arraste para reordenar.',
      type: 'array',
      group: 'galeria',
      options: {layout: 'grid'},
      of: [
        defineArrayMember({
          type: 'image',
          name: 'foto',
          title: 'Foto',
          icon: ImageIcon,
          options: {hotspot: true},
          fields: [
            defineField({name: 'legenda', title: 'Legenda', type: 'textoRico'}),
            defineField({name: 'link', title: 'Link externo (a legenda vira link)', type: 'url'}),
          ],
        }),
        defineArrayMember({
          type: 'object',
          name: 'video',
          title: 'Vídeo do YouTube',
          icon: PlayIcon,
          fields: [
            defineField({name: 'url', title: 'Link do YouTube', type: 'url', validation: (r) => r.required()}),
            defineField({name: 'capa', title: 'Imagem de capa (opcional)', type: 'image', description: 'Sem ela, usa a miniatura do YouTube.'}),
            defineField({name: 'legenda', title: 'Legenda', type: 'textoRico'}),
            defineField({name: 'link', title: 'Link externo', type: 'url'}),
          ],
          preview: {select: {title: 'url', media: 'capa'}, prepare: ({title, media}) => ({title: 'Vídeo', subtitle: title, media: media || PlayIcon})},
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'titulo.pt', ano: 'ano', local: 'local', media: 'galeria.0'},
    prepare: ({title, ano, local, media}) => ({title, subtitle: [ano, local].filter(Boolean).join(' · '), media}),
  },
})
