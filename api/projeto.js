// Função serverless (Vercel) — lê um projeto do Portfólio no Airtable.
// A imagem e o texto vêm do Airtable a cada carregamento (com cache curto de CDN),
// então editar a tabela reflete no site sozinho, sem redeploy.

const BASE = "appd8iDhr82Cxr61E"; // base "Portfólio" (não é segredo)
const API = "https://api.airtable.com/v0";

function slugify(s) {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function matchSlug(nome, slug) {
  const full = slugify(nome);
  return full === slug || full.split("-")[0] === slug;
}

module.exports = async (req, res) => {
  try {
    const token = process.env.AIRTABLE_TOKEN;
    if (!token) { res.status(500).json({ error: "AIRTABLE_TOKEN ausente nas variáveis de ambiente" }); return; }
    const H = { Authorization: `Bearer ${token}` };

    const url = new URL(req.url, "http://x");
    const slug = (url.searchParams.get("slug") || "").trim();
    if (!slug) { res.status(400).json({ error: "faltou ?slug=" }); return; }

    // 1) acha o projeto pelo Nome (slug derivado)
    const pr = await fetch(`${API}/${BASE}/Projetos`, { headers: H });
    if (!pr.ok) { res.status(502).json({ error: "Airtable Projetos", status: pr.status }); return; }
    const projData = await pr.json();
    const proj = (projData.records || []).find(r => matchSlug(r.fields["Nome"], slug));
    if (!proj) { res.status(404).json({ error: "projeto não encontrado", slug }); return; }
    const nome = proj.fields["Nome"];

    // 2) imagens ligadas a esse projeto, ordenadas
    const formula = `ARRAYJOIN({Projeto})='${String(nome).replace(/'/g, "\\'")}'`;
    const iu = `${API}/${BASE}/Imagens?filterByFormula=${encodeURIComponent(formula)}&sort%5B0%5D%5Bfield%5D=Ordem`;
    const ir = await fetch(iu, { headers: H });
    const imgData = ir.ok ? await ir.json() : { records: [] };
    const imagens = (imgData.records || []).map(r => {
      const f = r.fields;
      const foto = (f["Foto"] || [])[0];
      return {
        ordem: f["Ordem"] || 0,
        nome: f["Nome do arquivo"] || "",
        legendaPT: f["Legenda_PT"] || "",
        legendaEN: f["Legenda_EN"] || "",
        legendaPT2: f["Legenda_PT_2"] || "",
        legendaEN2: f["Legenda_EN_2"] || "",
        url: foto ? foto.url : null,
      };
    }).filter(x => x.url);

    // cache curto de CDN: edições aparecem em ~2 min, sem redeploy
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    res.status(200).json({
      slug, nome,
      ano: proj.fields["Ano"] || "",
      ordem: proj.fields["Ordem"] || 0,
      corFundo: proj.fields["Cor de fundo"] || "",
      aberturaPT: proj.fields["Texto de abertura_PT"] || "",
      aberturaEN: proj.fields["Texto de abertura_EN"] || "",
      fonteTipo: proj.fields["Tipo de Fonte"] || "",
      fonteTamanho: proj.fields["Tamanho da Fonte"] || "",
      fonteCor: proj.fields["Cor da Fonte"] || "",
      creditosPT: proj.fields["Créditos_PT"] || "",
      creditosEN: proj.fields["Créditos_EN"] || "",
      imagens,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
