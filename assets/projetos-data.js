// ---- CAMADA DE DADOS DESACOPLADA ----
// Adicionar um projeto = adicionar uma entrada aqui (mais os arquivos em assets/<slug>/).
// Nada de mexer no código da página. Depois isto vira uma chamada à tabela (Airtable/etc.).

window.PROJETOS_TIMELINE = [
  {y:"2023–", n:"Pedras Marcadas", slug:"pedras-marcadas"},
  {y:"2023–", n:"Pedra Paulista"},
  {y:"2023",  n:"Carajás"},
  {y:"2022",  n:"Cariri"},
  {y:"2021",  n:"Seridó Potiguar", slug:"serido"},
  {y:"2019",  n:"Costa Vicentina"},
  {y:"2017",  n:"Serra da Capivara"},
  {y:"2016",  n:"Monte Roraima"},
  {y:"2015",  n:"Cuba"},
  {y:"2013",  n:"Mundo Mostruário"},
  {y:"2013",  n:"Ordos"},
  {y:"2013",  n:"Linha Ouro"},
  {y:"2013",  n:"Casa Moriyama"},
];

// helper: Seridó tem 43 páginas fechadas (base, base2..base43)
const SERIDO_PAGES = ["", ...Array.from({length:42},(_,i)=>String(i+2))]
  .map(n => `assets/serido/VT_Serido_base${n}.jpg`);
// legendas confirmadas (âncoras) — índice da página : índice em SERIDO_CAPTIONS
const SERIDO_CAPMAP = { 0:0, 1:1, 8:9, 16:14, 17:15, 18:16 };
const caps = window.SERIDO_CAPTIONS || [];

window.PROJETOS = {
  "serido": {
    title:"Seridó Potiguar", date:"2021",
    bg:"#ebebeb",                       // fundo próprio (páginas do diário, Alles Blau)
    accent:"#86806F",
    opening:["This project is a journey across the backlands of Rio Grande do Norte. It documents archaeological sites and rock formations that preserve evidence of early human occupation. Rich in mineral resources, the region is also shaped by mining and natural stone extraction."],
    award:"Winner of the Marc Ferrez Photography Award — National Foundation for the Arts, 2021",
    pages: SERIDO_PAGES.map((src,i)=>({ src, cap: (SERIDO_CAPMAP[i]!=null ? caps[SERIDO_CAPMAP[i]] : "") })),
    credits:[
      ["", "Seridó Potiguar: Diário de uma viagem geológica é resultado de uma expedição realizada em 2021 ao Geoparque Seridó, Rio Grande do Norte. Todos os geossítios mencionados no relato são abertos para visitação. Esta publicação digital foi contemplada pelo Prêmio Marc Ferrez de Fotografia da Funarte. Este é um capítulo de um projeto de longo prazo sobre a paisagem geológica brasileira."],
      ["Fotografias, digitalização e edição", "Valentina Tong"],
      ["Revelação de negativos e cromos", "Marcelo Guarnieri"],
      ["Design", "Alles Blau Studio: Elisa von Randow, Julia Masagão e Mariana Caldas"],
      ["Consultoria", "Marcos Nascimento"],
      ["Apoio", "Janaína Medeiros, Geoparque Seridó"],
      ["Guias de viagem", "Genilson Carvalho (Cerro Corá), Dilson Gonçalves (Acari), Neia Araújo (Parelhas), Dean Carvalho (Carnaúba dos Dantas) e Ivan Simplício (Gargalheiras)"],
    ],
  },

  "pedras-marcadas": {
    title:"Pedras Marcadas", date:"2023–",
    bg:"#fefefe",                       // fundo próprio (páginas sobre branco)
    accent:"#9A4A2C",
    opening:["Ongoing research on Brazil’s natural stone industry. Centered on Espírito Santo, responsible for over 90% of the country’s production and exports, the project explores the environmental impacts of stone extraction and the ethical and aesthetic implications of its use in contemporary architecture."],
    award:"",
    pages: Array.from({length:9},(_,i)=>({ src:`assets/pedras-marcadas/pm_p${String(i+1).padStart(2,"0")}.jpg`, cap:"" })),
    credits:[],
  },
};
