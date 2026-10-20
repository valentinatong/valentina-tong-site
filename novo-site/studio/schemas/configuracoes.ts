import {defineField, defineType} from 'sanity'
import {CogIcon} from '@sanity/icons/Cog'

const hex = (r: any) => r.regex(/^#?[0-9a-fA-F]{6}$/, {name: 'cor hex'}).warning('Use 6 dígitos, ex.: dfffcb')

// Documento único com as cores da página de Curadoria (antes: tabela Configurações do Airtable).
export const configuracoes = defineType({
  name: 'configuracoes',
  title: 'Configurações da Curadoria',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({name: 'corFundoCuradoria', title: 'Curadoria · cor de fundo da página', type: 'string', validation: hex}),
    defineField({name: 'corLegendaCuradoria', title: 'Curadoria · cor da caixa da legenda', type: 'string', validation: hex}),
    defineField({name: 'corImagemCuradoria', title: 'Curadoria · cor atrás de imagens transparentes', type: 'string', validation: hex}),
  ],
  preview: {prepare: () => ({title: 'Configurações da Curadoria'})},
})
