// diagnóstico temporário — remover depois de descobrir o problema de acesso à base Home
module.exports = async (req, res) => {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) { res.status(500).json({ error: "sem token" }); return; }
  const H = { Authorization: `Bearer ${token}` };
  const r = await fetch("https://api.airtable.com/v0/meta/bases", { headers: H });
  const body = await r.text();
  res.status(200).json({ status: r.status, body });
};
