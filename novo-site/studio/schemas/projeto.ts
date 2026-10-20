import {defineArrayMember, defineField, defineType} from 'sanity'
import {orderRankField} from '@sanity/orderable-document-list'
import {ImagesIcon} from '@sanity/icons/Images'
import {ImageIcon} from '@sanity/icons/Image'

const hex = (r: any) => r.regex(/^#?[0-9a-fA-F]{6}$/, {name: 'cor hex'}).warning('Use 6 dígitos, ex.: e1beda')

// Projeto do Portfólio = uma página (título e ano nas laterais, imagens em sequência, créditos no fim).
// Antes: tabelas Projetos + Imagens da base Portfólio no Airtable.
export const projeto = defineType({
  name: 'projeto',
  title: 'Projetos',
  type: 'document',
  icon: ImagesIcon,
  groups: [
    {name: 'info', title: 'Informações', default: true},
    {name: 'paginas', title: 'Imagens'},
    {name: 'visual', title: 'Cores e fonte'},
  ],
  fields: [
    orderRankField({type: 'projeto'}),
    defineField({name: 'nome', title: 'Nome', type: 'string', group: 'info', validation: (r) => r.required()}),
    defineField({
      name: 'slug', title: 'Endereço (slug)', type: 'slug', group: 'info',
      description: 'Parte do link: /projetos/pedras-marcadas. Gere a partir do nome.',
      options: {source: 'nome', maxLength: 60}, validation: (r) => r.required(),
    }),
    defineField({name: 'ano', title: 'Ano', type: 'string', description: 'Ex.: 2023–', group: 'info'}),
    defineField({name: 'abertura', title: 'Texto de abertura', type: 'textoRico', group: 'info'}),
    defineField({name: 'creditos', title: 'Créditos', type: 'textoRico', group: 'info'}),
    defineField({
      name: 'capa', title: 'Capa (índice de projetos)', type: 'image', options: {hotspot: true}, group: 'info',
      description: 'Opcional. Sem ela, o índice usa a primeira imagem.',
    }),
    defineField({
      name: 'paginas', title: 'Imagens', group: 'paginas',
      description: 'Na ordem da página. Arraste para reordenar. Legenda 2 só para dípticos (uma legenda para cada metade).',
      type: 'array', options: {layout: 'grid'},
      of: [defineArrayMember({
        type: 'image', name: 'pagina', title: 'Imagem', icon: ImageIcon,
        fields: [
          defineField({name: 'legenda', title: 'Legenda', type: 'textoRico'}),
          defineField({name: 'legenda2', title: 'Legenda 2 (metade direita do díptico)', type: 'textoRico'}),
        ],
      })],
    }),
    defineField({name: 'corFundo', title: 'Cor de fundo', type: 'string', group: 'visual', validation: hex}),
    defineField({name: 'corFonte', title: 'Cor do texto de abertura (opcional)', type: 'string', group: 'visual', validation: hex}),
    defineField({
      name: 'fonteTipo', title: 'Fonte do texto de abertura', type: 'string', group: 'visual',
      options: {list: ['Newsreader', 'Fraunces', 'Space Mono'], layout: 'radio', direction: 'horizontal'},
    }),
    defineField({name: 'fonteTamanho', title: 'Tamanho do texto de abertura (px)', type: 'number', group: 'visual'}),
  ],
  preview: {
    select: {title: 'nome', subtitle: 'ano', media: 'paginas.0'},
  },
})
