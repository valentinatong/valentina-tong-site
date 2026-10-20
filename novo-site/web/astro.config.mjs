import {defineConfig} from 'astro/config'

// Site 100% estático: as páginas são geradas no build lendo o Sanity.
// Nenhuma visita consulta o Sanity — só as imagens vêm da CDN dele.
export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  build: {format: 'directory'},
})
