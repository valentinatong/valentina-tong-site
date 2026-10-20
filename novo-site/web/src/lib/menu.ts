// Menu principal do site (o mesmo em todas as páginas). Páginas ainda não migradas apontam para o site antigo.
const ANTIGO = 'https://valentina-tong-site.vercel.app'
export function menu(lang: 'pt' | 'en') {
  const pre = lang === 'en' ? '/en' : ''
  return [
    {id: 'home', pt: 'HOME', en: 'HOME', href: `${ANTIGO}/index.html`},
    {id: 'projetos', pt: 'PROJETOS', en: 'PROJECTS', href: `${pre}/projetos/`},
    {id: 'atlas', pt: 'ATLAS FOTOGRÁFICO', en: 'PHOTOGRAPHIC ATLAS', href: `${pre}/atlas/`},
    {id: 'curadoria', pt: 'CURADORIA', en: 'CURATORSHIP', href: `${pre}/curadoria/`},
    {id: 'bio', pt: 'BIO', en: 'BIO', href: `${ANTIGO}/bio.html`},
  ]
}
