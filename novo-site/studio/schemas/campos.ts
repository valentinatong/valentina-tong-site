import {defineField, defineType} from 'sanity'

// Campos reutilizados: texto curto em PT/EN e texto com negrito/itálico em PT/EN.

export const textoCurto = defineType({
  name: 'textoCurto',
  title: 'Texto curto PT/EN',
  type: 'object',
  options: {columns: 2},
  fields: [
    defineField({name: 'pt', title: 'PT', type: 'string'}),
    defineField({name: 'en', title: 'EN', type: 'string'}),
  ],
})

// só negrito, itálico e links — sem títulos, listas ou outros estilos
const blocoSimples = [
  {
    type: 'block',
    styles: [{title: 'Normal', value: 'normal'}],
    lists: [],
    marks: {
      decorators: [
        {title: 'Negrito', value: 'strong'},
        {title: 'Itálico', value: 'em'},
      ],
      annotations: [
        {name: 'link', type: 'object', title: 'Link', fields: [{name: 'href', type: 'url', title: 'Endereço'}]},
      ],
    },
  },
]

export const textoRico = defineType({
  name: 'textoRico',
  title: 'Texto PT/EN',
  type: 'object',
  fields: [
    defineField({name: 'pt', title: 'PT', type: 'array', of: blocoSimples}),
    defineField({name: 'en', title: 'EN', type: 'array', of: blocoSimples}),
  ],
})
