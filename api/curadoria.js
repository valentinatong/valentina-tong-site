// Função serverless (Vercel) — monta a lista da Curadoria a partir da base Curadoria.
// Um Projeto vira UMA linha na lista usando os campos Local/Ano/Fotos dele mesmo —
// a não ser que tenha Itinerâncias vinculadas (trabalho itinerante, tipo uma exposição
// com várias sedes), caso em que CADA Itinerância vira sua própria linha (com sua
// própria Galeria de fotos), e os campos Local/Ano do Projeto ficam sem uso. Editar no
// Airtable reflete no site sozinho, sem redeploy.

const BASE = "apph3pc09ROncZLnU"; // base "Curadoria" (não é segredo)
const API = "https://api.airtable.com/v0";

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

    const [projRecs, itinRecs, galRecs] = await Promise.all([
      fetchAll(H, "Projetos"),
      fetchAll(H, "Itinerâncias"),
      fetchAll(H, "Galeria"),
    ]);

    const projById = Object.fromEntries(projRecs.map(r => [r.id, r.fields]));

    const galByItin = {};
    galRecs.forEach(r => {
      const itinId = (r.fields["Itinerância"] || [])[0];
      if (!itinId) return;
      (galByItin[itinId] = galByItin[itinId] || []).push(r.fields);
    });
    Object.values(galByItin).forEach(list => list.sort((a, b) => (a["Ordem"] || 0) - (b["Ordem"] || 0)));

    function textoProjeto(proj) {
      const titulo = isEN ? (proj["Título_EN"] || proj["Título_PT"]) : proj["Título_PT"];
      const tipoArr = isEN ? (proj["Tipo_EN"] || proj["Tipo_PT"]) : proj["Tipo_PT"];
      const papel = isEN ? (proj["Papel_EN"] || proj["Papel_PT"]) : proj["Papel_PT"];
      const desc = isEN ? (proj["Texto de apresentação_EN"] || proj["Texto de apresentação_PT"]) : proj["Texto de apresentação_PT"];
      return { titulo: titulo || "", tipo: (tipoArr || []).join(" + "), papel: papel || "", desc: desc || "" };
    }
    function imgsDeFotos(fotos) {
      return (fotos || []).filter(Boolean).map(f => ({
        thumb: (f.thumbnails && f.thumbnails.large) ? f.thumbnails.large.url : f.url,
        web: f.url,
      }));
    }

    // uma linha por Itinerância (trabalhos com várias sedes)
    const linhasItin = itinRecs.map(rec => {
      const it = rec.fields;
      const projId = (it["Projeto"] || [])[0];
      const proj = projById[projId] || {};
      const fotos = (galByItin[rec.id] || []).map(g => (g["Foto"] || [])[0]);
      return {
        ...textoProjeto(proj),
        local: it["Local"] || "",
        ano: it["Ano"] || "",
        ordemProjeto: proj["Ordem"] || 0,
        ordemItin: it["Ordem"] || 0,
        imgs: imgsDeFotos(fotos),
      };
    });
    const projComItin = new Set(itinRecs.map(rec => (rec.fields["Projeto"] || [])[0]));

    // uma linha por Projeto sem Itinerância (ocorrência única — usa Local/Ano/Fotos dele mesmo)
    const linhasProjeto = projRecs.filter(r => !projComItin.has(r.id)).map(rec => {
      const proj = rec.fields;
      return {
        ...textoProjeto(proj),
        local: proj["Local"] || "",
        ano: proj["Ano"] || "",
        ordemProjeto: proj["Ordem"] || 0,
        ordemItin: 0,
        imgs: imgsDeFotos(proj["Fotos"]),
      };
    });

    const itens = linhasItin.concat(linhasProjeto)
      .sort((a, b) => a.ordemProjeto - b.ordemProjeto || a.ordemItin - b.ordemItin);

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    res.status(200).json({ itens });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
