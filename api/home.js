// Função serverless (Vercel) — lê a foto de capa ativa da base "Home" (tabela "Capa").
// Marcar "Ativa" numa linha no Airtable troca a foto do home-teste.html, sem precisar de deploy.
// Usa o ID interno da tabela (não o nome) — continua funcionando mesmo se a tabela for renomeada.

const BASE = "appxMeAg3XIYX3nbB"; // base "Home" (não é segredo)
const TABLE = "tblp7CJrU7goelmtF"; // tabela "Capa"
const API = "https://api.airtable.com/v0";

module.exports = async (req, res) => {
  try {
    const token = process.env.AIRTABLE_TOKEN;
    if (!token) { res.status(500).json({ error: "AIRTABLE_TOKEN ausente nas variáveis de ambiente" }); return; }
    const H = { Authorization: `Bearer ${token}` };

    const formula = encodeURIComponent("{Ativa}=1");
    const url = `${API}/${BASE}/${TABLE}?filterByFormula=${formula}&maxRecords=1`;
    const r = await fetch(url, { headers: H });
    if (!r.ok) { res.status(502).json({ error: "Airtable Capa", status: r.status }); return; }
    const data = await r.json();
    const rec = (data.records || [])[0];
    const foto = rec ? (rec.fields["Foto"] || [])[0] : null;

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    res.status(200).json({ foto: foto ? foto.url : null });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
