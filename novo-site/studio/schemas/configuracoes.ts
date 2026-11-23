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
    defineField({name: 'aberturaCuradoria', title: 'Curadoria · texto de abertura', description: 'Aparece acima da lista, abaixo do menu. De 3 a 5 frases.', type: 'textoRico'}),
    defineField({name: 'tamanhoAberturaCuradoria', title: 'Curadoria · tamanho da fonte do texto de abertura (px)', description: 'Padrão: 17', type: 'number', initialValue: 17, validation: (r) => r.min(10).max(40)}),
  ],
  preview: {prepare: () => ({title: 'Configurações da Curadoria'})},
})

// Documento único com ajustes que valem para todas as páginas de projeto.
export const configProjetos = defineType({
  name: 'configProjetos',
  title: 'Configurações dos Projetos',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({name: 'tamanhoTitulo', title: 'Tamanho do título na lateral esquerda (px)', description: 'Vale para todos os projetos. Atual: 14', type: 'number', initialValue: 14, validation: (r) => r.min(8).max(60)}),
    defineField({name: 'tamanhoAno', title: 'Tamanho do ano na lateral direita (px)', description: 'Vale para todos os projetos. Atual: 14', type: 'number', initialValue: 14, validation: (r) => r.min(8).max(60)}),
  ],
  preview: {prepare: () => ({title: 'Configurações dos Projetos'})},
})
