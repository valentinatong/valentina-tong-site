// Função serverless (Vercel) — lista os fotogramas do Arquivo (base Arquivo,
// tabela Fotogramas) marcados "Publicado no site". Editar lá reflete no site
// sozinho, sem redeploy.
//
// Os campos que aparecem na ficha (dt/dd embaixo da foto) vêm da tabela
// "Configuração de Campos" da mesma base — cada linha tem o nome da coluna em
// Fotogramas ("Campo"), o texto exibido no site ("Rótulo"), se está ligado
// ("Ativo") e a ordem. Editar essa tabela muda a ficha sem precisar de deploy.
// Campo bilíngue: se existir "<Campo>_PT" no registro, usa esse valor (fallback
// pro nome puro se não for bilíngue).
//
// Coordenadas do mapa vêm da tabela "Mapa" da mesma base (Estado, Município,
// Latitude, Longitude) — uma tabela de referência pequena, sem link field,
// unida por nome ao Estado/Município de cada foto (normalizado, sem
// acento/caixa). Sem linha correspondente, lat/lon ficam null e a foto só não
// aparece no mapa — continua normal no Arquivo.

const BASE = "appTgGC0ngoExovqb"; // base "Arquivo" (não é segredo)
const CAMPOS_TABLE = "Configuração de Campos";
const API = "https://api.airtable.com/v0";

function norm(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim();
}

async function fetchAll(H, table, formula) {
  let all = [];
  let offset = "";
  do {
    let url = `${API}/${BASE}/${encodeURIComponent(table)}?pageSize=100`;
    if (formula) url += `&filterByFormula=${encodeURIComponent(formula)}`;
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

    const [configRecs, municipioRecs, fotoRecs] = await Promise.all([
      fetchAll(H, CAMPOS_TABLE, "{Ativo}=1").catch(() => []),
      fetchAll(H, "Mapa").catch(() => []),
      fetchAll(H, "Fotogramas", "{Publicado no site}=1"),
    ]);

    const GEO = new Map(municipioRecs.map(r => [
      norm(r.fields["Município"]) + "|" + norm(r.fields["Estado"]),
      { lat: r.fields["Latitude"], lon: r.fields["Longitude"] },
    ]));

    const campos = configRecs
      .map(r => ({
        campo: r.fields["Campo"] || "",
        rotulo: (isEN && r.fields["Rótulo_EN"]) || r.fields["Rótulo"] || r.fields["Campo"] || "",
        ordem: r.fields["Ordem"] || 0,
      }))
      .filter(c => c.campo)
      .sort((a, b) => a.ordem - b.ordem);

    const fotos = fotoRecs.map(rec => {
      const f = rec.fields;
      const foto = (f["Foto"] || [])[0];
      if (!foto) return null;
      const valores = {};
      campos.forEach(c => {
        const en = f[c.campo + "_EN"];
        const pt = f[c.campo + "_PT"];
        const hasEN = Array.isArray(en) ? en.length : (en !== undefined && en !== "");
        let v;
        if (isEN && hasEN) v = en;
        else if (pt !== undefined) v = pt;
        else v = f[c.campo];
        valores[c.campo] = v === undefined ? "" : v;
      });
      const estado = f["Estado"] || "";
      const municipio = f["Município"] || "";
      const geo = GEO.get(norm(municipio) + "|" + norm(estado));
      return {
        code: f["Nome do arquivo"] || "",
        projeto: f["Projeto"] || "", // usado pelas pílulas de série, separado da ficha
        valores,
        thumb: (foto.thumbnails && foto.thumbnails.large) ? foto.thumbnails.large.url : foto.url,
        web: foto.url,
        estado,
        municipio,
        lat: geo ? geo.lat : null,
        lon: geo ? geo.lon : null,
      };
    }).filter(Boolean);

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    res.status(200).json({ campos, fotos });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
