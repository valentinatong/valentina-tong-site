// Visitar esta URL liga o modo preview (24h): as chamadas a /api/* passam a
// buscar sempre fresco do Airtable pra você, sem esperar o cache de 1h.
// Não afeta outros visitantes do site.
module.exports = (req, res) => {
  res.setHeader("Set-Cookie", "vt_preview=1; Path=/; Max-Age=86400; SameSite=Lax");
  const url = new URL(req.url, "http://x");
  const to = url.searchParams.get("to") || "/";
  res.writeHead(302, { Location: to });
  res.end();
};
