
const PRODUCTS = window.TILLMAN_PRODUCTS || [];
const LOGO = 'https://static.wixstatic.com/media/b9ac0a_ce71b1d760ca423f862982d22754932f~mv2.png/v1/crop/x_282,y_25,w_1702,h_1629/fill/w_280,h_268,al_c,q_90/KRellA-Tillman%20Tough(Revised)%20(2).png';
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));
const normalize = v => String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cleanText = v => String(v||'').replace(/\s+/g,' ').trim();

function productScore(p, q){
  const raw = String(q||'').trim().toLowerCase();
  const n = normalize(raw);
  if(!n) return 0;
  const sku = normalize(p.sku);
  const name = p.name.toLowerCase();
  const brand = p.brand.toLowerCase();
  const desc = p.description.toLowerCase();
  if(sku === n) return 1000;
  if(sku.startsWith(n)) return 800;
  if(sku.includes(n)) return 700;
  if(normalize(name).includes(n)) return 500;
  if(name.includes(raw)) return 450;
  if(brand.includes(raw)) return 300;
  if(desc.includes(raw)) return 100;
  return 0;
}
function findProducts(q, limit=8){
  return PRODUCTS.map(p=>({p,score:productScore(p,q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.p);
}
function productCard(p){
  return `<article class="product-card">
    <a class="product-media" href="product.html?id=${encodeURIComponent(p.id)}">
      ${p.ribbon ? `<span class="ribbon">${p.ribbon}</span>`:''}
      <img loading="lazy" src="${p.image}" alt="${p.name}" onerror="this.src='https://placehold.co/800x800/ffffff/111111?text=Tillman+Tough'">
    </a>
    <div class="product-body">
      <div class="product-brand">${p.brand}</div>
      <a class="product-title" href="product.html?id=${encodeURIComponent(p.id)}">${p.name}</a>
      <div class="product-sku">SKU: <strong>${p.sku}</strong></div>
      <div class="${p.inStock?'stock':'stock out'}">${p.inStock?'Available':'Out of stock'}</div>
      <div class="product-price">${money(p.price)}</div>
      <div class="card-actions">
        <button type="button" data-add="${p.id}">Add to cart</button>
        <a href="product.html?id=${encodeURIComponent(p.id)}" aria-label="View ${p.name}">View</a>
      </div>
    </div>
  </article>`;
}
function header(){
  return `<div class="topbar">Professional tools · Secure ordering · Product sourcing support</div>
  <header class="header">
   <div class="container nav">
    <a class="logo" href="index.html"><img src="${LOGO}" alt="Tillman Tough logo"><div><strong>Tillman Tough</strong><span>Krella Tillman Sales Group</span></div></a>
    <nav class="navlinks">
      <a href="shop.html">Shop</a><a href="bulk-order.html">Bulk order</a><a href="source-item.html">Source an item</a><a href="quote.html">Request quote</a><a href="about.html">About</a>
    </nav>
    <div class="nav-actions"><button class="icon-btn" id="cartBtn">Cart <span id="cartCount">0</span></button><button class="icon-btn menu-btn" id="menuBtn">Menu</button></div>
   </div>
  </header>
  <nav class="mobile-nav" id="mobileNav"><a href="shop.html">Shop</a><a href="bulk-order.html">Bulk order</a><a href="source-item.html">Source an item</a><a href="quote.html">Request quote</a><a href="about.html">About</a></nav>`;
}
function footer(){
  return `<footer class="footer"><div class="container">
   <div class="footer-grid">
    <div><div class="logo"><img src="${LOGO}" alt="Tillman Tough logo"><div><strong>Tillman Tough</strong><span>Krella Tillman Sales Group</span></div></div><p style="color:#c1c3c7;margin-top:18px">Professional tools, equipment and sourcing support for tradespeople, shops and commercial buyers.</p></div>
    <div><h4>Shop</h4><a href="shop.html">All products</a><a href="shop.html?category=Power%20Tools">Power tools</a><a href="shop.html?category=Welding">Welding</a><a href="shop.html?category=Automotive%20%26%20Diagnostics">Diagnostics</a></div>
    <div><h4>Business buying</h4><a href="bulk-order.html">Bulk order by SKU</a><a href="quote.html">Request a quote</a><a href="source-item.html">Source an item</a><a href="contact.html">Contact support</a></div>
    <div><h4>Company</h4><a href="about.html">About</a><a href="https://www.tillmantough.com/return-policy" target="_blank">Return policy</a><a href="https://www.tillmantough.com/copy-of-return-policy" target="_blank">Privacy policy</a></div>
   </div>
   <p style="color:#777;border-top:1px solid #27282b;margin-top:50px;padding-top:25px">© 2026 Krella Tillman Sales Group. Tillman Tough.</p>
  </div></footer>`;
}
function cartMarkup(){
  return `<div class="overlay" id="overlay"></div><aside class="cart-drawer" id="cartDrawer"><div class="cart-head"><h3>Your cart</h3><button class="secondary" id="closeCart">Close</button></div><div id="cartItems"></div><div id="cartTotal" style="font-size:1.3rem;font-weight:950;margin:20px 0"></div><a class="primary" style="display:block;text-align:center" href="quote.html">Request checkout / quote</a><p class="muted" style="font-size:.78rem;margin-top:12px">This review cart demonstrates product selection. Final checkout will be connected inside Wix.</p></aside>`;
}
function getCart(){ try{return JSON.parse(localStorage.getItem('tt-cart')||'[]')}catch{return []} }
function saveCart(cart){localStorage.setItem('tt-cart',JSON.stringify(cart));renderCart()}
function addCart(id,qty=1){
 const cart=getCart(); const row=cart.find(x=>x.id===id); if(row) row.qty+=qty; else cart.push({id,qty});
 saveCart(cart); openCart();
}
function renderCart(){
 const cart=getCart(); const count=cart.reduce((a,b)=>a+b.qty,0); const cc=$('#cartCount'); if(cc) cc.textContent=count;
 const host=$('#cartItems'); if(!host) return;
 if(!cart.length){host.innerHTML='<div class="empty">Your cart is empty.</div>'; $('#cartTotal').textContent=''; return}
 let total=0;
 host.innerHTML=cart.map(row=>{const p=PRODUCTS.find(x=>x.id===row.id); if(!p)return''; total+=p.price*row.qty; return `<div class="cart-item"><img src="${p.image}" alt=""><div><b>${p.name}</b><small style="display:block">SKU ${p.sku} · Qty ${row.qty}</small></div><button class="secondary" data-remove="${p.id}">×</button></div>`}).join('');
 $('#cartTotal').textContent=`Estimated total: ${money(total)}`;
 $$('[data-remove]').forEach(b=>b.onclick=()=>saveCart(cart.filter(x=>x.id!==b.dataset.remove)));
}
function openCart(){$('#cartDrawer')?.classList.add('open');$('#overlay')?.classList.add('open')}
function closeCart(){$('#cartDrawer')?.classList.remove('open');$('#overlay')?.classList.remove('open')}
function bindGlobal(){
 $('#menuBtn')?.addEventListener('click',()=>$('#mobileNav')?.classList.toggle('open'));
 $('#cartBtn')?.addEventListener('click',openCart); $('#closeCart')?.addEventListener('click',closeCart); $('#overlay')?.addEventListener('click',closeCart);
 document.addEventListener('click',e=>{const btn=e.target.closest('[data-add]'); if(btn)addCart(btn.dataset.add,1)});
 renderCart();
}
function bindSearch(input, panel, submitToShop=true){
 if(!input||!panel)return;
 const show=()=>{
   const hits=findProducts(input.value,6);
   panel.innerHTML=hits.length?hits.map(p=>`<a class="suggestion" href="product.html?id=${encodeURIComponent(p.id)}"><img src="${p.image}" alt=""><span><b>${p.name}</b><small>${p.brand} · SKU ${p.sku}</small></span><strong>${money(p.price)}</strong></a>`).join(''):`<a class="suggestion" href="source-item.html?q=${encodeURIComponent(input.value)}"><span></span><span><b>No exact match found</b><small>Send the SKU or part number and request sourcing.</small></span><strong>Request</strong></a>`;
   panel.classList.add('open');
 };
 input.addEventListener('input',show); input.addEventListener('focus',show);
 document.addEventListener('click',e=>{if(!e.target.closest('.hero-search'))panel.classList.remove('open')});
 if(submitToShop) input.closest('form')?.addEventListener('submit',e=>{e.preventDefault();location.href='shop.html?q='+encodeURIComponent(input.value)});
}
function mount(){
 const h=$('#siteHeader'); if(h)h.innerHTML=header();
 const f=$('#siteFooter'); if(f)f.innerHTML=footer();
 document.body.insertAdjacentHTML('beforeend',cartMarkup());
 bindGlobal();
}
document.addEventListener('DOMContentLoaded',mount);
