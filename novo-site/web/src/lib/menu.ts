// Menu principal do site (o mesmo em todas as páginas).
export function menu(lang: 'pt' | 'en') {
  const pre = lang === 'en' ? '/en' : ''
  return [
    {id: 'home', pt: 'HOME', en: 'HOME', href: `${pre}/`},
    {id: 'projetos', pt: 'PROJETOS', en: 'PROJECTS', href: `${pre}/projetos/`},
    {id: 'atlas', pt: 'ATLAS FOTOGRÁFICO', en: 'PHOTOGRAPHIC ATLAS', href: `${pre}/atlas/`},
    {id: 'curadoria', pt: 'CURADORIA', en: 'CURATORSHIP', href: `${pre}/curadoria/`},
    {id: 'bio', pt: 'BIO', en: 'BIO', href: `${pre}/bio/`},
  ]
}
