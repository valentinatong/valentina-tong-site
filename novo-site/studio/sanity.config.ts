import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Valentina Tong',
  projectId: 'b25l6bef',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S, context) =>
        S.list()
          .title('Conteúdo')
          .items([
            // lista de curadoria ordenável arrastando (a ordem vira a ordem do site)
            orderableDocumentListDeskItem({type: 'projeto', title: 'Projetos', S, context}),
            orderableDocumentListDeskItem({type: 'fotograma', title: 'Atlas · Fotogramas', S, context}),
            S.listItem().title('Atlas · Lugares (mapa)').child(S.documentTypeList('lugar').title('Lugares')),
            orderableDocumentListDeskItem({type: 'curadoria', title: 'Curadoria', S, context}),
            S.listItem().title('Etiquetas (tipo e papel)').child(S.documentTypeList('etiqueta').title('Etiquetas')),
            S.divider(),
            S.listItem().title('Atlas · Configurações').id('configAtlas').child(S.document().schemaType('configAtlas').documentId('configAtlas')),
            S.listItem().title('Configurações').id('configuracoes').child(S.document().schemaType('configuracoes').documentId('configuracoes')),
          ]),
    }),
    visionTool(),
  ],
  schema: {types: schemaTypes},
})
