import {defineField, defineType} from 'sanity'
import {HomeIcon} from '@sanity/icons/Home'
import {UserIcon} from '@sanity/icons/User'

// Home: foto de capa em tela cheia com o menu no centro (antes: base "Home", tabela Capa, linha "Ativa").
export const home = defineType({
  name: 'home',
  title: 'Home',
  type: 'document',
  icon: HomeIcon,
  fields: [
    defineField({
      name: 'foto', title: 'Foto de capa', type: 'image', options: {hotspot: true},
      description: 'Ocupa a tela inteira. Marque o ponto de interesse para o corte em telas estreitas (celular).',
    }),
  ],
  preview: {select: {media: 'foto'}, prepare: ({media}) => ({title: 'Home', media})},
})

// Bio: nome, texto em PT/EN e contato.
export const bio = defineType({
  name: 'bio',
  title: 'Bio',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'nome', title: 'Nome', type: 'string', initialValue: 'Valentina Tong'}),
    defineField({name: 'texto', title: 'Texto', type: 'textoRico'}),
    defineField({name: 'email', title: 'E-mail de contato', type: 'string', initialValue: 'tongvalentina@gmail.com'}),
  ],
  preview: {prepare: () => ({title: 'Bio'})},
})
