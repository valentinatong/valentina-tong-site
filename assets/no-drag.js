// impede arrastar e o menu de clique-direito (salvar imagem) nas fotos do site.
// é só uma fricção simples — não impede print de tela, que não dá pra bloquear via navegador.
(function(){
  var style = document.createElement("style");
  style.textContent = "img{ -webkit-user-drag:none; user-drag:none; -webkit-touch-callout:none; }";
  document.head.appendChild(style);
  document.addEventListener("dragstart", function(e){ if(e.target.tagName==="IMG") e.preventDefault(); });
  document.addEventListener("contextmenu", function(e){ if(e.target.tagName==="IMG") e.preventDefault(); });
})();
