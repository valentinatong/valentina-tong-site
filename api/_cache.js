// Cache de CDN compartilhado por todos os endpoints que leem do Airtable.
// 1h de fresh + 20min de stale-while-revalidate = 80min de pior caso, com
// margem sob os ~2h de validade das URLs de foto do Airtable (v5.airtableusercontent.com).
// Não subir esse valor sem antes parar de depender dessas URLs (ver plano de
// espelhar fotos no Cloudflare R2 no manual do projeto).
const CACHE_CONTROL = "s-maxage=3600, stale-while-revalidate=1200";

// Modo preview: visitar /api/preview-on liga um cookie que faz os endpoints
// abaixo devolverem sempre dado fresco do Airtable (sem cache de CDN) só pra
// quem tem o cookie — útil durante edição ativa do site, sem afetar o cache
// de 1h de todo mundo. Ver api/preview-on.js e api/preview-off.js.
function isPreview(req) {
  return /(?:^|;\s*)vt_preview=1(?:;|$)/.test(req.headers.cookie || "");
}

function cacheControlFor(req) {
  return isPreview(req) ? "no-store" : CACHE_CONTROL;
}

module.exports = { CACHE_CONTROL, isPreview, cacheControlFor };
