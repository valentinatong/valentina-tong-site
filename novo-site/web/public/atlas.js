// Atlas Fotográfico: filtros em cascata, grade e ficha. Dados embutidos na página (#atlas-dados).
  (function(){
  // ---- data layer — vem do Airtable (base Arquivo, tabela Fotogramas,
  // só os marcados "Publicado no site"). Editar lá reflete aqui sozinho. Os
  // campos que aparecem na ficha (rótulo, ordem, liga/desliga) vêm da tabela
  // "Configuração de Campos" da mesma base — sem lista fixa aqui no código. ----
  // dados gerados no build a partir do Sanity (mesmo formato da antiga /api/arquivo-fotos)
  const DADOS = JSON.parse(document.getElementById("atlas-dados").textContent);
  let ITEMS = DADOS.fotos || [];
  let CAMPOS = DADOS.campos || [];
  ITEMS.sort((a,b)=> a.code.localeCompare(b.code, undefined, {numeric:true, sensitivity:"base"}));

  const lang = window.__arquivoLang;
  // as 7 categorias do filtro superior — Estado/Município já vêm como campos de
  // primeiro nível de cada foto; os demais vêm do mapa "valores" (Configuração de
  // Campos no Airtable). As opções de cada select são os valores distintos que já
  // aparecem nas fotos publicadas — não é uma lista fixa mantida à parte.
  const CATEGORIES = [
    { field: "projeto",   labelPT: "PROJETO",    labelEN: "PROJECT" },
    { field: "estado",    labelPT: "ESTADO",     labelEN: "STATE" },
    { field: "municipio", labelPT: "MUNICÍPIO",  labelEN: "MUNICIPALITY" },
    { field: "Local",     labelPT: "LOCAL",      labelEN: "LOCATION" },
    { field: "Ano",       labelPT: "ANO",        labelEN: "YEAR" },
    { field: "Geologia",  labelPT: "GEOLOGIA",   labelEN: "GEOLOGY" },
    { field: "Contexto",  labelPT: "CONTEXTO",   labelEN: "CONTEXT" },
  ];
  // tags da ficha para Estado/Município usam o nome de campo do Airtable
  // ("Estado"/"Município"); normaliza pros mesmos campos usados nos selects
  // acima, senão os dois viram filtros desencontrados.
  function normField(f){ return f==="Estado" ? "estado" : f==="Município" ? "municipio" : f; }

  let current = null; // nenhuma foto selecionada de início — ficha mostra o statement
  let active = {}; // filtros ativos por categoria: { [field]: value|null, ... } — combinam com E lógico
  // deep link vindo do mapa (mapa.html?municipio=X)
  const qMunicipio = new URL(location.href).searchParams.get("municipio");
  if (qMunicipio) active.municipio = qMunicipio;
  const grid=document.getElementById("grid"), fichaEl=document.getElementById("ficha"), filtersEl=document.getElementById("filters");

  function fieldVal(it,f){
    if(f==="projeto") return it.projeto;
    if(f==="estado") return it.estado;
    if(f==="municipio") return it.municipio;
    return (it.valores || {})[f];
  }
  function matches(it){
    return CATEGORIES.every(({field})=>{
      const chosen = active[field];
      if(!chosen) return true;
      const v = fieldVal(it, field);
      if(!v || (Array.isArray(v) && !v.length)) return false;
      return Array.isArray(v) ? v.includes(chosen) : String(v)===String(chosen);
    });
  }
  // "it" bate com os filtros ativos das categorias ANTES de "uptoIdx" na ordem de
  // CATEGORIES (Projeto, Estado, Município, Local, Ano, Geologia, Contexto) — é o
  // que faz a cascata andar só pra frente: Estado restringe Município/Local, mas
  // Município/Local nunca restringem Estado ou Projeto de volta (senão o próprio
  // select de Projeto ficaria preso depois que o Estado fosse preenchido sozinho).
  function matchesUpTo(it, uptoIdx){
    for(let i=0;i<uptoIdx;i++){
      const field = CATEGORIES[i].field;
      const chosen = active[field];
      if(!chosen) continue;
      const v = fieldVal(it, field);
      if(!v || (Array.isArray(v) && !v.length)) return false;
      if(!(Array.isArray(v) ? v.includes(chosen) : String(v)===String(chosen))) return false;
    }
    return true;
  }
  function optionsFor(idx){
    const field = CATEGORIES[idx].field;
    return [...new Set(ITEMS.filter(it=>matchesUpTo(it, idx)).flatMap(it=>{
      const v=fieldVal(it,field); return Array.isArray(v)?v:(v?[v]:[]);
    }))].sort((a,b)=> String(a).localeCompare(String(b), undefined, {numeric:true, sensitivity:"base"}));
  }

  const mapBtn = filtersEl.querySelector(".mapbtn");
  const selects = {};
  CATEGORIES.forEach(cat=>{
    const sel = document.createElement("select"); sel.className="filtsel"; sel.dataset.field=cat.field;
    sel.onchange = ()=> setFilter(cat.field, sel.value || null);
    filtersEl.insertBefore(sel, mapBtn);
    selects[cat.field] = sel;
  });

  // recalcula, em cascata (Projeto → Estado → Município → Local → ...), as opções
  // de cada select a partir dos OUTROS filtros já ativos — ex.: escolher um projeto
  // que só existe num estado já restringe (e preenche sozinho, se sobrar só um) o
  // select de Estado; escolher um estado restringe Município e Local, evitando
  // listas enormes. Se um valor já escolhido deixa de ser possível, ele é limpo.
  function refreshFilters(){
    CATEGORIES.forEach((cat, idx)=>{
      const options = optionsFor(idx);
      if(active[cat.field] && !options.some(v=>String(v)===String(active[cat.field]))) active[cat.field] = null;
      if(!active[cat.field] && options.length===1) active[cat.field] = String(options[0]);
      const label = lang==="en" ? cat.labelEN : cat.labelPT;
      const sel = selects[cat.field];
      sel.innerHTML = `<option value="">${label}</option>` +
        options.map(v=>`<option value="${String(v).replace(/"/g,"&quot;")}">${v}</option>`).join("");
      sel.value = active[cat.field] || "";
      sel.classList.toggle("on", !!active[cat.field]);
    });
    let el=document.getElementById("clearFilters");
    const hasActive = CATEGORIES.some(c=>active[c.field]);
    if(hasActive){
      if(!el){ el=document.createElement("button"); el.id="clearFilters"; el.className="pill facet"; filtersEl.insertBefore(el, mapBtn); }
      el.textContent = (lang==="en" ? "CLEAR FILTERS" : "LIMPAR FILTROS") + " ✕";
      el.onclick = ()=>{ CATEGORIES.forEach(c=>{ active[c.field]=null; }); refreshFilters(); pickFirstMatch(); renderGrid(); renderFicha(); };
    } else if(el){ el.remove(); }
  }

  // depois de mexer num filtro, a ficha passa a mostrar a primeira foto do
  // resultado — sem isso ela continuava mostrando a última foto clicada,
  // mesmo que essa foto nem batesse mais com os filtros escolhidos.
  function pickFirstMatch(){
    current = ITEMS.filter(it=>matches(it))[0] || null;
  }

  function setFilter(field, value, opts){
    field = normField(field);
    if((opts && opts.toggle) && active[field]===value) value = null;
    active[field] = value || null;
    // trocar um filtro limpa os que vêm depois dele na hierarquia (Projeto →
    // Estado → Município → Local → Ano → Geologia → Contexto) — senão sobra
    // combinação antiga que não faz mais sentido pro novo valor escolhido.
    const idx = CATEGORIES.findIndex(c=>c.field===field);
    for(let i=idx+1;i<CATEGORIES.length;i++) active[CATEGORIES[i].field] = null;
    refreshFilters(); pickFirstMatch(); renderGrid(); renderFicha();
  }

  function renderGrid(){
    grid.innerHTML="";
    ITEMS.filter(it=>matches(it)).forEach(it=>{
      const fig=document.createElement("figure"); fig.className="cell"+(current && it.code===current.code?" sel":"");
      fig.innerHTML=`<div class="imgbox"><img src="${it.thumb}" loading="lazy" alt="${it.code}"></div><figcaption>${it.code}</figcaption>`;
      fig.onclick=()=>{ current=it; renderGrid(); renderFicha(); };
      grid.appendChild(fig);
    });
    if(!grid.children.length) grid.innerHTML=`<p style="color:var(--stone-dim);font-family:var(--mono-font);font-size:12px;padding:10px">${lang==="en"?"No images match these filters yet.":"Nenhuma imagem com esse critério ainda."}</p>`;
  }
  function mapHref(it){
    if (it && it.municipio && it.estado) {
      return `${DADOS.base}/atlas/mapa/?municipio=${encodeURIComponent(it.municipio)}&estado=${encodeURIComponent(it.estado)}`;
    }
    return `${DADOS.base}/atlas/mapa/`;
  }
  function renderFicha(){
    if(!current){ fichaEl.innerHTML = `<div class="statement">${window.__arquivo.statementHTML}</div>`; return; }
    const rows = CAMPOS.map(({campo, rotulo})=>{
      const val = (current.valores || {})[campo];
      const empty = Array.isArray(val) ? !val.length : (val==null || val==="");
      if(empty) return `<dt>${rotulo}</dt><dd class="dim">-</dd>`;
      const vals = Array.isArray(val) ? val : [val];
      const tags = vals.map(v=>{ const av=active[normField(campo)]; const on=av!=null && String(av)===String(v);
        return `<a class="tag${on?" on":""}" data-field="${campo}" data-value="${String(v).replace(/"/g,"&quot;")}">${v}</a>`; }).join(", ");
      return `<dt>${rotulo}</dt><dd>${tags}</dd>`;
    }).join("");
    const subject = encodeURIComponent(`Pedido de acesso à imagem ${current.code}`);
    const bodym = encodeURIComponent(`Olá Valentina,\n\nGostaria de solicitar acesso à imagem ${current.code}${current.projeto ? ` (${current.projeto})` : ""} do Arquivo Viagem Geológica.\n\n`);
    fichaEl.innerHTML = `<div class="fichaBody">`+
      `<img class="preview" src="${current.thumb}" alt="${current.code}">`+
      `<div class="code">${current.code}</div>`+
      `<dl>${rows}</dl>`+
      `<div class="divider"></div>`+
      `<dl><dt>${lang==="en"?"Location":"Localização"}</dt><dd><a class="maplink" href="${mapHref(current)}">${lang==="en"?"View on map →":"Ver no mapa →"}</a></dd></dl>`+
      `<div class="divider"></div>`+
      `<a class="req" href="mailto:tongvalentina@gmail.com?subject=${subject}&body=${bodym}">${lang==="en"?"REQUEST ACCESS TO THE IMAGE":"SOLICITAR ACESSO À IMAGEM"}</a>`+
      `<div class="req-note">${lang==="en"?"High-resolution images available on request by e-mail.":"Imagens em alta resolução mediante pedido por e-mail."}</div>`+
      `</div>`;
    const fichaBody = fichaEl.querySelector(".fichaBody");
    const previewImg = fichaEl.querySelector(".preview");
    const reveal = ()=> fichaBody.classList.add("loaded");
    if(previewImg.complete) reveal();
    else { previewImg.addEventListener("load", reveal); previewImg.addEventListener("error", reveal); }
    // a miniatura (já em cache da grade) aparece na hora; a versão em alta
    // resolução troca por cima assim que terminar de carregar, sem travar a abertura da ficha
    const hi = new Image();
    hi.onload = ()=> { if(current && current.code===previewImg.alt) previewImg.src = current.web; };
    hi.src = current.web;
  }
  fichaEl.addEventListener("click", e=>{ const t=e.target.closest(".tag"); if(t){ e.preventDefault(); setFilter(t.dataset.field, t.dataset.value, {toggle:true}); } });
  document.getElementById("aboutBtn").addEventListener("click", e=>{ e.preventDefault(); current=null; renderGrid(); renderFicha(); });
  window.__arquivo.renderFicha = renderFicha;
  refreshFilters();
  if (qMunicipio) pickFirstMatch(); // chegou por deep link já filtrado — mostra a primeira foto em vez do statement
  renderGrid(); renderFicha();
  })();
