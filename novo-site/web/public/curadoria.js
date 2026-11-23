// Interações da lista de Curadoria (a lista já vem pronta no HTML, gerada a partir do Sanity):
// abrir/fechar itens, zoom ao passar o mouse, setas ← →, player de vídeo do YouTube,
// e no celular uma galeria em tela cheia ao tocar numa foto.
(function () {
  const list = document.getElementById("list");
  if (!list) return;
  const lang = list.dataset.lang || "pt";

  // fechado: clicar em qualquer lugar abre; aberto: só o título fecha. Um aberto por vez.
  list.querySelectorAll(".cz-item").forEach(a => a.addEventListener("click", e => {
    if (e.target.closest("a")) return; // links (local, legenda) não abrem/fecham o item
    const open = a.classList.contains("open");
    if (open && !e.target.closest(".cz-title")) return;
    hide();
    list.querySelectorAll(".cz-item.open").forEach(x => x.classList.remove("open"));
    if (!open) a.classList.add("open");
  }));

  // zoom: versão maior centralizada na tela (só desktop)
  const canHover = matchMedia("(hover: hover) and (min-width: 761px)");
  const z = document.createElement("figure");
  z.className = "cz-zoom";
  z.innerHTML = '<div class="cz-zi"><img alt=""><span class="cz-play"></span></div><figcaption></figcaption>';
  document.body.appendChild(z);
  const zi = z.querySelector("img"), zc = z.querySelector("figcaption");
  let current = null, hideTimer = null, ready = false;
  const place = () => {
    if (!current || !ready || !canHover.matches) return;
    const w = z.offsetWidth, h = z.offsetHeight;
    z.style.left = Math.max(16, (innerWidth - w) / 2) + "px";
    z.style.top = Math.max(16, (innerHeight - h) / 2) + "px";
    z.classList.add("on");
  };
  function hide() { clearTimeout(hideTimer); current = null; ready = false; z.classList.remove("on"); }
  const hideSoon = () => { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 120); };
  const stripItem = t => (t && t.closest) ? t.closest(".cz-strip > *") : null;
  // legenda (data-cap já vem em HTML) e posição só mudam quando a imagem grande carregou
  const apply = () => {
    zc.innerHTML = current.dataset.cap || "";
    z.classList.toggle("link", !!current.dataset.link);
    z.classList.toggle("video", !!current.dataset.video);
    ready = true;
    place();
  };
  zi.onload = () => { if (current && zi.getAttribute("src") === current.dataset.web) apply(); };
  const show = t => {
    clearTimeout(hideTimer);
    current = t;
    const nb = t.nextElementSibling; // pré-carrega a vizinha da direita
    if (nb && nb.dataset.web) new Image().src = nb.dataset.web;
    if (zi.getAttribute("src") !== t.dataset.web) { ready = false; zi.src = t.dataset.web; }
    else if (zi.complete) apply();
  };
  // navegando pelas setas, ignora os mouseover "falsos" da fileira rolando sob o cursor parado
  let keyNav = false;
  addEventListener("mousemove", () => { keyNav = false; }, { passive: true });

  list.addEventListener("mouseover", e => {
    const m = stripItem(e.target);
    if (keyNav || !canHover.matches || !m) return;
    if (m === current) { clearTimeout(hideTimer); return; }
    show(m);
  });
  list.addEventListener("mouseout", e => {
    const m = stripItem(e.target);
    if (!keyNav && m && m === current && !m.contains(e.relatedTarget) && !z.contains(e.relatedTarget)) hideSoon();
  });
  z.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  z.addEventListener("mouseleave", e => { if (!keyNav && !(current && current.contains(e.relatedTarget))) hideSoon(); });
  z.querySelector(".cz-zi").addEventListener("click", () => { if (current && current.dataset.video) play(current); });

  // player do YouTube (youtube-nocookie: sem cookies de rastreamento antes do play)
  const pl = document.createElement("div");
  pl.className = "cz-player";
  pl.innerHTML = '<button class="cz-close" aria-label="' + (lang === "en" ? "Close" : "Fechar") + '">×</button><figure><div class="cz-frame"></div><figcaption></figcaption></figure>';
  document.body.appendChild(pl);
  function play(t) {
    hide();
    pl.querySelector(".cz-frame").innerHTML =
      '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(t.dataset.video) + '?autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe>';
    pl.querySelector("figcaption").innerHTML = t.dataset.cap || "";
    pl.classList.add("on");
  }
  const stop = () => { pl.classList.remove("on"); pl.querySelector(".cz-frame").innerHTML = ""; };
  pl.addEventListener("click", e => { if (e.target === pl || e.target.closest(".cz-close")) stop(); });

  // setas ← → percorrem as fotos do item aberto (Esc fecha; Enter toca um vídeo)
  addEventListener("keydown", e => {
    if (pl.classList.contains("on")) { if (e.key === "Escape") stop(); return; }
    if (e.key === "Escape") { hide(); return; }
    if (e.key === "Enter" && current && current.dataset.video) { play(current); return; }
    if ((e.key !== "ArrowRight" && e.key !== "ArrowLeft") || e.metaKey || e.ctrlKey || e.altKey) return;
    const strip = list.querySelector(".cz-item.open .cz-strip");
    if (!strip) return;
    const imgs = [...strip.children];
    const i = imgs.indexOf(current);
    const next = i === -1 ? imgs[e.key === "ArrowRight" ? 0 : imgs.length - 1]
      : imgs[Math.max(0, Math.min(imgs.length - 1, i + (e.key === "ArrowRight" ? 1 : -1)))];
    e.preventDefault();
    keyNav = true;
    next.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    if (canHover.matches) show(next); else current = next;
  });
  // celular: tocar numa foto abre a galeria em tela cheia (foto + legenda; arrastar para o lado passa)
  const gv = document.createElement("div");
  gv.className = "cz-galeria";
  gv.setAttribute("role", "dialog");
  gv.setAttribute("aria-modal", "true");
  gv.innerHTML = '<button class="cz-close" aria-label="' + (lang === "en" ? "Close" : "Fechar") + '">×</button><div class="cz-gcont"></div><div class="cz-trilho"></div>';
  document.body.appendChild(gv);
  const trilho = gv.querySelector(".cz-trilho"), cont = gv.querySelector(".cz-gcont");
  let itens = [], aberta = false;
  const conta = () => {
    const i = Math.round(trilho.scrollLeft / (trilho.clientWidth || 1));
    cont.textContent = itens.length > 1 ? (i + 1) + " / " + itens.length : "";
  };
  function abreGaleria(m) {
    itens = [...m.parentElement.children];
    trilho.innerHTML = "";
    itens.forEach((t, i) => {
      const f = document.createElement("figure");
      f.className = "cz-slide" + (t.dataset.video ? " video" : "");
      const img = document.createElement("img");
      img.alt = ""; img.decoding = "async";
      if (Math.abs(i - itens.indexOf(m)) <= 1) img.src = t.dataset.web; else img.dataset.src = t.dataset.web;
      const box = document.createElement("div"); box.className = "cz-sbox"; box.appendChild(img);
      if (t.dataset.video) { const p = document.createElement("span"); p.className = "cz-play"; box.appendChild(p); box.addEventListener("click", () => play(t)); }
      const c = document.createElement("figcaption"); c.innerHTML = t.dataset.cap || "";
      f.append(box, c); trilho.appendChild(f);
    });
    gv.classList.add("on"); aberta = true;
    document.documentElement.classList.add("cz-trava");
    trilho.scrollLeft = itens.indexOf(m) * trilho.clientWidth;
    conta();
    try { history.pushState({czGaleria: 1}, ""); } catch (e) {}
  }
  function fechaGaleria(viaHistorico) {
    if (!aberta) return;
    aberta = false; gv.classList.remove("on"); trilho.innerHTML = "";
    document.documentElement.classList.remove("cz-trava");
    if (!viaHistorico && history.state && history.state.czGaleria) history.back();
  }
  // carrega a foto quando ela chega perto da tela
  trilho.addEventListener("scroll", () => {
    conta();
    const i = Math.round(trilho.scrollLeft / (trilho.clientWidth || 1));
    [i - 1, i, i + 1].forEach(j => { const im = trilho.children[j] && trilho.children[j].querySelector("img[data-src]"); if (im) { im.src = im.dataset.src; im.removeAttribute("data-src"); } });
  }, { passive: true });
  gv.querySelector(".cz-close").addEventListener("click", () => fechaGaleria(false));
  addEventListener("popstate", () => fechaGaleria(true));
  addEventListener("keydown", e => { if (aberta && e.key === "Escape") fechaGaleria(false); });

  // vídeo na fileira abre o player; no celular, foto abre a galeria
  list.addEventListener("click", e => {
    const m = stripItem(e.target);
    if (!m) return;
    if (m.dataset.video) play(m);
    else if (!canHover.matches) abreGaleria(m);
  });
  addEventListener("scroll", () => { if (keyNav) place(); else hide(); }, { passive: true, capture: true });
})();
