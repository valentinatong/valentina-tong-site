// Função serverless (Vercel) — monta a lista da Curadoria a partir da base Curadoria
// (só 2 tabelas: Projetos e Itinerâncias, cada uma com seu próprio campo de anexo
// múltiplo "Fotos" — sem tabela de Galeria separada). Cada Projeto vira UMA linha na
// lista (título aparece uma vez só). Os campos Local/Ano/Fotos do PRÓPRIO Projeto sempre
// aparecem direto na linha de abertura (foto principal, local, ano), independente de ele
// ter Itinerâncias ou não. Se além disso o projeto tiver Itinerâncias vinculadas (trabalho
// que passou por várias sedes), elas entram à parte como um array "sedes" — o site mostra
// um link "Itinerâncias" abaixo do texto de apresentação, e só abre a lista de sedes
// quando a pessoa clica nele. Editar no Airtable reflete no site sozinho, sem redeploy.

const BASE = "apph3pc09ROncZLnU"; // base "Curadoria" (não é segredo)
const API = "https://api.airtable.com/v0";
const { cacheControlFor } = require("./_cache");

async function fetchAll(H, table) {
  let all = [];
  let offset = "";
  do {
    let url = `${API}/${BASE}/${encodeURIComponent(table)}?pageSize=100`;
    if (offset) url += `&offset=${offset}`;
    const r = await fetch(url, { headers: H });
    if (!r.ok) throw new Error(`${table} -> HTTP ${r.status}`);
    const data = await r.json();
    all = all.concat(data.records || []);
    offset = data.offset || "";
  } while (offset);
  return all;
}

module.exports = async (req, res) => {
  try {
    const token = process.env.AIRTABLE_TOKEN;
    if (!token) { res.status(500).json({ error: "AIRTABLE_TOKEN ausente nas variáveis de ambiente" }); return; }
    const H = { Authorization: `Bearer ${token}` };

    const url = new URL(req.url, "http://x");
    const isEN = (url.searchParams.get("lang") || "").toLowerCase() === "en";

    const [projRecs, itinRecs] = await Promise.all([
      fetchAll(H, "Projetos"),
      fetchAll(H, "Itinerâncias"),
    ]);

    const itinsByProj = {};
    itinRecs.forEach(rec => {
      const projId = (rec.fields["Projeto"] || [])[0];
      if (!projId) return;
      (itinsByProj[projId] = itinsByProj[projId] || []).push(rec);
    });
    Object.values(itinsByProj).forEach(list => list.sort((a, b) => (a.fields["Ordem"] || 0) - (b.fields["Ordem"] || 0)));

    function imgsDeFotos(fotos) {
      return (fotos || []).filter(Boolean).map(f => ({
        thumb: (f.thumbnails && f.thumbnails.large) ? f.thumbnails.large.url : f.url,
        web: f.url,
      }));
    }

    const itens = projRecs.map(rec => {
      const proj = rec.fields;
      const titulo = isEN ? (proj["Título_EN"] || proj["Título_PT"]) : proj["Título_PT"];
      const tipoArr = isEN ? (proj["Tipo_EN"] || proj["Tipo_PT"]) : proj["Tipo_PT"];
      const papel = isEN ? (proj["Papel_EN"] || proj["Papel_PT"]) : proj["Papel_PT"];
      const desc = isEN ? (proj["Texto de apresentação_EN"] || proj["Texto de apresentação_PT"]) : proj["Texto de apresentação_PT"];

      const item = {
        titulo: titulo || "", tipo: (tipoArr || []).join(" + "), papel: papel || "",
        desc: desc || "", ordem: proj["Ordem"] || 0,
      };

      // linha de abertura: sempre os campos do próprio Projeto, tenha ele sedes ou não
      item.local = proj["Local"] || "";
      item.ano = proj["Ano"] || "";
      item.imgs = imgsDeFotos(proj["Fotos"]);

      // sedes (Itinerâncias): à parte, só aparecem ao clicar no link dedicado
      const itins = itinsByProj[rec.id];
      item.sedes = (itins && itins.length) ? itins.map(itinRec => {
        const it = itinRec.fields;
        return { local: it["Local"] || "", ano: it["Ano"] || "", imgs: imgsDeFotos(it["Fotos"]) };
      }) : null;
      return item;
    }).sort((a, b) => a.ordem - b.ordem);

    res.setHeader("Cache-Control", cacheControlFor(req));
    res.status(200).json({ itens });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
