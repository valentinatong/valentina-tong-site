// Mapa do Atlas (MapLibre). Dados embutidos na página (#atlas-dados).
  const BRASIL_CENTRO = [-16, -46]; // [lat, lon]
  const BR_LNGLAT = [BRASIL_CENTRO[1], BRASIL_CENTRO[0]]; // MapLibre usa [lon, lat]
  const BRASIL_ZOOM = 4.3;
  const OUTROS_REGISTROS = "Outros Registros";

  function norm(s){
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }
  function chave(estado, municipio){ return norm(municipio) + "|" + norm(estado); }

  const STYLES = {
    topo: { version:8,
      sources:{ topo:{ type:"raster", tiles:[
        "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://c.tile.opentopomap.org/{z}/{x}/{y}.png"], tileSize:256, attribution:"&copy; OpenTopoMap (CC-BY-SA)", maxzoom:17 } },
      layers:[{ id:"topo", type:"raster", source:"topo" }] },

    satelite: { version:8,
      sources:{ satelite:{ type:"raster", tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize:256, attribution:"Tiles &copy; Esri", maxzoom:19 } },
      layers:[{ id:"satelite", type:"raster", source:"satelite" }] },

    relevo3d: { version:8,
      sources:{
        osm:{ type:"raster", tiles:[
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize:256, attribution:"&copy; OpenStreetMap Contributors", maxzoom:19 },
        terrainSource:{ type:"raster-dem", url:"https://tiles.mapterhorn.com/tilejson.json" },
        hillshadeSource:{ type:"raster-dem", url:"https://tiles.mapterhorn.com/tilejson.json" } },
      layers:[
        { id:"osm", type:"raster", source:"osm" },
        { id:"hills", type:"hillshade", source:"hillshadeSource", layout:{visibility:"visible"}, paint:{"hillshade-shadow-color":"#473B24"} } ],
      terrain:{ source:"terrainSource", exaggeration:1 },
      sky:{} },
  };

  // o contorno de estados é embutido dentro do próprio objeto de style (não
  // adicionado depois via addSource/addLayer, nem via evento "style.load" —
  // que não dispara de forma confiável após map.setStyle() nesta versão) —
  // por isso o GeoJSON é buscado ANTES de criar o mapa, e cada troca de
  // basemap já aplica o style completo com o contorno incluído.
  function styleComEstados(base, statesGeoJSON){
    if (!statesGeoJSON) return base;
    const sources = Object.assign({}, base.sources, {
      estados: { type: "geojson", data: statesGeoJSON },
    });
    const layers = base.layers.concat([
      { id: "estados-linha", type: "line", source: "estados", paint: { "line-color": "#c9c3b4", "line-width": 1 } },
    ]);
    return Object.assign({}, base, { sources, layers });
  }

  function criarElementoIcone(dim){
    const el = document.createElement("div");
    el.className = "pt-icon" + (dim ? " dim" : "");
    el.innerHTML = '<svg width="24" height="24" viewBox="-12 -12 24 24"><circle class="halo" r="12"/><circle class="sym" r="5"/></svg>';
    return el;
  }

  (async function(){
    let statesGeoJSON = null;
    try {
      const rg = await fetch("/data/br-estados.geojson");
      if (rg.ok) statesGeoJSON = await rg.json();
    } catch (e) { /* sem contorno de estado se a busca falhar — não é crítico */ }

    const map = new maplibregl.Map({
      container: "map",
      style: styleComEstados(STYLES.topo, statesGeoJSON),
      center: BR_LNGLAT,
      zoom: BRASIL_ZOOM,
      attributionControl: false,
      // cooperativeGestures NÃO é habilitado — scroll/pinch de 2 dedos controla
      // o mapa direto, sem exigir Cmd/Ctrl (comportamento pedido explicitamente).
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.touchZoomRotate.disableRotation(); // evita o mapa girar sem querer no toque

    let currentBasemap = "topo";
    document.getElementById("basemapctl").addEventListener("click", e => {
      const btn = e.target.closest(".pill"); if (!btn) return;
      const next = btn.dataset.layer; if (next === currentBasemap) return;
      currentBasemap = next;
      map.setStyle(styleComEstados(STYLES[next], statesGeoJSON));
      document.querySelectorAll(".basemapctl .pill").forEach(b => b.classList.toggle("on", b === btn));
      // setStyle resolve de forma assíncrona/pouco confiável nesta versão do
      // MapLibre (sem evento utilizável pra saber "quando terminou") — um
      // pequeno atraso evita que o pitch seja sobrescrito pelo próprio setStyle
      setTimeout(() => {
        const alvo = { pitch: next === "relevo3d" ? 55 : 0, duration: 400 };
        // relevo de 30m é imperceptível na visão do Brasil inteiro — se estiver
        // muito distante ao ativar o Relevo 3D, aproxima um pouco pra ele aparecer
        if (next === "relevo3d" && map.getZoom() < 9) alvo.zoom = 9;
        map.easeTo(alvo);
      }, 300);
    });

    document.getElementById("zin").onclick = () => map.zoomIn();
    document.getElementById("zout").onclick = () => map.zoomOut();
    document.getElementById("zreset").onclick = () => map.jumpTo({ center: BR_LNGLAT, zoom: BRASIL_ZOOM, pitch: currentBasemap === "relevo3d" ? 55 : 0, bearing: 0 });

    // dados gerados no build a partir do Sanity
    const DADOS = JSON.parse(document.getElementById("atlas-dados").textContent);
    let ITEMS = DADOS.fotos || [];

    const LOCAIS = new Map(); // chave -> {estado, municipio, lat, lon, fotos:[]}
    ITEMS.forEach(f => {
      if (f.lat == null || f.lon == null) return;
      const k = chave(f.estado, f.municipio);
      if (!LOCAIS.has(k)) LOCAIS.set(k, { estado: f.estado, municipio: f.municipio, lat: f.lat, lon: f.lon, fotos: [] });
      LOCAIS.get(k).fotos.push(f);
    });
    const locaisArr = [...LOCAIS.values()];

    // agrupamento por projeto — "-" (sem projeto específico) vira "Outros Registros"
    const porProjeto = new Map(); // rotulo -> Set(chaveLocal), usado pro filtro/fitBounds
    const contagemProjeto = new Map(); // rotulo -> número de fotos, usado só pro número exibido
    const fotosPorProjeto = new Map(); // rotulo -> [fotos], usado pro painel de resultados
    locaisArr.forEach(l => {
      l.fotos.forEach(f => {
        const rotulo = (!f.projeto || f.projeto === "-") ? OUTROS_REGISTROS : f.projeto;
        if (!porProjeto.has(rotulo)) porProjeto.set(rotulo, new Set());
        porProjeto.get(rotulo).add(chave(l.estado, l.municipio));
        contagemProjeto.set(rotulo, (contagemProjeto.get(rotulo) || 0) + 1);
        if (!fotosPorProjeto.has(rotulo)) fotosPorProjeto.set(rotulo, []);
        fotosPorProjeto.get(rotulo).push(f);
      });
    });

    const markers = new Map(); // chaveLocal -> maplibregl.Marker
    locaisArr.forEach(l => {
      const k = chave(l.estado, l.municipio);
      const el = criarElementoIcone(false);
      el.addEventListener("click", ev => { ev.stopPropagation(); selectLocal(k, false); });
      const m = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([l.lon, l.lat]).addTo(map);
      markers.set(k, m);
    });

    document.getElementById("total").innerHTML = `<span>Total de registros</span><span>${ITEMS.length}</span>`;

    let activeProjeto = null;
    function setDimMarker(m, dim){ m.getElement().classList.toggle("dim", dim); }
    function applyFiltro(){
      if (!activeProjeto) {
        markers.forEach(m => setDimMarker(m, false));
        return;
      }
      const set = porProjeto.get(activeProjeto) || new Set();
      markers.forEach((m, k) => setDimMarker(m, !set.has(k)));
    }
    function setProjeto(rotulo){
      activeProjeto = (activeProjeto === rotulo) ? null : rotulo;
      document.querySelectorAll("#leg .r").forEach(el => el.classList.toggle("sel", el.dataset.rotulo === activeProjeto));
      applyFiltro();
      if (activeProjeto) {
        const chaves = [...(porProjeto.get(activeProjeto) || [])];
        const pontos = chaves.map(k => markers.get(k)?.getLngLat()).filter(Boolean);
        if (pontos.length) {
          const lons = pontos.map(p => p.lng), lats = pontos.map(p => p.lat);
          const bbox = [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
          map.fitBounds(bbox, { padding: 40, maxZoom: 10 });
        }
        const fotos = fotosPorProjeto.get(activeProjeto) || [];
        const thumbs = fotos.map(f => `<img src="${f.thumb}" alt="${f.code}" title="${f.municipio}, ${f.estado} — ${f.code}" data-chave="${chave(f.estado, f.municipio)}">`).join("");
        results.innerHTML = `<p class="loc">${activeProjeto}</p>` +
          `<div class="sub">${fotos.length} ${fotos.length > 1 ? "registros" : "registro"}</div>` +
          `<div class="grid">${thumbs}</div>`;
      } else {
        map.jumpTo({ center: BR_LNGLAT, zoom: BRASIL_ZOOM });
        results.innerHTML = `<p class="hint">Selecione um ponto no mapa. Use a roda do mouse para dar zoom e arraste para navegar.</p>`;
      }
    }

    const legEl = document.getElementById("leg");
    const ordemProjetos = [...porProjeto.keys()].sort((a, b) => {
      if (a === OUTROS_REGISTROS) return 1;
      if (b === OUTROS_REGISTROS) return -1;
      return a.localeCompare(b, "pt-BR");
    });
    ordemProjetos.forEach(rotulo => {
      const r = document.createElement("div"); r.className = "r"; r.dataset.rotulo = rotulo;
      r.innerHTML = `<span class="nm">${rotulo}</span><span class="ct">${contagemProjeto.get(rotulo)}</span>`;
      r.onclick = () => setProjeto(rotulo);
      legEl.appendChild(r);
    });

    const results = document.getElementById("results");
    function selectLocal(k, center){
      const l = LOCAIS.get(k);
      if (!l) return;
      const thumbs = l.fotos.map(f => `<img src="${f.thumb}" alt="${f.code}" title="${f.code}" data-chave="${k}">`).join("");
      const href = `${DADOS.base}/atlas/?municipio=${encodeURIComponent(l.municipio)}`;
      results.innerHTML = `<p class="loc">${l.municipio}, ${l.estado}</p>` +
        `<div class="sub">${l.fotos.length} ${l.fotos.length > 1 ? "registros" : "registro"}</div>` +
        `<div class="grid">${thumbs}</div>` +
        `<div class="links"><a href="${href}">${DADOS.lang==="en"?"View in the Atlas →":"Ver no Atlas →"}</a></div>`;
      if (center) map.jumpTo({ center: [l.lon, l.lat], zoom: 13 });
    }
    results.addEventListener("click", e => {
      const img = e.target.closest(".grid img");
      if (!img || !img.dataset.chave) return;
      const l = LOCAIS.get(img.dataset.chave);
      if (l) map.jumpTo({ center: [l.lon, l.lat], zoom: 13 }); // só aponta o pino, sem trocar o painel
    });

    const qs = new URL(location.href).searchParams;
    const qMunicipio = qs.get("municipio"), qEstado = qs.get("estado");
    if (qMunicipio && qEstado) {
      const k = chave(qEstado, qMunicipio);
      if (LOCAIS.has(k)) selectLocal(k, true);
    }
  })();

