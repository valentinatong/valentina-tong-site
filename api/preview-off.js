// Visitar esta URL desliga o modo preview ligado por /api/preview-on.
module.exports = (req, res) => {
  res.setHeader("Set-Cookie", "vt_preview=1; Path=/; Max-Age=0");
  const url = new URL(req.url, "http://x");
  const to = url.searchParams.get("to") || "/";
  res.writeHead(302, { Location: to });
  res.end();
};
