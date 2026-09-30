// Função serverless (Vercel) — monta a lista da Curadoria a partir da base Curadoria
// (tabelas Projetos, Itinerâncias e Galeria). Cada Projeto vira UMA linha na lista.
// Os campos Local/Ano do PRÓPRIO Projeto aparecem na linha de abertura; as Itinerâncias
// vinculadas (sedes) entram à parte como o array "sedes".
//
// Imagens: cada linha da tabela Galeria é UMA imagem, com sua legenda (Legenda_PT /
// Legenda_EN) e um Link opcional (a legenda do zoom vira link), vinculada a um
// Projeto ou a uma Itinerância, e ordenada por "Ordem".
// Se um projeto/sede tiver linhas na Galeria, elas substituem o campo "Fotos" dele;
// se não tiver (ou a tabela ainda não existir), continua valendo o "Fotos" antigo.
// Os nomes das colunas da Galeria são lidos sem ligar para maiúsculas/acentos.
// Editar no Airtable reflete no site sozinho, sem redeploy.

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

// lê um campo pelo nome sem ligar para maiúsculas, acentos, espaços ou "_"
const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]+/g, "").toLowerCase();
function campo(fields, ...nomes) {
  const alvos = nomes.map(norm);
  for (const k of Object.keys(fields)) if (alvos.includes(norm(k))) return fields[k];
  return undefined;
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
      // tabela opcional: se ainda não existir, segue só com o campo "Fotos"
      fetchAll(H, "Galeria").catch(() => []),
    ]);

    // Galeria → imagens agrupadas pelo id do Projeto ou da Itinerância vinculada
    const galByRec = {};
    galRecs
      .map(rec => rec.fields)
      .sort((a, b) => (campo(a, "Ordem") || 0) - (campo(b, "Ordem") || 0))
      .forEach(g => {
        const foto = (campo(g, "Imagem", "Foto", "Fotos") || [])[0];
        if (!foto) return;
        const legPT = campo(g, "Legenda_PT", "Legenda") || "";
        const legEN = campo(g, "Legenda_EN") || "";
        const img = { ...imgDeFoto(foto), legenda: String(isEN ? (legEN || legPT) : legPT).trim(),
                      link: String(campo(g, "Link", "URL", "Site") || "").trim() };
        // vinculada a uma Itinerância → vai para a sede; senão, para o Projeto
        const itin = (campo(g, "Itinerância", "Itinerâncias", "Sede") || [])[0];
        const proj = (campo(g, "Projeto", "Projetos") || [])[0];
        const alvo = itin || proj;
        if (alvo) (galByRec[alvo] = galByRec[alvo] || []).push(img);
      });
    // imagens de um registro: as da Galeria, se houver; senão o campo "Fotos" antigo
    const imgsDe = (recId, fotos) => galByRec[recId] || imgsDeFotos(fotos);

    const itinsByProj = {};
    itinRecs.forEach(rec => {
      const projId = (rec.fields["Projeto"] || [])[0];
      if (!projId) return;
      (itinsByProj[projId] = itinsByProj[projId] || []).push(rec);
    });
    Object.values(itinsByProj).forEach(list => list.sort((a, b) => (a.fields["Ordem"] || 0) - (b.fields["Ordem"] || 0)));

    function imgDeFoto(f) {
      return {
        thumb: (f.thumbnails && f.thumbnails.large) ? f.thumbnails.large.url : f.url,
        web: f.url,
      };
    }
    function imgsDeFotos(fotos) {
      return (fotos || []).filter(Boolean).map(imgDeFoto);
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
      item.imgs = imgsDe(rec.id, proj["Fotos"]);

      // sedes (Itinerâncias): à parte, aparecem quando o item abre
      const itins = itinsByProj[rec.id];
      item.sedes = (itins && itins.length) ? itins.map(itinRec => {
        const it = itinRec.fields;
        return { local: it["Local"] || "", ano: it["Ano"] || "", imgs: imgsDe(itinRec.id, it["Fotos"]) };
      }) : null;
      return item;
    }).sort((a, b) => a.ordem - b.ordem);

    res.setHeader("Cache-Control", cacheControlFor(req));
    res.status(200).json({ itens });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
