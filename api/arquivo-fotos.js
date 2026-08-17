// Função serverless (Vercel) — lista os fotogramas do Arquivo (base Arquivo,
// tabela Fotogramas) marcados "Publicado no site". Editar lá reflete no site
// sozinho, sem redeploy.

const BASE = "appTgGC0ngoExovqb"; // base "Arquivo" (não é segredo)
const API = "https://api.airtable.com/v0";

module.exports = async (req, res) => {
  try {
    const token = process.env.AIRTABLE_TOKEN;
    if (!token) { res.status(500).json({ error: "AIRTABLE_TOKEN ausente nas variáveis de ambiente" }); return; }
    const H = { Authorization: `Bearer ${token}` };

    let all = [];
    let offset = "";
    do {
      const formula = encodeURIComponent("{Publicado no site}=1");
      let url = `${API}/${BASE}/Fotogramas?filterByFormula=${formula}&pageSize=100`;
      if (offset) url += `&offset=${offset}`;
      const r = await fetch(url, { headers: H });
      if (!r.ok) { res.status(502).json({ error: "Airtable Fotogramas", status: r.status }); return; }
      const data = await r.json();
      all = all.concat(data.records || []);
      offset = data.offset || "";
    } while (offset);

    const fotos = all.map(rec => {
      const f = rec.fields;
      const foto = (f["Foto"] || [])[0];
      if (!foto) return null;
      return {
        code: f["Nome do arquivo"] || "",
        projeto: f["Série"] || "",
        estado: f["Estado"] || "",
        municipio: f["Município"] || "",
        local: f["Local"] || "",
        ano: f["Ano"] || "",
        geologia: f["Geologia_PT"] || [],
        contexto: f["Contexto_PT"] || [],
        publicacao: f["Publicação"] || [],
        exposicao: f["Exposição"] || [],
        thumb: (foto.thumbnails && foto.thumbnails.large) ? foto.thumbnails.large.url : foto.url,
        web: foto.url,
      };
    }).filter(Boolean);

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    res.status(200).json({ fotos });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
