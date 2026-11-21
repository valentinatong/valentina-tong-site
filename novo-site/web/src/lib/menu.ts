// Menu principal do site (o mesmo em todas as páginas). O Atlas fica fora: é um projeto à parte,
// com botão próprio (azul do Atlas) à direita — ver atlasLink.
export function menu(lang: 'pt' | 'en') {
  const pre = lang === 'en' ? '/en' : ''
  return [
    {id: 'home', pt: 'PROJETOS', en: 'PROJECTS', href: `${pre}/`},
    {id: 'projetos', pt: 'PROJETOS', en: 'PROJECTS', href: `${pre}/projetos/`},
    {id: 'curadoria', pt: 'CURADORIA', en: 'CURATORSHIP', href: `${pre}/curadoria/`},
    {id: 'bio', pt: 'BIO', en: 'BIO', href: `${pre}/bio/`},
  ]
}

// botão do Atlas Fotográfico, separado do menu
export function atlasLink(lang: 'pt' | 'en') {
  return {nome: lang === 'en' ? 'PHOTOGRAPHIC ATLAS' : 'ATLAS FOTOGRÁFICO', href: `${lang === 'en' ? '/en' : ''}/atlas/`}
}
