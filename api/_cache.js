// Cache de CDN compartilhado por todos os endpoints que leem do Airtable.
// 1h de fresh + 20min de stale-while-revalidate = 80min de pior caso, com
// margem sob os ~2h de validade das URLs de foto do Airtable (v5.airtableusercontent.com).
// Não subir esse valor sem antes parar de depender dessas URLs (ver plano de
// espelhar fotos no Cloudflare R2 no manual do projeto).
module.exports.CACHE_CONTROL = "s-maxage=3600, stale-while-revalidate=1200";
