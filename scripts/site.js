
const PRODUCTS = window.TILLMAN_PRODUCTS || [];
const LOGO = "https://static.wixstatic.com/media/b9ac0a_ce71b1d760ca423f862982d22754932f~mv2.png/v1/crop/x_282,y_25,w_1702,h_1629/fill/w_300,h_287,al_c,q_90/KRellA-Tillman%20Tough(Revised)%20(2).png";
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const money = n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));
const normalize=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');

function productScore(p,q){
  const raw=String(q||'').trim().toLowerCase(), n=normalize(raw);
  if(!n) return 0;
  const sku=normalize(p.sku), name=p.name.toLowerCase(), brand=p.brand.toLowerCase(), desc=p.description.toLowerCase();
  if(sku===n) return 1000;
  if(sku.startsWith(n)) return 850;
  if(sku.includes(n)) return 720;
  if(normalize(name).includes(n)) return 520;
  if(name.includes(raw)) return 470;
  if(brand.includes(raw)) return 330;
  if(desc.includes(raw)) return 100;
  return 0;
}
function findProducts(q,limit=8){
  return PRODUCTS.map(p=>({p,score:productScore(p,q)})).filter(x=>x.score).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.p);
}
function productCard(p){
  return `<article class="product-card">
    <a class="product-media" href="product.html?id=${encodeURIComponent(p.id)}">
      ${p.ribbon?`<span class="ribbon">${p.ribbon}</span>`:''}
      <img loading="lazy" src="${p.image}" alt="${p.name}" onerror="this.src='https://placehold.co/700x700/ffffff/111111?text=Tillman+Tough'">
    </a>
    <div class="product-body">
      <div class="product-brand">${p.brand}</div>
      <a class="product-title" href="product.html?id=${encodeURIComponent(p.id)}">${p.name}</a>
      <div class="product-sku">SKU: <strong>${p.sku}</strong></div>
      <div class="${p.inStock?'stock':'stock out'}">${p.inStock?'Available':'Out of stock'}</div>
      <div class="product-price">${money(p.price)}</div>
      <div class="card-actions"><button data-add="${p.id}">Add to cart</button><a href="product.html?id=${encodeURIComponent(p.id)}">View</a></div>
    </div>
  </article>`;
}
function header(){
  return `<div class="utility"><div class="container utility-inner">
    <div class="utility-links"><span>Professional tools & equipment</span><a href="contact.html">Customer support</a></div>
    <div class="utility-links"><span>USD ($)</span><a href="#">Log in</a></div>
  </div></div>
  <header class="header"><div class="container nav">
    <a class="logo" href="index.html"><img src="${LOGO}" alt="Krella Tillman Sales Group logo"><div class="logo-copy"><strong>Tillman Tough</strong><span>Krella Tillman Sales Group</span></div></a>
    <nav class="navlinks">
      <a href="index.html">Home</a><a href="shop.html">Categories</a><a href="shop.html">Shop All</a>
      <a href="shop.html?sort=new">New Products</a><a href="shop.html?sort=promotion">Promotion</a><a href="shop.html?sort=editors">Editors Pick</a>
      <a href="about.html">About</a><a href="contact.html">Contact</a>
    </nav>
    <div class="nav-actions"><button class="nav-button" id="cartBtn">Cart <span id="cartCount">0</span></button><a class="nav-button primary-nav" href="shop.html">Shop Now</a><button class="menu-btn" id="menuBtn">Menu</button></div>
  </div></header>
  <nav class="mobile-nav" id="mobileNav">
    <a href="index.html">Home</a><a href="shop.html">Categories</a><a href="shop.html">Shop All</a><a href="shop.html?sort=new">New Products</a>
    <a href="shop.html?sort=promotion">Promotion</a><a href="shop.html?sort=editors">Editors Pick</a><a href="about.html">About</a><a href="contact.html">Contact</a>
    <a href="bulk-order.html">Bulk Order</a><a href="source-item.html">Source an Item</a>
  </nav>`;
}
function footer(){
  return `<footer class="footer"><div class="container"><div class="footer-grid">
    <div><a class="logo" href="index.html"><img src="${LOGO}" alt="Tillman Tough logo"><div class="logo-copy"><strong>Tillman Tough</strong><span>Krella Tillman Sales Group</span></div></a><p style="color:#aaa;margin-top:18px;max-width:440px">Professional tools, equipment and accessories selected for tradespeople, workshops and serious DIYers.</p></div>
    <div><h4>Company</h4><a href="index.html">Home</a><a href="shop.html">Shop</a><a href="about.html">About Us</a><a href="contact.html">Contact Us</a></div>
    <div><h4>Buying Support</h4><a href="bulk-order.html">Bulk Order by SKU</a><a href="quote.html">Request a Quote</a><a href="source-item.html">Source an Item</a><a href="contact.html">Product Support</a></div>
    <div><h4>Policies</h4><a href="https://www.tillmantough.com/return-policy" target="_blank">Return Policy</a><a href="https://www.tillmantough.com/copy-of-return-policy" target="_blank">Privacy Policy</a><a href="#">Facebook</a><a href="#">Instagram</a></div>
  </div><div class="footer-bottom">© 2026 Krella Tillman Sales Group. All Rights Reserved.</div></div></footer>`;
}
function cartMarkup(){
  return `<div class="overlay" id="overlay"></div><aside class="cart-drawer" id="cartDrawer"><div class="cart-head"><h3>Your cart</h3><button class="nav-button" id="closeCart">Close</button></div><div id="cartItems"></div><div id="cartTotal" style="font-size:1.25rem;font-weight:950;margin:20px 0"></div><a class="btn btn-yellow" style="width:100%" href="quote.html">Continue to quote</a><p class="muted" style="font-size:.78rem;margin-top:12px">This review demonstrates product selection. Final checkout remains connected to the live Wix store.</p></aside>`;
}
function getCart(){try{return JSON.parse(localStorage.getItem('tt-cart')||'[]')}catch{return[]}}
function saveCart(c){localStorage.setItem('tt-cart',JSON.stringify(c));renderCart()}
function addCart(id,qty=1){const c=getCart(),r=c.find(x=>x.id===id);if(r)r.qty+=qty;else c.push({id,qty});saveCart(c);openCart()}
function renderCart(){
  const c=getCart(),count=c.reduce((s,x)=>s+x.qty,0);
  if($('#cartCount')) $('#cartCount').textContent=count;
  const host=$('#cartItems'); if(!host)return;
  if(!c.length){host.innerHTML='<div class="empty">Your cart is empty.</div>';$('#cartTotal').textContent='';return}
  let total=0;
  host.innerHTML=c.map(r=>{const p=PRODUCTS.find(x=>x.id===r.id);if(!p)return'';total+=p.price*r.qty;return `<div class="cart-item"><img src="${p.image}" alt=""><div><b>${p.name}</b><small style="display:block">SKU ${p.sku} · Qty ${r.qty}</small></div><button class="nav-button" data-remove="${p.id}">×</button></div>`}).join('');
  $('#cartTotal').textContent=`Estimated total: ${money(total)}`;
  $$('[data-remove]').forEach(b=>b.onclick=()=>saveCart(c.filter(x=>x.id!==b.dataset.remove)));
}
function openCart(){$('#cartDrawer')?.classList.add('open');$('#overlay')?.classList.add('open');document.body.classList.add('drawer-open')}
function closeCart(){$('#cartDrawer')?.classList.remove('open');$('#overlay')?.classList.remove('open');document.body.classList.remove('drawer-open')}
function bindSearch(input,panel){
  if(!input||!panel)return;
  const show=()=>{
    const q=input.value.trim(),hits=findProducts(q,6);
    if(!q){panel.classList.remove('open');return}
    panel.innerHTML=hits.length?hits.map(p=>`<a class="suggestion" href="product.html?id=${encodeURIComponent(p.id)}"><img src="${p.image}" alt=""><span><b>${p.name}</b><small>${p.brand} · SKU ${p.sku}</small></span><strong>${money(p.price)}</strong></a>`).join(''):`<a class="suggestion" href="source-item.html?q=${encodeURIComponent(q)}"><span></span><span><b>No exact match found</b><small>Send this SKU or part number for sourcing.</small></span><strong>Request</strong></a>`;
    panel.classList.add('open');
  };
  input.addEventListener('input',show);input.addEventListener('focus',show);
  document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap')&&!e.target.closest('.hero-search'))panel.classList.remove('open')});
  input.closest('form')?.addEventListener('submit',e=>{e.preventDefault();location.href='shop.html?q='+encodeURIComponent(input.value)});
}
function mount(){
  const h=$('#siteHeader'),f=$('#siteFooter');if(h)h.innerHTML=header();if(f)f.innerHTML=footer();
  document.body.insertAdjacentHTML('beforeend',cartMarkup());
  $('#menuBtn')?.addEventListener('click',()=>$('#mobileNav')?.classList.toggle('open'));$('#cartBtn')?.addEventListener('click',openCart);$('#closeCart')?.addEventListener('click',closeCart);$('#overlay')?.addEventListener('click',closeCart);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b)addCart(b.dataset.add,1)});
  renderCart();
}
document.addEventListener('DOMContentLoaded',mount);
