import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'
import {schemaTypes} from './schemas'
import {GRUPOS_TAG} from './schemas/atlas'

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
                S.listItem().title('Municípios').id('lugares').child(S.documentTypeList('lugar').title('Municípios').defaultOrdering([{field: 'municipio', direction: 'asc'}])),
                S.divider(),
                // etiquetas do Atlas: uma lista por grupo; criar dentro de cada lista já preenche o grupo
                ...GRUPOS_TAG.map((g) => S.listItem().title(g.title).id(`tags-${g.value}`).child(
                  S.documentTypeList('tagAtlas').title(g.title).filter('_type == "tagAtlas" && grupo == $g').params({g: g.value})
                    .defaultOrdering([{field: 'nome.pt', direction: 'asc'}])
                    .initialValueTemplates([S.initialValueTemplateItem(`tag-${g.value}`)]),
                )),
                S.divider(),
                unico('Configurações do Atlas', 'configAtlas', 'configAtlas'),
              ]),
            ),
            S.listItem().title('Curadoria').id('pasta-curadoria').child(
              S.list().title('Curadoria').items([
                orderableDocumentListDeskItem({type: 'curadoria', title: 'Projetos de curadoria', S, context}),
                // tipos e papéis em listas separadas; criar dentro de cada uma já preenche o grupo
                S.listItem().title('Tipos de projeto').id('etiquetas-tipo').child(
                  S.documentTypeList('etiqueta').title('Tipos de projeto').filter('_type == "etiqueta" && grupo == "tipo"')
                    .initialValueTemplates([S.initialValueTemplateItem('etiqueta-tipo')]),
                ),
                S.listItem().title('Papéis').id('etiquetas-papel').child(
                  S.documentTypeList('etiqueta').title('Papéis').filter('_type == "etiqueta" && grupo == "papel"')
                    .initialValueTemplates([S.initialValueTemplateItem('etiqueta-papel')]),
                ),
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
    templates: (t) => [
      ...t.filter((x) => !['home', 'bio', 'configAtlas', 'configuracoes', 'etiqueta', 'tagAtlas'].includes(x.schemaType)),
      ...GRUPOS_TAG.map((g) => ({id: `tag-${g.value}`, title: g.title, schemaType: 'tagAtlas', value: {grupo: g.value}})),
      {id: 'etiqueta-tipo', title: 'Tipo de projeto', schemaType: 'etiqueta', value: {grupo: 'tipo'}},
      {id: 'etiqueta-papel', title: 'Papel', schemaType: 'etiqueta', value: {grupo: 'papel'}},
    ],
  },
})
