#!/usr/bin/env node
// Backup de todas as tabelas do Airtable usadas pelo site (bases Portfólio, Arquivo,
// Curadoria) em arquivos JSON versionados no repositório. Rodado automaticamente todo
// dia pelo GitHub Actions (.github/workflows/airtable-backup.yml) — se o Airtable sumir
// ou algo for apagado por engano, esses arquivos são a rede de segurança.
//
// Rodar manual: AIRTABLE_TOKEN=xxx node scripts/backup-airtable.js
//
// Nota: os campos de anexo (fotos) trazem uma "url" da Airtable que expira em poucas
// horas — o backup preserva todos os outros dados do registro, mas não baixa as fotos
// em si (elas já existem nos seus arquivos locais antes de subir pro Airtable).

const fs = require("fs");
const path = require("path");

const TOKEN = process.env.AIRTABLE_TOKEN;
if (!TOKEN) { console.error("faltou AIRTABLE_TOKEN no ambiente"); process.exit(1); }

const API = "https://api.airtable.com/v0";
const OUT_DIR = path.join(__dirname, "..", "backups", "airtable");

const TARGETS = [
  { base: "appxMeAg3XIYX3nbB", table: "tblp7CJrU7goelmtF", file: "home-capa.json" },
  { base: "appd8iDhr82Cxr61E", table: "Projetos",      file: "portfolio-projetos.json" },
  { base: "appd8iDhr82Cxr61E", table: "Imagens",       file: "portfolio-imagens.json" },
  { base: "appTgGC0ngoExovqb", table: "Fotogramas",    file: "arquivo-fotogramas.json" },
  { base: "appTgGC0ngoExovqb", table: "Configurações", file: "arquivo-configuracoes.json" },
  { base: "apph3pc09ROncZLnU", table: "Configurações", file: "curadoria-configuracoes.json" },
];

async function fetchAllRecords(base, table) {
  const H = { Authorization: `Bearer ${TOKEN}` };
  let all = [], offset = "";
  do {
    let url = `${API}/${base}/${encodeURIComponent(table)}?pageSize=100`;
    if (offset) url += `&offset=${offset}`;
    const r = await fetch(url, { headers: H });
    if (!r.ok) throw new Error(`${base}/${table} -> HTTP ${r.status}`);
    const data = await r.json();
    all = all.concat(data.records || []);
    offset = data.offset || "";
  } while (offset);
  return all;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = { syncedAt: new Date().toISOString(), tables: [] };
  for (const t of TARGETS) {
    const records = await fetchAllRecords(t.base, t.table);
    fs.writeFileSync(path.join(OUT_DIR, t.file), JSON.stringify(records, null, 2));
    manifest.tables.push({ base: t.base, table: t.table, file: t.file, records: records.length });
    console.log(`${t.file}: ${records.length} registros`);
  }
  fs.writeFileSync(path.join(OUT_DIR, "_manifest.json"), JSON.stringify(manifest, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
