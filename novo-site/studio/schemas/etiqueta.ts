import {defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons/Tag'

// Etiquetas de "Tipo" (Exposição, Publicação…) e "Papel" (Curadora, Editora…), com nome em PT e EN.
// Criadas uma vez e reutilizadas em vários projetos; o site junta várias em "A, B e C".
export const etiqueta = defineType({
  name: 'etiqueta',
  title: 'Etiquetas',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'grupo',
      title: 'Grupo',
      type: 'string',
      options: {list: [{title: 'Tipo de projeto', value: 'tipo'}, {title: 'Papel', value: 'papel'}], layout: 'radio', direction: 'horizontal'},
      validation: (r) => r.required(),
    }),
    defineField({name: 'nome', title: 'Nome', type: 'textoCurto', validation: (r) => r.required()}),
  ],
  preview: {
    select: {pt: 'nome.pt', en: 'nome.en', grupo: 'grupo'},
    prepare: ({pt, en, grupo}) => ({title: pt, subtitle: `${grupo === 'papel' ? 'Papel' : 'Tipo'}${en ? ' · ' + en : ' · falta EN'}`}),
  },
})
