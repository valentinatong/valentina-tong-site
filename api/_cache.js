// Cache de CDN compartilhado por todos os endpoints que leem do Airtable.
// 1h de fresh + 20min de stale-while-revalidate = 80min de pior caso, com
// margem sob os ~2h de validade das URLs de foto do Airtable (v5.airtableusercontent.com).
// Não subir esse valor sem antes parar de depender dessas URLs (ver plano de
// espelhar fotos no Cloudflare R2 no manual do projeto).
const CACHE_CONTROL = "s-maxage=3600, stale-while-revalidate=1200";

// Modo preview: visitar /api/preview-on liga um cookie (lido pelo JS de cada
// página, não pelo servidor — o cache da CDN é por URL, não varia por
// cookie). Enquanto o cookie estiver ligado, o próprio JS do site acrescenta
// "&_preview=<timestamp>" nas chamadas à API, gerando uma URL única a cada
// vez — isso garante um cache-miss de verdade, e aqui a gente devolve
// no-store pra essa resposta nunca ser cacheada. Sem afetar o cache de 1h de
// quem mais visita o site. Ver api/preview-on.js e api/preview-off.js.
function isPreview(req) {
  return new URL(req.url, "http://x").searchParams.has("_preview");
}

function cacheControlFor(req) {
  return isPreview(req) ? "no-store" : CACHE_CONTROL;
}

module.exports = { CACHE_CONTROL, isPreview, cacheControlFor };
