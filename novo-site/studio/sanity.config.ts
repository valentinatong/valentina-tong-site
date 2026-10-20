import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Valentina Tong',
  projectId: 'b25l6bef',
  dataset: 'production',
  plugins: [
    structureTool({
      // Cada seção do site é uma pasta, com o conteúdo e as configurações dela dentro.
      structure: (S, context) => {
        const unico = (titulo: string, tipo: string, id: string) =>
          S.listItem().title(titulo).id(id).child(S.document().schemaType(tipo).documentId(id).title(titulo))
        return S.list()
          .title('Site')
          .items([
            unico('Home', 'home', 'home'),
            S.divider(),
            // listas ordenáveis: arrastar muda a ordem no site
            orderableDocumentListDeskItem({type: 'projeto', title: 'Projetos', S, context}),
            S.listItem().title('Atlas Fotográfico').id('pasta-atlas').child(
              S.list().title('Atlas Fotográfico').items([
                orderableDocumentListDeskItem({type: 'fotograma', title: 'Fotogramas', S, context}),
                S.listItem().title('Lugares (mapa)').id('lugares').child(S.documentTypeList('lugar').title('Lugares (mapa)')),
                S.divider(),
                unico('Configurações do Atlas', 'configAtlas', 'configAtlas'),
              ]),
            ),
            S.listItem().title('Curadoria').id('pasta-curadoria').child(
              S.list().title('Curadoria').items([
                orderableDocumentListDeskItem({type: 'curadoria', title: 'Projetos de curadoria', S, context}),
                S.listItem().title('Etiquetas (tipo e papel)').id('etiquetas').child(S.documentTypeList('etiqueta').title('Etiquetas')),
                S.divider(),
                unico('Configurações da Curadoria', 'configuracoes', 'configuracoes'),
              ]),
            ),
            S.divider(),
            unico('Bio', 'bio', 'bio'),
          ])
      },
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (t) => t.filter((x) => !['home', 'bio', 'configAtlas', 'configuracoes'].includes(x.schemaType)),
  },
})
