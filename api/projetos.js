// Função serverless (Vercel) — lista todos os projetos do Portfólio no Airtable,
// pra montar a timeline de projeto.html. Adicionar/remover/reordenar lá reflete
// no site sozinho, sem redeploy.

const BASE = "appd8iDhr82Cxr61E"; // base "Portfólio" (não é segredo)
const API = "https://api.airtable.com/v0";
const { CACHE_CONTROL } = require("./_cache");

function slugify(s) {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

module.exports = async (req, res) => {
  try {
    const token = process.env.AIRTABLE_TOKEN;
    if (!token) { res.status(500).json({ error: "AIRTABLE_TOKEN ausente nas variáveis de ambiente" }); return; }
    const H = { Authorization: `Bearer ${token}` };

    const url = `${API}/${BASE}/Projetos?sort%5B0%5D%5Bfield%5D=Ordem`;
    const r = await fetch(url, { headers: H });
    if (!r.ok) { res.status(502).json({ error: "Airtable Projetos", status: r.status }); return; }
    const data = await r.json();

    const projetos = (data.records || []).map(rec => {
      const f = rec.fields;
      const nome = f["Nome"] || "";
      return {
        nome,
        slug: slugify(nome),
        ano: f["Ano"] || "",
        ordem: f["Ordem"] || 0,
      };
    }).filter(p => p.nome);

    res.setHeader("Cache-Control", CACHE_CONTROL);
    res.status(200).json({ projetos });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
