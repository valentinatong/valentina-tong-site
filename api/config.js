// Função serverless (Vercel) — lê a cor de fundo de uma página (Arquivo ou Curadoria)
// na tabela "Configurações" da base correspondente no Airtable. ?base=arquivo|curadoria

const BASES = {
  arquivo: "appTgGC0ngoExovqb",
  curadoria: "apph3pc09ROncZLnU",
};
const API = "https://api.airtable.com/v0";

module.exports = async (req, res) => {
  try {
    const token = process.env.AIRTABLE_TOKEN;
    if (!token) { res.status(500).json({ error: "AIRTABLE_TOKEN ausente nas variáveis de ambiente" }); return; }
    const H = { Authorization: `Bearer ${token}` };

    const url = new URL(req.url, "http://x");
    const which = (url.searchParams.get("base") || "").trim();
    const base = BASES[which];
    if (!base) { res.status(400).json({ error: "faltou ?base=arquivo|curadoria" }); return; }

    const r = await fetch(`${API}/${base}/Configura%C3%A7%C3%B5es?maxRecords=1`, { headers: H });
    if (!r.ok) { res.status(502).json({ error: "Airtable Configurações", status: r.status }); return; }
    const data = await r.json();
    const rec = (data.records || [])[0];
    const corFundo = rec ? (rec.fields["Cor de fundo"] || "") : "";
    const corTag = rec ? (rec.fields["Cor da tag"] || "") : "";
    const textoAbertura = rec ? (rec.fields["Texto de abertura"] || "") : "";

    // cache curto de CDN: edições aparecem em ~2 min, sem redeploy
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    res.status(200).json({ corFundo, corTag, textoAbertura });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
