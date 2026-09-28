// Função serverless (Vercel) — lista todos os projetos do Portfólio no Airtable,
// pra montar a timeline de projeto.html e o índice de projetos.html (com cor de
// fundo e capa de cada um, numa requisição só). Adicionar/remover/reordenar lá
// reflete no site sozinho, sem redeploy.

const BASE = "appd8iDhr82Cxr61E"; // base "Portfólio" (não é segredo)
const API = "https://api.airtable.com/v0";
const { cacheControlFor } = require("./_cache");

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

    const records = (data.records || []).filter(rec => rec.fields["Nome"]);

    // capa: anexo da coluna de capa do projeto; se vazio, a primeira imagem (menor Ordem) da
    // tabela Imagens. Só consulta Imagens se algum projeto estiver sem capa, e para
    // de paginar assim que todos os que faltam foram achados (normalmente 1 página)
    // — cada página é 1 chamada à API do Airtable, que tem limite mensal no plano grátis.
    const capaDe = {};
    // aceita qualquer coluna de anexo com "capa" no nome ("capa", "Capa", "Foto de capa"...)
    const campoCapa = f => Object.keys(f).find(k => /capa/i.test(k) && Array.isArray(f[k]) && f[k][0] && f[k][0].url);
    records.forEach(rec => {
      const k = campoCapa(rec.fields);
      const a = k && rec.fields[k][0];
      if (a) capaDe[rec.id] = a.url;
    });
    const faltam = new Set(records.filter(rec => !capaDe[rec.id]).map(rec => rec.id));
    if (faltam.size) {
      const nomes = records.filter(rec => faltam.has(rec.id))
        .map(rec => `ARRAYJOIN({Projeto})='${String(rec.fields["Nome"]).replace(/'/g, "\\'")}'`);
      const formula = nomes.length === 1 ? nomes[0] : `OR(${nomes.join(",")})`;
      let offset = "";
      for (let pagina = 0; pagina < 5 && faltam.size; pagina++) {
        const iu = `${API}/${BASE}/Imagens?filterByFormula=${encodeURIComponent(formula)}`
          + `&sort%5B0%5D%5Bfield%5D=Ordem&fields%5B%5D=Projeto&fields%5B%5D=Foto`
          + (offset ? `&offset=${encodeURIComponent(offset)}` : "");
        const ir = await fetch(iu, { headers: H });
        if (!ir.ok) break;
        const imgData = await ir.json();
        (imgData.records || []).forEach(img => {
          const foto = (img.fields["Foto"] || [])[0];
          if (!foto) return;
          (img.fields["Projeto"] || []).forEach(pid => {
            if (faltam.has(pid)) { capaDe[pid] = foto.url; faltam.delete(pid); }
          });
        });
        offset = imgData.offset;
        if (!offset) break;
      }
    }

    const projetos = records.map(rec => {
      const f = rec.fields;
      const nome = f["Nome"];
      return {
        nome,
        slug: slugify(nome),
        ano: f["Ano"] || "",
        ordem: f["Ordem"] || 0,
        corFundo: f["Cor de fundo"] || "",
        capa: capaDe[rec.id] || null,
      };
    });

    res.setHeader("Cache-Control", cacheControlFor(req));
    res.status(200).json({ projetos });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
