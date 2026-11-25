/* Bubble Sisters — loja
   Um único programa desenha todas as páginas a partir de dados.js (produtos) e config.js (preços, frete, contatos).
   Funciona de dois jeitos: em pastas reais (site publicado) ou por #endereço (prévia em arquivo único). */
(() => {
'use strict';

const CFG = window.BS_CONFIG || {};
const P = window.BS_PRODUTOS || [], CATS = window.BS_CATS || [], SOBRE = window.BS_SOBRE || {};
const BS = Object.assign({ raiz: '', modo: 'hash', rota: 'inicio' }, window.BS || {});
const R = BS.raiz, HASH = BS.modo === 'hash';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const A = n => `${R}assets/${n}.webp`;
const porId = Object.fromEntries(P.map(p => [p.id, p]));
const catDe = id => CATS.find(c => c.id === id);
const preco = id => { const t = CFG.precos || {}; return typeof t[id] === 'number' ? t[id] : (t.padrao || 0); };
const brl = v => 'R$ ' + (Math.round(v * 100) / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const calmo = matchMedia('(prefers-reduced-motion: reduce)');
const emPe = matchMedia('(orientation:portrait),(max-width:760px)');
const LIMITE = Number(CFG.frete_gratis_acima_de) || 0;

/* ───────── Endereços ───────── */
const FIXAS = { inicio: '', produtos: 'produtos/', pedido: 'pedido/', obrigado: 'obrigado/' };
function href(rota) {
  if (HASH) return '#' + rota;
  if (rota === 'sobre') return R + '#sobre';
  if (rota.startsWith('p-')) return `${R}produto/${rota.slice(2)}/`;
  return R + (rota in FIXAS ? FIXAS[rota] : rota + '/');
}
const rotaAtual = () => HASH ? (decodeURIComponent(location.hash.slice(1)) || 'inicio') : (BS.rota || 'inicio');
const elo = (rota, texto, cls, extra = '') => `<a href="${href(rota)}" data-rota="${rota}"${cls ? ` class="${cls}"` : ''}${extra}>${texto}</a>`;

/* ───────── Sacola ───────── */
const Sacola = {
  itens: {}, cep: '',
  carregar() { try { const d = JSON.parse(localStorage.getItem('bs-sacola') || '{}'); this.itens = d.itens || {}; this.cep = d.cep || ''; } catch (e) { /* sem armazenamento: a sacola vive só nesta visita */ }
    for (const id of Object.keys(this.itens)) if (!porId[id] || !(this.itens[id] > 0)) delete this.itens[id]; },
  salvar() { try { localStorage.setItem('bs-sacola', JSON.stringify({ itens: this.itens, cep: this.cep })); } catch (e) { /* idem */ } },
  mudar(id, q) { q = Math.max(0, Math.min(99, q | 0)); if (q) this.itens[id] = q; else delete this.itens[id]; this.salvar(); },
  add(id, n = 1) { this.mudar(id, (this.itens[id] || 0) + n); },
  limpar() { this.itens = {}; this.salvar(); },
  qtd() { return Object.values(this.itens).reduce((a, b) => a + b, 0); },
  resumo() {
    const linhas = Object.entries(this.itens).map(([id, q]) => ({ p: porId[id], q, sub: preco(id) * q }));
    const subtotal = linhas.reduce((a, l) => a + l.sub, 0);
    const gratis = LIMITE > 0 && subtotal >= LIMITE;
    const regiao = freteDe(this.cep);
    const frete = regiao ? (gratis ? 0 : regiao.valor) : null;
    return { linhas, subtotal, gratis, regiao, frete, total: subtotal + (frete || 0) };
  }
};
const soDigitos = s => String(s || '').replace(/\D/g, '');
const mascaraCep = s => { const d = soDigitos(s).slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; };
function freteDe(cep) {
  const d = soDigitos(cep); if (d.length !== 8) return null;
  const n = parseInt(d.slice(0, 5), 10);
  return (CFG.frete || []).find(r => (r.ceps || []).some(([a, b]) => n >= a && n <= b)) || null;
}
function textoWhats(extra) {
  const r = Sacola.resumo();
  const l = ['Olá! Quero fazer um pedido na Bubble Sisters:', ''];
  r.linhas.forEach(x => l.push(`• ${x.q}x ${x.p.nome} — ${brl(x.sub)}`));
  l.push('', `Subtotal: ${brl(r.subtotal)}`);
  if (r.regiao) l.push(`Frete (${r.regiao.regiao}): ${r.frete ? brl(r.frete) : 'grátis'}`, `Total: ${brl(r.total)}`, '', `CEP: ${mascaraCep(Sacola.cep)}`);
  else l.push('Frete: a combinar');
  if (extra) l.push('', extra);
  return l.join('\n');
}
const linkWhats = texto => `https://wa.me/${soDigitos(CFG.whatsapp)}?text=${encodeURIComponent(texto)}`;

/* ═════════ Moldura: topo, menu, sacola, rodapé ═════════ */
const MAIS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v11M2.5 8h11"/></svg>';
function moldura() {
  const topo = el('header', 'topo');
  topo.innerHTML = `${elo('inicio', 'Bubble Sisters', 'marca', ' aria-label="Bubble Sisters, página inicial"')}
    <nav aria-label="Categorias"><ul class="menu">${CATS.map(c => `<li>${elo(c.id, esc(c.nome))}</li>`).join('')}</ul></nav>
    <div class="topo-acoes">
      <button class="sacola-btn" type="button" id="abrirSacola" aria-haspopup="dialog">Sacola <span class="sacola-n" id="sacolaN">0</span></button>
      <button class="menu-btn" type="button" id="abrirMenu" aria-haspopup="dialog">Menu</button>
    </div>`;

  const menu = el('div', 'menu-movel'); menu.id = 'menuMovel'; menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', 'Menu');
  menu.innerHTML = `<button class="fechar" type="button" data-fechar-menu>Fechar</button>
    ${CATS.map(c => elo(c.id, esc(c.nome))).join('')}${elo('produtos', 'Todos os produtos')}${elo('sobre', 'Sobre a marca')}
    <p class="menu-rodape"><a href="${esc(CFG.instagram || '#')}" target="_blank" rel="noopener">Instagram ${esc(CFG.instagram_exibir || '')}</a></p>`;

  const veu = el('div', 'veu'); veu.id = 'veu';
  const sac = el('aside', 'sacola'); sac.id = 'sacola'; sac.setAttribute('role', 'dialog'); sac.setAttribute('aria-modal', 'true'); sac.setAttribute('aria-label', 'Sacola');
  sac.innerHTML = `<div class="sacola-cab"><h2 class="display">Sua sacola</h2><button class="sacola-fechar" type="button" data-fechar-sacola>Fechar</button></div>
    <div class="meta" id="meta"></div>
    <div class="sacola-corpo" id="sacolaCorpo"></div>
    <div class="sacola-pe" id="sacolaPe">
      <div class="cep-linha">
        <label class="campo"><span>CEP de entrega</span><input id="cepSacola" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9"></label>
        <button class="btn btn-contorno" type="button" id="calcCep">Calcular</button>
      </div>
      <p class="frete-info" id="freteInfo" role="status"></p>
      <div class="totais" id="totais"></div>
      ${CFG.mercado_pago_ativo ? elo('pedido', 'Pagar agora', 'btn btn-largo', ' id="irPagar"') : ''}
      <a class="btn btn-contorno btn-largo" id="irWhats" target="_blank" rel="noopener" href="#">Finalizar pelo WhatsApp</a>
    </div>`;

  const rod = el('footer', 'rodape');
  rod.innerHTML = `<div class="rodape-grade">
      <div><p class="rodape-lema">Sabonete artesanal pode ser o melhor momento do seu banho.</p></div>
      <div><h2>Loja</h2><ul>${CATS.map(c => `<li>${elo(c.id, esc(c.nome))}</li>`).join('')}<li>${elo('produtos', 'Todos os produtos')}</li><li>${elo('sobre', 'Sobre a marca')}</li></ul></div>
      <div><h2>Atendimento</h2><ul>
        <li><a href="${linkWhats('Olá! Vim pelo site da Bubble Sisters.')}" target="_blank" rel="noopener">WhatsApp ${esc(CFG.whatsapp_exibir || '')}</a></li>
        <li><a href="${esc(CFG.instagram || '#')}" target="_blank" rel="noopener">Instagram ${esc(CFG.instagram_exibir || '')}</a></li></ul></div>
      <div><h2>Pagamento e entrega</h2><ul>
        <li>${CFG.mercado_pago_ativo ? 'Pix, cartão e boleto pelo Mercado Pago' : 'Pedidos pelo WhatsApp'}</li>
        ${LIMITE ? `<li>Frete grátis a partir de ${brl(LIMITE)}</li>` : ''}
        <li>Enviamos de São Paulo para todo o Brasil</li></ul></div>
    </div>
    <span class="rodape-marca" aria-hidden="true">Bubble Sisters</span>
    <div class="rodape-fim"><span>Bubble Sisters Brasil</span><span>Feito à mão, em pequenos lotes</span></div>`;

  const cortina = el('div', 'cortina'); cortina.id = 'cortina';
  const aviso = el('p', 'sr'); aviso.id = 'aviso'; aviso.setAttribute('role', 'status');
  const app = $('#app');
  document.body.prepend(topo);
  app.after(rod, veu, sac, menu, cortina, aviso);

  /* abrir e fechar */
  let antes = null;
  const abrir = (painel) => { antes = document.activeElement; painel.classList.add('aberto'); veu.classList.toggle('aberto', painel === sac);
    document.body.classList.add('travado'); if (vitrineAtual) vitrineAtual.pausar(true);
    setTimeout(() => { const f = $('button', painel); f && f.focus(); }, 60); };
  const fechar = () => { [sac, menu].forEach(p => p.classList.remove('aberto')); veu.classList.remove('aberto'); document.body.classList.remove('travado');
    if (vitrineAtual) vitrineAtual.pausar(false); if (antes && antes.focus) antes.focus(); antes = null; };
  abrirSacola = () => { pintarSacola(); abrir(sac); };
  fecharPaineis = fechar;
  $('#abrirSacola').addEventListener('click', abrirSacola);
  $('#abrirMenu').addEventListener('click', () => abrir(menu));
  veu.addEventListener('click', fechar);
  document.addEventListener('click', e => { if (e.target.closest('[data-fechar-sacola],[data-fechar-menu]')) fechar(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && (sac.classList.contains('aberto') || menu.classList.contains('aberto'))) fechar();
    const painel = sac.classList.contains('aberto') ? sac : menu.classList.contains('aberto') ? menu : null;
    if (e.key === 'Tab' && painel) { // o foco não sai do painel aberto
      const f = $$('a[href],button:not([disabled]),input', painel).filter(n => n.offsetParent !== null); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* sacola: quantidades, remover, CEP */
  sac.addEventListener('click', e => {
    const b = e.target.closest('[data-q]'); if (b) { const id = b.dataset.id; Sacola.mudar(id, (Sacola.itens[id] || 0) + Number(b.dataset.q)); pintarSacola(); return; }
    const t = e.target.closest('[data-tirar]'); if (t) { Sacola.mudar(t.dataset.tirar, 0); pintarSacola(); }
  });
  const cepIn = $('#cepSacola');
  const aplicarCep = () => { Sacola.cep = soDigitos(cepIn.value); Sacola.salvar(); pintarSacola(true); };
  cepIn.addEventListener('input', () => { cepIn.value = mascaraCep(cepIn.value); if (soDigitos(cepIn.value).length === 8) aplicarCep(); });
  cepIn.addEventListener('keydown', e => { if (e.key === 'Enter') aplicarCep(); });
  $('#calcCep').addEventListener('click', aplicarCep);
}
let abrirSacola = () => {}, fecharPaineis = () => {};

function pintarSacola(tentouCep) {
  const r = Sacola.resumo(), n = Sacola.qtd();
  const cont = $('#sacolaN'); if (cont) cont.textContent = n;
  const corpo = $('#sacolaCorpo'); if (!corpo) return;
  corpo.innerHTML = r.linhas.length ? r.linhas.map(({ p, q, sub }) => `
    <div class="linha-item">
      <span class="linha-foto" style="--cor:${p.bg};--brilho:${p.brilho}"><img src="${A('m-' + p.id)}" alt=""></span>
      <div><p class="linha-nome">${esc(p.nome)}</p><p class="linha-sub">${brl(preco(p.id))} cada</p>
        <div class="linha-ctrl"><span class="qtd qtd-p"><button type="button" data-q="-1" data-id="${p.id}" aria-label="Tirar um ${esc(p.nome)}">−</button><output>${q}</output><button type="button" data-q="1" data-id="${p.id}" aria-label="Pôr mais um ${esc(p.nome)}">+</button></span>
          <button class="tirar" type="button" data-tirar="${p.id}">Remover</button></div></div>
      <span class="linha-preco">${brl(sub)}</span>
    </div>`).join('')
    : `<div class="sacola-vazia"><p>Sua sacola está vazia.</p>${elo('produtos', 'Ver produtos', 'btn', ' data-fechar-sacola')}</div>`;

  const meta = $('#meta');
  if (LIMITE) {
    const pct = Math.min(100, r.subtotal / LIMITE * 100);
    meta.innerHTML = `<p>${r.gratis ? 'Você ganhou frete grátis.' : r.subtotal ? `Faltam ${brl(LIMITE - r.subtotal)} para o frete grátis.` : `Frete grátis em compras a partir de ${brl(LIMITE)}.`}</p>
      <div class="meta-barra" style="--pct:${pct.toFixed(1)}%"><i></i><img src="${A('bolha-5')}" alt=""></div>`;
  } else meta.innerHTML = '';

  const cepIn = $('#cepSacola'); if (document.activeElement !== cepIn) cepIn.value = mascaraCep(Sacola.cep);
  const fi = $('#freteInfo'), d = soDigitos(Sacola.cep);
  fi.className = 'frete-info';
  if (r.regiao) fi.textContent = `${r.regiao.regiao}: ${r.gratis ? 'frete grátis' : brl(r.regiao.valor)}, ${r.regiao.prazo}.`;
  else if (d.length === 8 || (tentouCep && d.length)) { fi.textContent = 'Não encontramos esse CEP. Confira os números.'; fi.classList.add('erro'); }
  else fi.textContent = 'Informe o CEP para calcular o frete.';

  $('#totais').innerHTML = `<div><span>Subtotal</span><span>${brl(r.subtotal)}</span></div>
    <div><span>Frete</span><span>${r.frete == null ? 'a calcular' : r.frete ? brl(r.frete) : 'grátis'}</span></div>
    <div class="total"><span>Total</span><span>${brl(r.total)}</span></div>`;
  const pe = $('#sacolaPe'); pe.hidden = !r.linhas.length;
  const w = $('#irWhats'); if (w) w.href = linkWhats(textoWhats());
}

/* bolha de sabão que sobe do botão até a sacola */
function adicionar(id, n, origem) {
  Sacola.add(id, n); pintarSacola();
  const alvo = $('#sacolaN'), p = porId[id];
  $('#aviso').textContent = `${p.nome} adicionado à sacola. ${Sacola.qtd()} ${Sacola.qtd() === 1 ? 'item' : 'itens'}.`;
  const pular = () => { alvo.classList.remove('pula'); void alvo.offsetWidth; alvo.classList.add('pula'); };
  if (calmo.matches || !origem) { pular(); setTimeout(abrirSacola, 150); return; }
  const a = origem.getBoundingClientRect(), b = alvo.getBoundingClientRect();
  const img = new Image(); img.src = A('bolha-1'); img.className = 'voa'; img.alt = ''; document.body.append(img);
  const x0 = a.left + a.width / 2 - 22, y0 = a.top + a.height / 2 - 22, x1 = b.left + b.width / 2 - 22, y1 = b.top + b.height / 2 - 22;
  img.animate([
    { transform: `translate(${x0}px,${y0}px) scale(.3)`, opacity: 0 },
    { transform: `translate(${x0 + (x1 - x0) * .25}px,${Math.min(y0, y1) - 60 + (y0 - y1) * .3}px) scale(1.1)`, opacity: 1, offset: .35 },
    { transform: `translate(${x1}px,${y1}px) scale(.35)`, opacity: .9 }
  ], { duration: 750, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = () => { img.remove(); pular(); setTimeout(abrirSacola, 200); };
}

/* cortina: a cor do produto cresce a partir do clique antes de trocar de página */
let cortinaViva = false;
function cortina(x, y, cor) {
  const c = $('#cortina'); c.style.background = cor; c.classList.add('viva'); cortinaViva = true;
  c._a && c._a.cancel();
  c._a = c.animate([{ clipPath: `circle(0% at ${x}px ${y}px)` }, { clipPath: `circle(150% at ${x}px ${y}px)` }], { duration: 520, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' });
  return c._a.finished;
}
function abrirCortina() {
  const c = $('#cortina'); if (!cortinaViva) return; cortinaViva = false;
  const a = c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, delay: 60, fill: 'forwards' });
  a.onfinish = () => { c._a && c._a.cancel(); a.cancel(); c.classList.remove('viva'); };
}

/* ═════════ Vitrine: cena de produto em tela cheia ═════════ */
let vitrineAtual = null;
const BOLHAS = [
  { src: 'bolha-1', x: '31%', s: 4.2, t: '28s', d: '-4s', so: 1 },
  { src: 'bolha-3', x: '61%', s: 2.8, t: '36s', d: '-21s' },
  { src: 'bolha-5', x: '80%', s: 5.2, t: '32s', d: '-12s' },
];
const AUTO_MS = 7000;

function vitrine(lista, modo) {
  const unico = modo === 'produto';
  const hero = el('section', 'hero' + (unico ? ' hero-produto' : ''));
  if (!unico) { hero.setAttribute('aria-roledescription', 'carrossel'); hero.setAttribute('aria-label', 'Produtos em destaque'); }
  hero.innerHTML = `<div class="wash wash-a"></div><div class="wash wash-b"></div><div class="grain"></div><div class="cenas"></div>
    <div class="info" aria-live="polite">
      ${unico ? `<a class="tipo" data-rota="" href="#"></a>` : `<p class="tipo"></p>`}
      <h1 class="nome"></h1>
      <p class="notas"></p>
      <p class="preco-linha"><span class="preco"></span><span class="peso"></span></p>
      <div class="acoes${unico ? ' acoes-produto' : ''}">
        ${unico ? `<span class="qtd"><button type="button" data-menos aria-label="Diminuir quantidade">−</button><output aria-label="Quantidade">1</output><button type="button" data-mais aria-label="Aumentar quantidade">+</button></span>` : ''}
        <button class="btn" type="button" data-por>Adicionar à sacola</button>
        ${unico ? '' : `<a class="elo detalhes" data-rota="" href="#">Ver detalhes</a>`}
      </div>
    </div>
    ${unico ? '' : `<div class="miniaturas" role="tablist" aria-label="Escolher produto"></div>
    <div class="passo">
      <button class="seta" type="button" data-ant aria-label="Produto anterior"><svg viewBox="0 0 24 24"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg></button>
      <span class="passo-n" aria-hidden="true"></span>
      <button class="seta" type="button" data-prox aria-label="Próximo produto"><svg viewBox="0 0 24 24"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg></button>
    </div>`}`;
  const cenasEl = $('.cenas', hero), minisEl = $('.miniaturas', hero), washA = $('.wash-a', hero), washB = $('.wash-b', hero), info = $('.info', hero);
  const cyAtual = () => getComputedStyle(hero).getPropertyValue('--cy').trim() || '56%';
  const fundo = p => `radial-gradient(circle at 50% ${cyAtual()}, ${p.brilho} 0, ${p.brilho}00 ${emPe.matches ? 30 : 33}vmax), ${p.bg}`;
  let atual = 0, ocupado = false, fila = null, qtd = 1, vivo = true;

  const cenas = lista.map((p, i) => {
    const cena = el('div', 'scene');
    const titulo = el('div', 'title'); titulo.setAttribute('aria-hidden', 'true'); titulo.style.color = p.tom;
    const tw = el('span', 'title-w');
    p.titulo.forEach((linha, li) => {
      if (li) tw.append(el('span', 'sp sp-ln'));
      const ln = el('span', 'ln');
      [...linha].forEach(c => ln.append(c === ' ' ? el('span', 'sp') : el('span', 'ch', esc(c))));
      tw.append(ln);
    });
    titulo.append(tw); cena.append(titulo);

    const itens = p.itens.map((it, k) => {
      const box = el('div', `it z-${it.z}${it.m ? '' : ' so-desktop'}`), m = it.m || it.d;
      box.style.cssText = `--x:${it.d[0]};--y:${it.d[1]};--s:${it.d[2]};--mx:${m[0]};--my:${m[1]};--ms:${m[2]};--d:${(it.p * 14).toFixed(1)};--r:${it.r}deg;--rr:${2 + (k % 3)}deg;--amp:${6 + (k * 5) % 9}px;--dur:${6.5 + (k * 1.7) % 5}s;--del:-${(k * 2.3) % 7}s;--b:${it.b || 0}`;
      const inn = el('span', 'it-in'), img = new Image();
      img.src = A(it.src); img.alt = ''; img.decoding = 'async'; img.draggable = false;
      inn.append(img); box.append(inn); cena.append(box);
      return { it, inn };
    });

    const prod = el('div', 'prod' + (p.alto ? ' alto' : '')); prod.style.cssText = `--W:${p.w};--MW:${p.mw};--tilt:${p.tilt}deg`;
    const pin = el('span', 'prod-in'), pimg = new Image();
    pimg.className = 'prod-img'; pimg.src = A('p-' + p.id); pimg.alt = p.nome; pimg.draggable = false; if (i === 0) pimg.fetchPriority = 'high';
    pin.append(pimg, el('span', 'prod-sombra')); prod.append(pin); cena.append(prod);
    cenasEl.append(cena);

    let mini = null;
    if (minisEl) {
      mini = el('button', 'mini'); mini.type = 'button'; mini.setAttribute('role', 'tab'); mini.setAttribute('aria-label', p.nome); mini.setAttribute('aria-selected', 'false');
      mini.innerHTML = `<img src="${A('m-' + p.id)}" alt=""><svg viewBox="0 0 70 70" aria-hidden="true"><circle cx="35" cy="35" r="33.1"/></svg>`;
      mini.addEventListener('click', () => ir(i, i > atual ? 1 : -1));
      $('circle', mini).addEventListener('animationend', () => ir((atual + 1) % lista.length, 1));
      minisEl.append(mini);
    }
    return { p, cena, titulo, tw, letras: $$('.ch', titulo), pin, pimg, mini, itens };
  });

  BOLHAS.forEach(b => {
    const box = el('div', b.so ? 'bolha so-desktop' : 'bolha'); box.style.cssText = `--bx:${b.x};--bs:${b.s};--bt:${b.t};--bd:${b.d}`;
    const img = new Image(); img.src = A(b.src); img.alt = ''; box.append(img); hero.append(box);
  });

  function ajustar() {
    const W = hero.clientWidth, pe = emPe.matches; if (!W) return;
    cenas.forEach(c => {
      c.titulo.style.fontSize = '100px';
      const w = c.tw.offsetWidth || 1, alvo = W * (pe ? .93 : (unico ? .9 : .84)), teto = W * (pe ? .43 : .17);
      c.titulo.style.fontSize = Math.min(100 * alvo / w, teto).toFixed(1) + 'px';
    });
  }
  const uPx = () => { const t = el('i'); t.style.cssText = 'position:absolute;visibility:hidden;width:calc(var(--u)*100)'; hero.append(t); const v = t.offsetWidth / 100; t.remove(); return v || 10; };
  const anima = (node, quadros, op) => { node._a && node._a.cancel(); node._a = node.animate(quadros, { fill: 'both', ...op }); return node._a; };
  const opac = x => x.it.z === 'far' ? .85 : 1;

  function entrar(c, dir, primeira) {
    const u = uPx(), pe = emPe.matches;
    c.cena.classList.add('is-on'); c.cena.classList.remove('is-leaving');
    if (calmo.matches) {
      [c.pin, ...c.letras].forEach(n => anima(n, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 }));
      c.itens.forEach(x => anima(x.inn, [{ opacity: 0 }, { opacity: opac(x) }], { duration: 250 })); return;
    }
    anima(c.pin, [
      { opacity: 0, transform: `translate(${dir * 42 * u}px, ${7 * u}px) rotate(${dir * 24}deg) scale(.78)` },
      { opacity: 1, offset: .35 },
      { opacity: 1, transform: 'none' }
    ], { duration: 1000, delay: primeira ? 150 : 0, easing: 'cubic-bezier(.2,1.25,.32,1)' });
    c.itens.forEach((x, k) => {
      const [px, py] = (pe && x.it.m) || x.it.d, n = Math.hypot(px, py) || 1;
      anima(x.inn, [
        { opacity: 0, transform: `translate(${px / n * 20 * u}px, ${py / n * 20 * u}px) rotate(${(k % 2 ? -1 : 1) * 70}deg) scale(.4)` },
        { opacity: opac(x), transform: 'none' }
      ], { duration: 1100, delay: (primeira ? 300 : 120) + k * 55, easing: 'cubic-bezier(.16,1.1,.3,1)' });
    });
    c.letras.forEach((n, k) => anima(n, [{ opacity: 0, transform: 'translateY(.32em) rotate(5deg)' }, { opacity: 1, transform: 'none' }],
      { duration: 800, delay: (primeira ? 100 : 180) + Math.min(k, 24) * 30, easing: 'cubic-bezier(.16,1,.3,1)' }));
  }
  function sair(c, dir) {
    const u = uPx(), pe = emPe.matches;
    c.cena.classList.remove('is-on'); c.cena.classList.add('is-leaving');
    if (calmo.matches) { [c.pin, ...c.itens.map(x => x.inn), ...c.letras].forEach(n => anima(n, [{ opacity: 0 }], { duration: 200 })); return; }
    anima(c.pin, [{ opacity: 0, transform: `translate(${-dir * 40 * u}px, ${-4 * u}px) rotate(${-dir * 20}deg) scale(.82)` }], { duration: 520, easing: 'cubic-bezier(.6,0,.9,.4)' });
    c.itens.forEach((x, k) => {
      const [px, py] = (pe && x.it.m) || x.it.d, n = Math.hypot(px, py) || 1;
      anima(x.inn, [{ opacity: 0, transform: `translate(${px / n * 16 * u}px, ${py / n * 16 * u}px) rotate(${(k % 2 ? 1 : -1) * 50}deg) scale(.6)` }], { duration: 480, delay: k * 20, easing: 'cubic-bezier(.6,0,.9,.4)' });
    });
    c.letras.forEach((n, k) => anima(n, [{ opacity: 0, transform: 'translateY(-.22em)' }], { duration: 300, delay: k * 12, easing: 'ease-in' }));
  }
  function tingir(p, imediato) {
    hero.style.setProperty('--on', p.on); hero.style.setProperty('--bg', p.bg);
    document.documentElement.style.setProperty('--topo-cor', p.on); document.documentElement.style.setProperty('--topo-contra', p.bg);
    if (imediato) { washA.style.background = fundo(p); hero.style.background = p.bg; return; }
    washB.style.background = fundo(p);
    const cy = cyAtual();
    washB._a && washB._a.cancel();
    washB._a = washB.animate([{ clipPath: `circle(0% at 50% ${cy})` }, { clipPath: `circle(130% at 50% ${cy})` }], { duration: calmo.matches ? 250 : 1050, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' });
    washB._a.onfinish = () => { washA.style.background = fundo(p); hero.style.background = p.bg; washB._a.cancel(); };
  }
  function escrever(p) {
    const tipo = $('.tipo', info);
    if (unico) { const c = catDe(p.cat); tipo.textContent = c ? c.nome : ''; tipo.href = href(p.cat); tipo.dataset.rota = p.cat; }
    else tipo.textContent = p.tipo;
    $('.nome', info).textContent = p.nome; $('.notas', info).textContent = p.frase;
    $('.preco', info).textContent = brl(preco(p.id)); $('.peso', info).textContent = unico ? p.peso : '';
    const d = $('.detalhes', info); if (d) { d.href = href('p-' + p.id); d.dataset.rota = 'p-' + p.id; d.dataset.cor = p.bg; d.setAttribute('aria-label', `Ver detalhes de ${p.nome}`); }
  }
  function trocarTexto(p) {
    if (calmo.matches) { escrever(p); return; }
    const filhos = [...info.children];
    filhos.forEach((n, k) => anima(n, [{ opacity: 0, transform: 'translateY(-8px)' }], { duration: 200, delay: k * 25, easing: 'ease-in' }));
    setTimeout(() => { escrever(p);
      filhos.forEach((n, k) => anima(n, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: 180 + k * 70, easing: 'cubic-bezier(.16,1,.3,1)' }));
    }, 330);
  }
  function marcar(i) {
    cenas.forEach((c, k) => { if (c.mini) { c.mini.classList.toggle('is-on', k === i); c.mini.setAttribute('aria-selected', k === i); } });
    const n = $('.passo-n', hero); if (n) n.textContent = `${i + 1} / ${lista.length}`;
  }
  function ir(i, dir) {
    if (!vivo || i === atual) return;
    if (ocupado) { fila = [i, dir]; return; }
    ocupado = true;
    const de = cenas[atual], para = cenas[i];
    sair(de, dir);
    if (para.mini) { para.mini.classList.remove('is-on'); void para.mini.offsetWidth; }
    marcar(i); trocarTexto(para.p);
    setTimeout(() => tingir(para.p), 90);
    setTimeout(() => entrar(para, dir), calmo.matches ? 150 : 300);
    atual = i;
    setTimeout(() => { de.cena.classList.remove('is-leaving'); ocupado = false; if (fila) { const [fi, fd] = fila; fila = null; ir(fi, fd); } }, calmo.matches ? 350 : 1150);
  }
  const passo = d => { if (lista.length > 1) ir((atual + d + lista.length) % lista.length, d); };

  /* controles */
  hero.addEventListener('click', e => {
    if (e.target.closest('[data-prox]')) passo(1);
    else if (e.target.closest('[data-ant]')) passo(-1);
    else if (e.target.closest('[data-mais]')) { qtd = Math.min(99, qtd + 1); $('.qtd output', hero).textContent = qtd; }
    else if (e.target.closest('[data-menos]')) { qtd = Math.max(1, qtd - 1); $('.qtd output', hero).textContent = qtd; }
    else { const b = e.target.closest('[data-por]'); if (b) adicionar(lista[atual].id, unico ? qtd : 1, b); }
  });
  let toque = null;
  hero.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') toque = { x: e.clientX, y: e.clientY }; });
  hero.addEventListener('pointerup', e => { if (!toque) return; const dx = e.clientX - toque.x, dy = e.clientY - toque.y; toque = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) passo(dx < 0 ? 1 : -1); });
  hero.addEventListener('pointercancel', () => { toque = null; });

  let pausas = 0;
  const pausar = v => { pausas = Math.max(0, pausas + (v ? 1 : -1)); hero.classList.toggle('pausa', pausas > 0 || document.hidden); };
  [info, minisEl, $('.passo', hero)].filter(Boolean).forEach(n => {
    n.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') pausar(true); });
    n.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') pausar(false); });
  });

  let alvoX = 0, alvoY = 0, px = 0, py = 0, rodando = false;
  function quadro() {
    px += (alvoX - px) * .07; py += (alvoY - py) * .07;
    hero.style.setProperty('--px', px.toFixed(3)); hero.style.setProperty('--py', py.toFixed(3));
    if (vivo && Math.abs(alvoX - px) + Math.abs(alvoY - py) > .002) requestAnimationFrame(quadro); else rodando = false;
  }
  hero.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || calmo.matches) return;
    const r = hero.getBoundingClientRect();
    alvoX = -((e.clientX - r.left) / r.width - .5) * 2; alvoY = -((e.clientY - r.top) / r.height - .5) * 2;
    if (!rodando) { rodando = true; requestAnimationFrame(quadro); }
  });

  function abrir() {
    hero.style.setProperty('--auto', AUTO_MS + 'ms');
    escrever(lista[0]); tingir(lista[0], true); ajustar();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => vivo && ajustar());
    const comecar = () => { if (!vivo) return; ajustar(); marcar(0); entrar(cenas[0], 1, true); };
    const pronto = cenas[0].pimg.decode ? cenas[0].pimg.decode().catch(() => {}) : Promise.resolve();
    Promise.race([pronto, new Promise(r => setTimeout(r, 2500))]).then(comecar);
  }
  return { el: hero, abrir, ajustar, passo, pausar, repintar: () => { ajustar(); washA.style.background = fundo(lista[atual]); },
    fim: () => { vivo = false; }, visivel: () => hero.getBoundingClientRect().bottom > innerHeight * .4 };
}

/* ═════════ Peças de página ═════════ */
function cartao(p) {
  const ings = [...new Set(p.itens.map(i => i.src))].slice(0, 2);
  return `<article class="cartao" style="--cor:${p.bg};--brilho:${p.brilho};--sobre:${p.on};--tilt:${p.tilt}deg">
    <a class="cartao-link" href="${href('p-' + p.id)}" data-rota="p-${p.id}" data-cor="${p.bg}">
      <span class="cartao-palco"><span class="cartao-bolha"></span>
        <img class="cartao-img" src="${A('m-' + p.id)}" alt="" loading="lazy">
        ${ings.map((s, i) => `<img class="cartao-ing ${i ? 'b' : 'a'}" src="${A(s)}" alt="" loading="lazy">`).join('')}
      </span>
      <span class="cartao-nome">${esc(p.nome)}</span>
      <span class="cartao-tipo">${esc(p.frase)}</span>
      <span class="cartao-preco">${brl(preco(p.id))}</span>
    </a>
    <button class="cartao-add" type="button" data-add="${p.id}" aria-label="Adicionar ${esc(p.nome)} à sacola">${MAIS}</button>
  </article>`;
}
const deriva = (src, estilo, v) => `<span class="deriva" data-v="${v}" style="${estilo}"><img src="${A(src)}" alt="" loading="lazy"></span>`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/* ───────── Início ───────── */
function verInicio(app) {
  const lista = (CFG.vitrine || []).map(id => porId[id]).filter(Boolean);
  const v = vitrine(lista.length ? lista : P.slice(0, 5), 'inicio');
  app.append(v.el); vitrineAtual = v;

  const destaques = (CFG.destaques || []).map(id => porId[id]).filter(Boolean);
  const tile = (c, i) => {
    const capa = porId[c.capa], n = P.filter(p => p.cat === c.id).length, grande = i === 0;
    const extras = (c.extras || []).map(id => porId[id]).filter(Boolean);
    return `<a class="cat ${grande ? 'cat-grande' : 'cat-pequena' + (capa.alto ? '' : ' larga')}" href="${href(c.id)}" data-rota="${c.id}" data-cor="${capa.bg}"
        style="--cor:${capa.bg};--brilho:${capa.brilho};--sobre:${capa.on};--rot:${capa.alto ? 9 : -8}deg">
      <img class="cat-img${grande ? ' a' : ''}" src="${A((grande ? 'p-' : 'm-') + capa.id)}" alt="" loading="lazy">
      ${grande ? extras.map((e, k) => `<img class="cat-img ${k ? 'c' : 'b'}" src="${A('m-' + e.id)}" alt="" loading="lazy">`).join('') : ''}
      <span class="cat-nome">${esc(c.nome)}</span><span class="cat-desc">${esc(c.desc)}</span><span class="cat-n">${plural(n, 'produto', 'produtos')}</span>
    </a>`;
  };
  const resto = el('div');
  resto.innerHTML = `
  <section class="secao" aria-labelledby="t-cats"><div class="dentro">
    <div class="secao-cab"><div><h2 class="display t1" id="t-cats">Por onde começar</h2><p>Quatro famílias de produtos, todas feitas à mão.</p></div>${elo('produtos', 'Ver todos os produtos', 'elo')}</div>
    <div class="cats">${CATS.map(tile).join('')}</div>
  </div></section>
  <section class="secao" aria-labelledby="t-dest" style="padding-top:0"><div class="dentro">
    <div class="secao-cab"><div><h2 class="display t1" id="t-dest">Destaques</h2><p>Uma seleção para conhecer a casa.</p></div></div>
    <div class="grade">${destaques.map(cartao).join('')}</div>
  </div></section>
  <section class="secao" id="sobre" aria-labelledby="t-sobre" style="padding-top:0"><div class="dentro sobre">
    <div class="sobre-foto"><img src="${A('atelie')}" alt="Barras de sabonete artesanal sobre a bancada, com alecrim e lavanda" loading="lazy">
      ${deriva('i-alecrim', 'left:-9%;top:6%;--w:150px;--r:-18deg', .12)}${deriva('i-camomila', 'right:-7%;top:44%;--w:104px;--r:10deg', -.16)}${deriva('i-lavanda', 'right:12%;bottom:3%;--w:66px;--r:24deg', .16)}
    </div>
    <div class="sobre-texto">
      <h2 class="display t1" id="t-sobre">${esc(SOBRE.titulo || '')}</h2>
      ${(SOBRE.paragrafos || []).map((t, i) => `<p${i === 1 ? ' class="solta"' : ''}>${esc(t)}</p>`).join('')}
      <ul class="fatos"><li>Feito à mão, em pequenos lotes</li><li>Base glicerinada vegetal</li><li>Sem testes em animais</li></ul>
    </div>
  </div></section>`;
  app.append(...resto.children);
  v.abrir();
  document.title = 'Bubble Sisters — sabonetes artesanais, body splash, manteigas e sprays de ambiente';
}

/* ───────── Catálogo ───────── */
function verCatalogo(app, catId) {
  const cat = catDe(catId), lista = cat ? P.filter(p => p.cat === cat.id) : P;
  const grupos = [];
  const por = (chave, nome) => { let g = grupos.find(x => x.chave === chave); if (!g) grupos.push(g = { chave, nome, itens: [] }); return g; };
  lista.forEach(p => { if (!cat) por(p.cat, catDe(p.cat).nome).itens.push(p); else if (cat.id === 'sabonetes') por(p.grupo, p.grupo).itens.push(p); else por('x', '').itens.push(p); });
  const sec = el('section', 'secao pagina');
  sec.innerHTML = `<div class="dentro">
    <div class="secao-cab"><div><h1 class="display t1">${esc(cat ? cat.nome : 'Todos os produtos')}</h1><p>${cat ? esc(cat.desc) + ' ' : ''}${plural(lista.length, 'produto', 'produtos')}.</p></div></div>
    <nav class="filtros" aria-label="Filtrar por categoria">${elo('produtos', 'Todos', 'filtro', cat ? '' : ' aria-current="page"')}${CATS.map(c => elo(c.id, esc(c.nome), 'filtro', cat && c.id === cat.id ? ' aria-current="page"' : '')).join('')}</nav>
    <div class="grade">${grupos.map(g => (g.nome && grupos.length > 1 ? `<h2 class="display t3 grupo-titulo">${esc(g.nome)}</h2>` : '') + g.itens.map(cartao).join('')).join('')}</div>
  </div>`;
  app.append(sec);
  document.title = `${cat ? cat.nome : 'Todos os produtos'} — Bubble Sisters`;
}

/* ───────── Produto ───────── */
function verProduto(app, p) {
  const v = vitrine([p], 'produto'); app.append(v.el); vitrineAtual = v;
  const n = p.notas, blocoA = [], blocoB = [];
  blocoA.push(`<div class="ficha-bloco"><h2 class="display t3">Composição</h2><p>${esc(p.comp)}</p>
    ${p.selos.length ? `<ul class="selos">${p.selos.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    <p class="legenda" style="margin-top:18px">${esc(p.tipo)}${p.peso ? `, ${esc(p.peso)}` : ''}</p></div>`);
  if (n) blocoB.push(`<div class="ficha-bloco"><h2 class="display t3">Notas olfativas</h2><dl class="piramide">
      <div><dt>Saída</dt><dd>${esc(n.saida.join(', '))}</dd></div><div><dt>Coração</dt><dd>${esc(n.coracao.join(', '))}</dd></div><div><dt>Fundo</dt><dd>${esc(n.fundo.join(', '))}</dd></div></dl></div>`);
  if (p.beneficios) blocoB.push(`<div class="ficha-bloco"><h2 class="display t3">O que ele faz</h2><p>${esc(p.beneficios)}</p></div>`);
  if (p.uso) blocoB.push(`<div class="ficha-bloco"><h2 class="display t3">Como usar</h2><p>${esc(p.uso)}</p></div>`);
  if (p.aviso) blocoB.push(`<div class="ficha-bloco"><p class="aviso">${esc(p.aviso)}</p></div>`);
  const rot = p.rotulos.length ? `<div class="ficha-bloco"><h2 class="display t3">${n ? 'Notas em destaque' : 'Em destaque na fórmula'}</h2>
      <ul class="destaques-ing">${p.rotulos.map(r => `<li><img src="${A(r.src)}" alt="" loading="lazy">${esc(r.nome)}</li>`).join('')}</ul></div>` : '';
  (blocoB.length ? blocoA : blocoB).push(rot);
  const mesma = P.filter(x => x.cat === p.cat && x.id !== p.id);
  const iguais = mesma.filter(x => x.grupo === p.grupo), outros = mesma.filter(x => x.grupo !== p.grupo);
  const combina = [...iguais, ...outros, ...P.filter(x => x.cat !== p.cat)];
  const ini = P.indexOf(p) % Math.max(1, iguais.length);
  const quatro = [...iguais.slice(ini), ...iguais.slice(0, ini), ...outros, ...P.filter(x => x.cat !== p.cat)].slice(0, 4);
  const resto = el('div');
  resto.innerHTML = `<section class="secao"><div class="dentro ficha"><div>${blocoA.join('')}</div><div>${blocoB.join('')}</div></div></section>
    <section class="secao" style="padding-top:0"><div class="dentro">
      <div class="secao-cab"><h2 class="display t2">Combina com</h2>${elo(p.cat, `Ver ${esc(catDe(p.cat).nome.toLowerCase())}`, 'elo')}</div>
      <div class="grade">${(quatro.length ? quatro : combina.slice(0, 4)).map(cartao).join('')}</div></div></section>`;
  app.append(...resto.children);
  v.abrir();
  document.title = `${p.nome} — Bubble Sisters`;
}

/* ───────── Pedido (dados e endereço antes do pagamento) ───────── */
function linhasResumo(r) {
  return r.linhas.map(({ p, q, sub }) => `<div class="linha-item"><span class="linha-foto" style="--cor:${p.bg};--brilho:${p.brilho}"><img src="${A('m-' + p.id)}" alt=""></span>
    <div><p class="linha-nome">${esc(p.nome)}</p><p class="linha-sub">${q} × ${brl(preco(p.id))}</p></div><span class="linha-preco">${brl(sub)}</span></div>`).join('');
}
function verPedido(app) {
  document.title = 'Finalizar pedido — Bubble Sisters';
  const sec = el('section', 'secao pagina'); app.append(sec);
  if (!Sacola.qtd()) { sec.innerHTML = `<div class="dentro centro"><h1 class="display t1">Sua sacola está vazia</h1><p>Escolha os produtos e volte aqui para finalizar.</p><div class="acoes">${elo('produtos', 'Ver produtos', 'btn')}</div></div>`; return; }
  const campo = (nome, rot, cls, attrs = '') => `<label class="campo ${cls}"><span>${rot}</span><input name="${nome}" ${attrs}><small></small></label>`;
  sec.innerHTML = `<div class="dentro"><div class="secao-cab"><div><h1 class="display t1">Finalizar pedido</h1><p>Preencha seus dados e o endereço. O pagamento é feito no Mercado Pago, com Pix, cartão ou boleto.</p></div></div>
    <form class="pedido" id="formPedido" novalidate>
      <div>
        <fieldset><legend class="display t3">Seus dados</legend><div class="campos">
          ${campo('nome', 'Nome completo', 'c6', 'autocomplete="name" required')}
          ${campo('email', 'E-mail', 'c3', 'type="email" autocomplete="email" required')}
          ${campo('telefone', 'WhatsApp com DDD', 'c3', 'type="tel" inputmode="tel" autocomplete="tel" required')}
        </div></fieldset>
        <fieldset><legend class="display t3">Entrega</legend><div class="campos">
          ${campo('cep', 'CEP', 'c2', 'inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000" required')}
          ${campo('rua', 'Rua ou avenida', 'c4', 'autocomplete="address-line1" required')}
          ${campo('numero', 'Número', 'c2', 'required')}
          ${campo('complemento', 'Complemento (opcional)', 'c4', 'autocomplete="address-line2"')}
          ${campo('bairro', 'Bairro', 'c2', 'required')}
          ${campo('cidade', 'Cidade', 'c2', 'autocomplete="address-level2" required')}
          ${campo('uf', 'Estado (UF)', 'c2', 'maxlength="2" autocomplete="address-level1" required')}
        </div></fieldset>
      </div>
      <aside class="resumo" aria-label="Resumo do pedido"><h2 class="display t3">Resumo</h2><div id="resumoLinhas"></div>
        <p class="frete-info" id="resumoFrete"></p><div class="totais" id="resumoTotais"></div>
        <button class="btn btn-largo" type="submit" id="pagar">Ir para o pagamento</button>
        <p class="erro-msg nota" id="pedidoErro" role="alert" hidden></p>
        <p class="nota">Prefere combinar por mensagem? <a class="elo" id="pedidoWhats" target="_blank" rel="noopener" href="#">Finalizar pelo WhatsApp</a></p>
      </aside>
    </form></div>`;
  const f = $('#formPedido'), cep = f.elements.cep;
  cep.value = mascaraCep(Sacola.cep);
  const pintar = () => {
    const r = Sacola.resumo();
    $('#resumoLinhas').innerHTML = linhasResumo(r);
    $('#resumoFrete').textContent = r.regiao ? `${r.regiao.regiao}: ${r.gratis ? 'frete grátis' : brl(r.regiao.valor)}, ${r.regiao.prazo}.` : 'Informe o CEP para calcular o frete.';
    $('#resumoTotais').innerHTML = `<div><span>Subtotal</span><span>${brl(r.subtotal)}</span></div><div><span>Frete</span><span>${r.frete == null ? 'a calcular' : r.frete ? brl(r.frete) : 'grátis'}</span></div><div class="total"><span>Total</span><span>${brl(r.total)}</span></div>`;
    $('#pedidoWhats').href = linkWhats(textoWhats());
  };
  pintar();
  async function buscarCep(d) { // preenche rua, bairro e cidade pelo CEP; se a consulta falhar, a pessoa digita
    if (HASH) return;
    try { const j = await (await fetch(`https://viacep.com.br/ws/${d}/json/`)).json(); if (j.erro) return;
      [['rua', j.logradouro], ['bairro', j.bairro], ['cidade', j.localidade], ['uf', j.uf]].forEach(([k, val]) => { if (val && !f.elements[k].value) f.elements[k].value = val; });
    } catch (e) { /* sem consulta: segue manual */ }
  }
  cep.addEventListener('input', () => { cep.value = mascaraCep(cep.value); const d = soDigitos(cep.value); Sacola.cep = d; Sacola.salvar(); pintar(); if (d.length === 8) buscarCep(d); });
  f.elements.uf.addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });

  const erroDe = (inp, msg) => { inp.setAttribute('aria-invalid', msg ? 'true' : 'false'); inp.parentNode.querySelector('small').textContent = msg || ''; };
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const v = k => f.elements[k].value.trim(); let primeiro = null;
    const checar = (k, ok, msg) => { const inp = f.elements[k]; erroDe(inp, ok ? '' : msg); if (!ok && !primeiro) primeiro = inp; };
    checar('nome', v('nome').length > 2, 'Escreva seu nome completo.');
    checar('email', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('email')), 'Confira o e-mail.');
    checar('telefone', soDigitos(v('telefone')).length >= 10, 'Informe o número com DDD.');
    checar('cep', !!freteDe(v('cep')), 'Não encontramos esse CEP.');
    checar('rua', v('rua').length > 2, 'Informe a rua.');
    checar('numero', v('numero').length > 0, 'Informe o número.');
    checar('bairro', v('bairro').length > 1, 'Informe o bairro.');
    checar('cidade', v('cidade').length > 1, 'Informe a cidade.');
    checar('uf', /^[A-Z]{2}$/.test(v('uf')), 'Use a sigla, como SP.');
    if (primeiro) { primeiro.focus(); return; }
    const erro = $('#pedidoErro'), btn = $('#pagar'); erro.hidden = true;
    if (HASH) { erro.hidden = false; erro.className = 'aviso-caixa'; erro.textContent = 'Esta é a prévia do site. No site publicado, este botão leva ao Mercado Pago para pagar com Pix, cartão ou boleto.'; return; }
    btn.disabled = true; btn.textContent = 'Abrindo o Mercado Pago';
    try {
      const resp = await fetch(R + 'pagamento/criar.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: Object.entries(Sacola.itens).map(([id, q]) => ({ id, qtd: q })),
          cliente: { nome: v('nome'), email: v('email'), telefone: v('telefone'), cep: soDigitos(v('cep')), rua: v('rua'), numero: v('numero'), complemento: v('complemento'), bairro: v('bairro'), cidade: v('cidade'), uf: v('uf') } }) });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok || !j.url) throw new Error(j.erro || 'Não foi possível abrir o pagamento agora.');
      location.href = j.url;
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Ir para o pagamento';
      erro.hidden = false; erro.className = 'erro-msg nota'; erro.textContent = `${err.message} Você pode tentar de novo ou finalizar pelo WhatsApp.`;
    }
  });
}

/* ───────── Depois do pagamento ───────── */
function verObrigado(app) {
  const q = new URLSearchParams(location.search), st = q.get('collection_status') || q.get('status') || '', ped = q.get('external_reference') || q.get('pedido') || '';
  const ok = st === 'approved', espera = st === 'pending' || st === 'in_process', falhou = !!st && !ok && !espera;
  if (ok || espera) { Sacola.limpar(); pintarSacola(); }
  const num = ped ? ` ${esc(ped)}` : '';
  const [tit, txt] = ok ? ['Pagamento aprovado', `Recebemos o pedido${num}. Vamos preparar tudo e avisar pelo WhatsApp quando sair para entrega.`]
    : espera ? ['Pagamento em análise', `Assim que o Mercado Pago confirmar, começamos a preparar o pedido${num}.`]
    : falhou ? ['O pagamento não foi concluído', 'Nada foi cobrado. Você pode tentar de novo ou finalizar pelo WhatsApp.']
    : ['Obrigada pela visita', 'Se você acabou de fazer um pedido e ficou com alguma dúvida, fale com a gente pelo WhatsApp.'];
  const sec = el('section', 'secao pagina');
  sec.innerHTML = `<div class="dentro centro"><h1 class="display t1">${tit}</h1><p>${txt}</p><div class="acoes">
    ${falhou ? elo('pedido', 'Tentar de novo', 'btn') : elo('produtos', 'Continuar olhando', 'btn')}
    <a class="elo" target="_blank" rel="noopener" href="${linkWhats(ped ? `Olá! Fiz o pedido ${ped} no site da Bubble Sisters.` : 'Olá! Vim pelo site da Bubble Sisters.')}">Falar pelo WhatsApp</a></div></div>`;
  app.append(sec);
  document.title = `${tit} — Bubble Sisters`;
}
function verNada(app) {
  const sec = el('section', 'secao pagina');
  sec.innerHTML = `<div class="dentro centro"><h1 class="display t1">Página não encontrada</h1><p>O endereço pode ter mudado. Os produtos continuam todos aqui.</p><div class="acoes">${elo('produtos', 'Ver produtos', 'btn')}</div></div>`;
  app.append(sec); document.title = 'Página não encontrada — Bubble Sisters';
}

/* ═════════ Roteador ═════════ */
function desenhar() {
  const app = $('#app'), rota = rotaAtual();
  if (vitrineAtual) { vitrineAtual.fim(); vitrineAtual = null; }
  app.innerHTML = ''; app.removeAttribute('style');
  if (rota === 'inicio' || rota === 'sobre') verInicio(app);
  else if (rota === 'produtos' || catDe(rota)) verCatalogo(app, rota);
  else if (rota.startsWith('p-') && porId[rota.slice(2)]) verProduto(app, porId[rota.slice(2)]);
  else if (rota === 'pedido') verPedido(app);
  else if (rota === 'obrigado') verObrigado(app);
  else verNada(app);

  $$('.menu a, .menu-movel a').forEach(a => a.dataset.rota === rota ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  if (!vitrineAtual) { document.documentElement.style.removeProperty('--topo-cor'); document.documentElement.style.removeProperty('--topo-contra'); }
  ajustarTopo(); derivar();
  if (rota === 'sobre' || (!HASH && location.hash === '#sobre')) { const s = $('#sobre'); s && requestAnimationFrame(() => s.scrollIntoView()); }
  else if (HASH) scrollTo(0, 0);
  abrirCortina();
}
function ajustarTopo() {
  const topo = $('.topo'), hero = $('.hero');
  topo.classList.toggle('solto', !hero || scrollY > hero.offsetHeight - topo.offsetHeight - 8);
}
let derivando = false;
function derivar() {
  if (calmo.matches) return;
  $$('.deriva').forEach(d => {
    const r = d.getBoundingClientRect(), dy = d._dy || 0, centro = r.top - dy + r.height / 2 - innerHeight / 2;
    d._dy = Math.max(-140, Math.min(140, centro * Number(d.dataset.v || .1)));
    d.style.setProperty('--dy', d._dy.toFixed(1) + 'px');
  });
}

function iniciar() {
  Sacola.carregar(); moldura(); pintarSacola();

  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) { e.preventDefault(); adicionar(add.dataset.add, 1, add); return; }
    const a = e.target.closest('a[data-rota]'); if (!a) return;
    if (a.closest('.sacola, .menu-movel')) fecharPaineis();
    if (a.getAttribute('href') === '#') { e.preventDefault(); return; }
    const cor = a.dataset.cor;
    if (!cor || calmo.matches || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    cortina(e.clientX, e.clientY, cor).then(() => { if (HASH && location.hash === a.hash) abrirCortina(); location.href = a.href; });
  });
  document.addEventListener('keydown', e => {
    if (!vitrineAtual || !vitrineAtual.visivel() || $('.sacola.aberto, .menu-movel.aberto')) return;
    if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (e.key === 'ArrowRight') vitrineAtual.passo(1);
    if (e.key === 'ArrowLeft') vitrineAtual.passo(-1);
  });
  document.addEventListener('visibilitychange', () => { if (vitrineAtual) { vitrineAtual.pausar(true); vitrineAtual.pausar(false); } });
  addEventListener('scroll', () => { ajustarTopo(); if (!derivando) { derivando = true; requestAnimationFrame(() => { derivando = false; derivar(); }); } }, { passive: true });
  let largura = innerWidth;
  addEventListener('resize', () => { if (vitrineAtual) { if (innerWidth !== largura) vitrineAtual.repintar(); else vitrineAtual.ajustar(); } largura = innerWidth; ajustarTopo(); });
  emPe.addEventListener('change', () => vitrineAtual && vitrineAtual.repintar());
  addEventListener('pageshow', e => { if (e.persisted) { cortinaViva = true; abrirCortina(); } });
  if (HASH) addEventListener('hashchange', desenhar);
  desenhar();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
