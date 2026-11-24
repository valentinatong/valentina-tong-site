import {defineField, defineType} from 'sanity'

// Documento técnico (id "publicarSite"), mexido só pelo botão "Publicar site" da barra do Studio.
// O webhook "Publicar site" do Sanity só dispara quando ESTE documento muda: assim
// editar/reordenar muitos itens não gera dezenas de publicações na Vercel — uma por clique.
export const publicacao = defineType({
  name: 'publicacao',
  title: 'Publicação do site',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({name: 'pedidoEm', title: 'Último pedido de publicação', type: 'datetime'}),
    defineField({name: 'pedidoPor', title: 'Pedido por', type: 'string'}),
  ],
})
