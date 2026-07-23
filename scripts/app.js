
(() => {
'use strict';
const PRODUCTS = window.TILLMAN_PRODUCTS || [];
const SITE = window.TT_SITE || {assets:{}};
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value||0));
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[character]));
const normalize = value => String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const tokenize = value => String(value||'').toLowerCase().replace(/[^a-z0-9/.-]+/g,' ').trim().split(/\s+/).filter(Boolean);
const page = document.body.dataset.page || 'home';

const KEYS = {
  cart:'tt-cart-v4',
  compare:'tt-compare-v4',
  saved:'tt-saved-v4',
  recent:'tt-recent-v4',
  searches:'tt-search-analytics-v4',
  submissions:'tt-submissions-v4',
  view:'tt-shop-view-v4'
};

function readStorage(key, fallback=[]){
  try{
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  }catch{
    return fallback;
  }
}
function writeStorage(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

const SYNONYMS = {
  'impact gun':'impact wrench',
  'jump box':'jump starter',
  'booster pack':'jump starter',
  'scan reader':'code reader',
  'diagnostic scanner':'diagnostic',
  'grinding disc':'grinding wheel',
  'cutting disc':'cut off wheel',
  'ppe':'safety apparel',
  'drill driver':'drill',
  'wire brush':'brush',
  'battery pack':'battery',
  'air gun':'air impact'
};

function expandQuery(query){
  let expanded = String(query||'').toLowerCase();
  Object.entries(SYNONYMS).forEach(([term, replacement]) => {
    if(expanded.includes(term)) expanded += ` ${replacement}`;
  });
  return expanded;
}

function editDistance(first, second){
  const a = normalize(first);
  const b = normalize(second);
  if(!a) return b.length;
  if(!b) return a.length;
  const previous = Array.from({length:b.length+1}, (_,index) => index);
  const current = new Array(b.length+1);
  for(let row=1; row<=a.length; row++){
    current[0] = row;
    for(let column=1; column<=b.length; column++){
      current[column] = Math.min(
        current[column-1] + 1,
        previous[column] + 1,
        previous[column-1] + (a[row-1] === b[column-1] ? 0 : 1)
      );
    }
    for(let column=0; column<=b.length; column++) previous[column] = current[column];
  }
  return previous[b.length];
}

function productScore(product, query){
  const raw = String(query||'').trim().toLowerCase();
  if(!raw) return 0;
  const expanded = expandQuery(raw);
  const queryNormalized = normalize(raw);
  const sku = normalize(product.sku);
  const name = String(product.name).toLowerCase();
  const brand = String(product.brand).toLowerCase();
  const category = String(product.category).toLowerCase();
  const text = String(product.searchText||'').toLowerCase();
  let score = 0;

  if(sku === queryNormalized) score += 1500;
  else if(sku.startsWith(queryNormalized)) score += 1100;
  else if(sku.includes(queryNormalized)) score += 850;

  if(normalize(name) === queryNormalized) score += 900;
  else if(normalize(name).includes(queryNormalized)) score += 600;

  if(brand === raw) score += 460;
  else if(brand.includes(raw)) score += 260;
  if(category.includes(raw)) score += 190;

  const queryTokens = tokenize(expanded);
  const productTokens = new Set(tokenize(text));
  queryTokens.forEach(token => {
    if(productTokens.has(token)) score += 100;
    else if([...productTokens].some(productToken => productToken.startsWith(token))) score += 55;
  });

  if(text.includes(expanded)) score += 220;
  if(queryNormalized.length >= 4 && sku.length && editDistance(sku, queryNormalized) <= 2) score += 410;

  if(raw.length >= 5){
    const firstNameToken = tokenize(name)[0] || '';
    if(firstNameToken && editDistance(firstNameToken, raw) <= 2) score += 120;
  }
  return score;
}

function findProducts(query, limit=20){
  return PRODUCTS
    .map(product => ({product, score:productScore(product, query)}))
    .filter(result => result.score > 0)
    .sort((a,b) => b.score-a.score || a.product.name.localeCompare(b.product.name))
    .slice(0,limit)
    .map(result => result.product);
}

const productById = id => PRODUCTS.find(product => String(product.id) === String(id));
const categoryCount = category => PRODUCTS.filter(product => product.category === category).length;
const shorten = (value, limit=54) => String(value||'').length > limit ? `${String(value).slice(0,limit-1)}…` : String(value||'');

function icon(name){
  const paths = {
    search:'M21 21l-4.35-4.35m2.35-5.65A8 8 0 1 1 3 11a8 8 0 0 1 16 0Z',
    heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z',
    compare:'M7 3v18M17 3v18M3 7h8M13 17h8',
    close:'M6 6l12 12M18 6 6 18',
    menu:'M4 7h16M4 12h16M4 17h16'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]||paths.search}"/></svg>`;
}

function toast(message){
  const element = $('#toast');
  if(!element) return;
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 2600);
}

function recordSearch(query, resultCount){
  const value = String(query||'').trim();
  if(!value) return;
  const recent = readStorage(KEYS.recent, []).filter(item => item.toLowerCase() !== value.toLowerCase());
  recent.unshift(value);
  writeStorage(KEYS.recent, recent.slice(0,6));
  const activity = readStorage(KEYS.searches, []);
  activity.push({query:value, count:resultCount, at:new Date().toISOString()});
  writeStorage(KEYS.searches, activity.slice(-100));
}

function header(){
  return `<a class="skip-link" href="#main">Skip to main content</a>
  <div class="utility"><div class="container utility-inner">
    <div class="utility-links"><span>Fast dispatch on eligible items</span><a href="faq.html">30-day return information</a><span>Secure Wix checkout</span></div>
    <div class="utility-links"><span>USD ($)</span><a href="https://www.tillmantough.com/account/my-account">Log in</a></div>
  </div></div>
  <header class="header"><div class="container nav">
    <a class="logo" href="index.html" aria-label="Tillman Tough home">
      <img src="${SITE.assets.logo}" width="70" height="66" alt="Krella Tillman Sales Group logo">
      <span class="logo-copy"><strong>Tillman Tough</strong><span>Krella Tillman Sales Group</span></span>
    </a>
    <nav class="desktop-nav" aria-label="Primary navigation">
      <details class="nav-details"><summary>Shop</summary><div class="nav-menu">
        <a href="shop.html">Shop All</a>
        <a href="shop.html?category=Power%20Tools">Power Tools</a>
        <a href="shop.html?category=Hand%20Tools">Hand Tools</a>
        <a href="shop.html?category=Electronics%20%26%20Diagnostics">Electronics & Diagnostics</a>
        <a href="shop.html?category=Welding%20Tools%20%26%20Equipment">Welding Tools & Equipment</a>
        <a href="shop.html?category=Abrasives">Abrasives</a>
      </div></details>
      <a href="shop.html?sort=new">New Products</a>
      <a href="shop.html?sort=promotion">Promotion</a>
      <details class="nav-details"><summary>Business Buying</summary><div class="nav-menu">
        <a href="bulk-order.html">Bulk Order by SKU</a>
        <a href="quote.html">Request a Quote</a>
        <a href="source-item.html">Source an Item</a>
      </div></details>
      <details class="nav-details"><summary>Help</summary><div class="nav-menu">
        <a href="finder.html">Product Finder</a>
        <a href="guides.html">Buying Guides</a>
        <a href="faq.html">FAQs</a>
        <a href="contact.html">Contact Support</a>
      </div></details>
      <a href="about.html">About</a>
    </nav>
    <div class="nav-actions">
      <button class="header-search-button" type="button" data-open-search aria-label="Open product search">${icon('search')} Search</button>
      <a class="nav-button" href="compare.html">Compare <span class="count-badge" data-compare-count>0</span></a>
      <button class="nav-button accent" type="button" data-open-cart>Cart <span class="count-badge" data-cart-count>0</span></button>
      <button class="menu-button" type="button" data-menu aria-expanded="false">${icon('menu')} Menu</button>
    </div>
  </div></header>
  <nav class="mobile-nav" id="mobileNav" aria-label="Mobile navigation">
    <a href="shop.html">Shop All</a>
    <a href="shop.html?sort=new">New Products</a>
    <a href="shop.html?sort=promotion">Promotions</a>
    <a href="finder.html">Product Finder</a>
    <a href="compare.html">Compare Products</a>
    <a href="bulk-order.html">Bulk Order by SKU</a>
    <a href="quote.html">Request a Quote</a>
    <a href="source-item.html">Source an Item</a>
    <a href="guides.html">Buying Guides</a>
    <a href="faq.html">FAQs</a>
    <a href="about.html">About</a>
    <a href="contact.html">Contact</a>
  </nav>`;
}

function footer(){
  return `<section class="newsletter" aria-labelledby="newsletterTitle"><div class="container newsletter-grid">
    <div><div class="kicker">Product updates</div><h2 id="newsletterTitle" style="font-size:clamp(1.5rem,3vw,2.7rem)">New tools, useful guides and current offers.</h2></div>
    <form class="newsletter-form demo-form" data-form-type="newsletter" novalidate>
      <label class="sr-only" for="newsletterEmail">Email address</label>
      <input id="newsletterEmail" name="email" type="email" autocomplete="email" placeholder="Email address" required>
      <button type="submit">Join</button>
    </form>
  </div></section>
  <footer class="footer"><div class="container"><div class="footer-grid">
    <div><a class="logo" href="index.html"><img src="${SITE.assets.logo}" width="70" height="66" alt="Tillman Tough logo"><span class="logo-copy"><strong>Tillman Tough</strong><span>Krella Tillman Sales Group</span></span></a><p style="color:#aaa;margin-top:18px;max-width:430px">Professional tools, equipment and accessories for tradespeople, workshops, commercial buyers and serious DIYers.</p></div>
    <div><h2>Shop</h2><a href="shop.html">Shop All</a><a href="shop.html?category=Power%20Tools">Power Tools</a><a href="shop.html?category=Welding%20Tools%20%26%20Equipment">Welding</a><a href="shop.html?category=Electronics%20%26%20Diagnostics">Diagnostics</a><a href="compare.html">Compare Products</a></div>
    <div><h2>Buying Support</h2><a href="finder.html">Product Finder</a><a href="bulk-order.html">Bulk Order by SKU</a><a href="quote.html">Request a Quote</a><a href="source-item.html">Source an Item</a><a href="guides.html">Buying Guides</a></div>
    <div><h2>Company</h2><a href="about.html">About Us</a><a href="contact.html">Contact</a><a href="faq.html">FAQs</a><a href="https://www.tillmantough.com/return-policy">Return Policy</a><a href="https://www.tillmantough.com/copy-of-return-policy">Privacy Policy</a></div>
  </div><div class="footer-bottom"><span>© 2026 Krella Tillman Sales Group. All Rights Reserved.</span><span>Private redesign review · not indexed by search engines</span></div></div></footer>`;
}

function searchModal(){
  return `<div class="search-modal" id="searchModal" aria-hidden="true"><div class="search-dialog" role="dialog" aria-modal="true" aria-labelledby="globalSearchTitle">
    <div class="search-dialog-head"><div><div class="kicker">Catalogue Search</div><h2 id="globalSearchTitle">Find an exact product.</h2></div><button class="btn-icon" type="button" data-close-search aria-label="Close search">${icon('close')}</button></div>
    <div class="search-shell">
      <form class="search-box" data-global-search-form>
        <label class="sr-only" for="globalSearch">Search products</label>
        <input id="globalSearch" autocomplete="off" placeholder="SKU, part number, product, brand or application" role="combobox" aria-controls="globalSuggestions" aria-expanded="false">
        <button type="submit">Search Catalogue</button>
      </form>
      <div class="suggestions" id="globalSuggestions" role="listbox"></div>
    </div>
    <div class="search-meta"><div><strong class="small">Recent searches</strong><div class="recent-searches" id="recentSearches"></div></div><a class="btn btn-outline" style="color:#111" href="source-item.html">Cannot find an item?</a></div>
  </div></div>`;
}

function cartDrawer(){
  return `<div class="drawer-overlay" id="drawerOverlay"></div>
  <aside class="cart-drawer" id="cartDrawer" aria-hidden="true" aria-labelledby="cartTitle">
    <div class="cart-head"><h2 id="cartTitle" style="font-size:1.5rem">Your Cart</h2><button class="btn-icon" type="button" data-close-cart aria-label="Close cart">${icon('close')}</button></div>
    <div id="cartItems"></div><div class="cart-summary" id="cartSummary"></div>
  </aside>`;
}

function compareTray(){
  return `<aside class="compare-tray" id="compareTray" aria-live="polite"><div class="compare-tray-inner">
    <div><strong>Compare products</strong><div class="small" style="color:#aaa"><span data-compare-count>0</span> of 4 selected</div></div>
    <div class="compare-items" id="compareItems"></div>
    <a class="btn btn-yellow" href="compare.html">Compare Now</a>
    <button class="btn-icon" type="button" data-clear-compare aria-label="Clear comparison">${icon('close')}</button>
  </div></aside>`;
}

function productCard(product){
  const saved = readStorage(KEYS.saved, []).includes(String(product.id));
  const compared = readStorage(KEYS.compare, []).includes(String(product.id));
  return `<article class="product-card" data-product-card="${escapeHtml(product.id)}">
    <a class="product-media" href="product.html?id=${encodeURIComponent(product.id)}">
      <img loading="lazy" decoding="async" width="500" height="500" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" onerror="this.src='https://placehold.co/600x600/ffffff/111111?text=Tillman+Tough'">
    </a>
    <div class="product-tools">
      <button type="button" class="${saved?'active':''}" data-save="${escapeHtml(product.id)}" aria-label="${saved?'Remove from':'Save to'} saved products">${icon('heart')}</button>
      <button type="button" class="${compared?'active':''}" data-compare="${escapeHtml(product.id)}" aria-label="${compared?'Remove from':'Add to'} comparison">${icon('compare')}</button>
    </div>
    <div class="product-body">
      <div class="product-brand">${escapeHtml(product.brand)}</div>
      <a class="product-title" href="product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a>
      <div class="product-sku">SKU: <strong>${escapeHtml(product.sku)}</strong>${product.duplicateSku?' · Verify duplicate SKU':''}</div>
      <div class="${product.inStock?'stock':'stock out'}">${product.inStock?'Available':'Out of stock'}</div>
      <div class="product-price">${money(product.price)}${product.originalPrice>product.price?`<span class="original-price">${money(product.originalPrice)}</span>`:''}</div>
      <div class="card-actions"><button type="button" data-add="${escapeHtml(product.id)}">Add to Cart</button><a href="product.html?id=${encodeURIComponent(product.id)}">View</a></div>
    </div>
  </article>`;
}

function getCart(){
  return readStorage(KEYS.cart, []);
}
function saveCart(cart){
  writeStorage(KEYS.cart, cart);
  renderCart();
  updateCounts();
}
function addCart(id, quantity=1){
  const cart = getCart();
  const row = cart.find(item => String(item.id) === String(id));
  const safeQuantity = Math.max(1, Number(quantity)||1);
  if(row) row.qty += safeQuantity;
  else cart.push({id:String(id), qty:safeQuantity});
  saveCart(cart);
  toast('Product added to cart.');
  openCart();
}
function updateCart(id, delta){
  const cart = getCart();
  const row = cart.find(item => String(item.id) === String(id));
  if(!row) return;
  row.qty = Math.max(1, row.qty + delta);
  saveCart(cart);
}
function removeCart(id){
  saveCart(getCart().filter(item => String(item.id) !== String(id)));
}

function renderCart(){
  const host = $('#cartItems');
  const summary = $('#cartSummary');
  if(!host || !summary) return;
  const cart = getCart();

  if(!cart.length){
    host.innerHTML = '<div class="empty" style="margin-top:20px"><strong>Your cart is empty.</strong><p class="muted">Search by SKU or browse the catalogue to add products.</p><a class="btn btn-yellow" href="shop.html">Shop Products</a></div>';
    summary.innerHTML = '';
    return;
  }

  let total = 0;
  host.innerHTML = cart.map(row => {
    const product = productById(row.id);
    if(!product) return '';
    total += product.price * row.qty;
    return `<div class="cart-item">
      <img src="${escapeHtml(product.image)}" width="60" height="60" alt="">
      <div>
        <b>${escapeHtml(shorten(product.name,48))}</b>
        <small style="display:block">SKU ${escapeHtml(product.sku)} · ${money(product.price)}</small>
        <div class="cart-qty">
          <button type="button" data-cart-minus="${escapeHtml(product.id)}" aria-label="Decrease quantity">−</button>
          <span>${row.qty}</span>
          <button type="button" data-cart-plus="${escapeHtml(product.id)}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="btn-icon" type="button" data-cart-remove="${escapeHtml(product.id)}" aria-label="Remove ${escapeHtml(product.name)}">${icon('close')}</button>
    </div>`;
  }).join('');

  summary.innerHTML = `<div class="cart-total"><span>Estimated subtotal</span><span>${money(total)}</span></div>
    <p class="small muted">Shipping, tax and confirmed availability are handled in the live Wix checkout or quote process.</p>
    <div style="display:grid;gap:8px"><a class="btn btn-yellow" href="quote.html?cart=1">Request Cart Quote</a><a class="btn btn-dark" href="bulk-order.html">Add More by SKU</a></div>`;
}

function updateCounts(){
  const cartCount = getCart().reduce((sum,item) => sum + item.qty, 0);
  const compareCount = readStorage(KEYS.compare, []).length;
  $$('[data-cart-count]').forEach(element => element.textContent = cartCount);
  $$('[data-compare-count]').forEach(element => element.textContent = compareCount);
  renderCompareTray();
}

function openCart(){
  $('#drawerOverlay')?.classList.add('open');
  $('#cartDrawer')?.classList.add('open');
  $('#cartDrawer')?.setAttribute('aria-hidden','false');
  document.body.classList.add('locked');
  setTimeout(() => $('#cartDrawer')?.querySelector('[data-close-cart]')?.focus(), 20);
}
function closeCart(){
  $('#drawerOverlay')?.classList.remove('open');
  $('#cartDrawer')?.classList.remove('open');
  $('#cartDrawer')?.setAttribute('aria-hidden','true');
  document.body.classList.remove('locked');
}

function toggleSaved(id){
  const saved = readStorage(KEYS.saved, []);
  const key = String(id);
  const next = saved.includes(key) ? saved.filter(item => item !== key) : [...saved,key];
  writeStorage(KEYS.saved, next);
  $$(`[data-save="${CSS.escape(key)}"]`).forEach(button => button.classList.toggle('active',next.includes(key)));
  toast(next.includes(key) ? 'Product saved.' : 'Product removed from saved items.');
}

function toggleCompare(id){
  const selected = readStorage(KEYS.compare, []);
  const key = String(id);
  let next;

  if(selected.includes(key)){
    next = selected.filter(item => item !== key);
  }else{
    if(selected.length >= 4){
      toast('Compare up to four products.');
      return;
    }
    next = [...selected,key];
  }

  writeStorage(KEYS.compare, next);
  $$(`[data-compare="${CSS.escape(key)}"]`).forEach(button => button.classList.toggle('active',next.includes(key)));
  updateCounts();
  toast(next.includes(key) ? 'Added to comparison.' : 'Removed from comparison.');
  if(page === 'compare') renderComparePage();
}

function renderCompareTray(){
  const tray = $('#compareTray');
  const host = $('#compareItems');
  const ids = readStorage(KEYS.compare, []);
  if(!tray || !host) return;
  tray.classList.toggle('open', ids.length > 0);
  host.innerHTML = ids.map(id => {
    const product = productById(id);
    return product ? `<div class="compare-mini"><img src="${escapeHtml(product.image)}" width="38" height="38" alt=""><span>${escapeHtml(product.name)}</span></div>` : '';
  }).join('');
}

function renderRecentSearches(){
  const host = $('#recentSearches');
  if(!host) return;
  const recent = readStorage(KEYS.recent, []);
  host.innerHTML = recent.length
    ? recent.map(query => `<button class="search-chip" type="button" data-recent="${escapeHtml(query)}">${escapeHtml(query)}</button>`).join('')
    : '<span class="small muted">No recent searches yet.</span>';
}

function bindSearch(input, panel, {navigate=true}={}){
  if(!input || !panel) return;
  let selected = -1;
  let current = [];

  function renderSuggestions(){
    const query = input.value.trim();
    if(!query){
      panel.classList.remove('open');
      input.setAttribute('aria-expanded','false');
      current = [];
      return;
    }

    current = findProducts(query,7);
    selected = -1;
    panel.innerHTML = current.length
      ? current.map((product,index) => `<a class="suggestion" id="search-option-${index}" role="option" aria-selected="false" href="product.html?id=${encodeURIComponent(product.id)}"><img src="${escapeHtml(product.image)}" width="58" height="58" alt=""><span><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.brand)} · SKU ${escapeHtml(product.sku)}</small></span><strong>${money(product.price)}</strong></a>`).join('')
      : `<a class="suggestion" role="option" href="source-item.html?q=${encodeURIComponent(query)}"><span></span><span><b>No exact match found</b><small>Send the SKU or part number for sourcing.</small></span><strong>Request</strong></a>`;

    panel.classList.add('open');
    input.setAttribute('aria-expanded','true');
  }

  function selectOption(index){
    const options = $$('[role="option"]',panel);
    options.forEach((option,optionIndex) => option.setAttribute('aria-selected', String(optionIndex === index)));
    selected = index;
    if(options[index]) input.setAttribute('aria-activedescendant', options[index].id || '');
  }

  input.addEventListener('input',renderSuggestions);
  input.addEventListener('focus',() => {
    if(input.value) renderSuggestions();
  });
  input.addEventListener('keydown',event => {
    const options = $$('[role="option"]',panel);
    if(event.key === 'ArrowDown' && options.length){
      event.preventDefault();
      selectOption((selected+1)%options.length);
    }else if(event.key === 'ArrowUp' && options.length){
      event.preventDefault();
      selectOption((selected-1+options.length)%options.length);
    }else if(event.key === 'Enter' && selected >= 0 && options[selected]){
      event.preventDefault();
      options[selected].click();
    }else if(event.key === 'Escape'){
      panel.classList.remove('open');
      input.setAttribute('aria-expanded','false');
    }
  });

  input.closest('form')?.addEventListener('submit',event => {
    event.preventDefault();
    const query = input.value.trim();
    if(!query) return;
    recordSearch(query,findProducts(query,1000).length);
    if(navigate) location.href = `shop.html?q=${encodeURIComponent(query)}`;
  });
}

function openSearch(prefill=''){
  const modal = $('#searchModal');
  const input = $('#globalSearch');
  modal?.classList.add('open');
  modal?.setAttribute('aria-hidden','false');
  document.body.classList.add('locked');
  renderRecentSearches();
  if(input){
    input.value = prefill;
    setTimeout(() => input.focus(),20);
    input.dispatchEvent(new Event('input'));
  }
}
function closeSearch(){
  $('#searchModal')?.classList.remove('open');
  $('#searchModal')?.setAttribute('aria-hidden','true');
  document.body.classList.remove('locked');
}

function validateForm(form){
  let valid = true;
  $$('[required]',form).forEach(field => {
    const invalid = !String(field.value||'').trim()
      || (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value));
    field.classList.toggle('invalid',invalid);

    let message = field.parentElement?.querySelector(`[data-error-for="${field.id}"]`);
    if(!message && invalid){
      message = document.createElement('div');
      message.className = 'field-error';
      message.dataset.errorFor = field.id;
      field.insertAdjacentElement('afterend',message);
    }
    if(message) message.textContent = invalid
      ? (field.type === 'email' ? 'Enter a valid email address.' : 'This field is required.')
      : '';
    if(invalid) valid = false;
  });
  return valid;
}

function submitDemoForm(form){
  if(!validateForm(form)){
    form.querySelector('.invalid')?.focus();
    return;
  }

  const type = form.dataset.formType || 'general';
  const rawData = Object.fromEntries(new FormData(form).entries());
  const data = {};
  Object.entries(rawData).forEach(([key,value]) => {
    data[key] = value instanceof File ? value.name : value;
  });

  const reference = `TT-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const submissions = readStorage(KEYS.submissions, []);
  submissions.push({type,data,reference,at:new Date().toISOString()});
  writeStorage(KEYS.submissions,submissions.slice(-50));

  form.innerHTML = `<div class="success-card" role="status"><strong>Your ${escapeHtml(type.replaceAll('-',' '))} request is ready.</strong><p>Reference: ${reference}</p><p class="small">This review stores the demonstration locally. In the approved Wix version, the request will create a contact record, notify the sales team and send a branded confirmation.</p></div>`;
  toast('Request completed successfully.');
}

function renderHome(){
  const featured = $('#featuredGrid');
  if(featured){
    featured.innerHTML = [...PRODUCTS]
      .sort((first,second) => second.price-first.price)
      .slice(0,8)
      .map(productCard)
      .join('');
  }

  const brandGrid = $('#brandGrid');
  if(brandGrid){
    const brandCounts = {};
    PRODUCTS.forEach(product => {
      brandCounts[product.brand] = (brandCounts[product.brand]||0)+1;
    });
    brandGrid.innerHTML = Object.entries(brandCounts)
      .sort((first,second) => second[1]-first[1])
      .slice(0,12)
      .map(([brand,count]) => `<a class="brand-card" href="shop.html?brand=${encodeURIComponent(brand)}">${escapeHtml(brand)}<span class="small muted">${count} preview products</span></a>`)
      .join('');
  }

  bindSearch($('#homeSearch'),$('#homeSuggestions'));

  $$('.faq-question').forEach(button => {
    button.addEventListener('click',() => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded',String(!open));
      button.nextElementSibling.hidden = open;
    });
  });

  const quickFinder = $('#quickFinder');
  quickFinder?.addEventListener('submit',event => {
    event.preventDefault();
    const formData = new FormData(quickFinder);
    const category = formData.get('category');
    const budget = Number(formData.get('budget')||999999);
    const matches = PRODUCTS
      .filter(product => (!category || product.category === category) && product.price <= budget)
      .sort((first,second) => second.price-first.price)
      .slice(0,3);

    $('#quickFinderResults').innerHTML = matches.length
      ? matches.map(product => `<a class="product-card" style="padding:10px" href="product.html?id=${encodeURIComponent(product.id)}"><img src="${escapeHtml(product.image)}" width="100" height="100" style="width:100%;height:100px;object-fit:contain" alt=""><b class="small">${escapeHtml(shorten(product.name,35))}</b><span class="small">${money(product.price)}</span></a>`).join('')
      : '<div class="no-result">No preview product matched. Try the full product finder.</div>';
  });
}

function renderShop(){
  const search = $('#shopSearch');
  const category = $('#categoryFilter');
  const brand = $('#brandFilter');
  const availability = $('#stockFilter');
  const minimum = $('#minPrice');
  const maximum = $('#maxPrice');
  const sort = $('#sortFilter');
  const grid = $('#shopGrid');
  const pagination = $('#pagination');
  if(!grid) return;

  const parameters = new URLSearchParams(location.search);
  search.value = parameters.get('q') || '';

  const categories = [...new Set(PRODUCTS.map(product => product.category))].sort();
  const brands = [...new Set(PRODUCTS.map(product => product.brand))].sort();
  category.innerHTML = '<option value="">All Categories</option>' + categories.map(value => `<option>${escapeHtml(value)}</option>`).join('');
  brand.innerHTML = '<option value="">All Brands</option>' + brands.map(value => `<option>${escapeHtml(value)}</option>`).join('');

  if(parameters.get('category')) category.value = parameters.get('category');
  if(parameters.get('brand')) brand.value = parameters.get('brand');
  if(parameters.get('sort')) sort.value = parameters.get('sort');

  let currentPage = 1;
  const perPage = 20;

  function render(){
    const query = search.value.trim();
    const minimumPrice = Number(minimum.value||0);
    const maximumPrice = maximum.value ? Number(maximum.value) : Infinity;

    let results = PRODUCTS.filter(product =>
      (!category.value || product.category === category.value)
      && (!brand.value || product.brand === brand.value)
      && (!availability.checked || product.inStock)
      && product.price >= minimumPrice
      && product.price <= maximumPrice
    );

    if(query){
      results = results
        .map(product => ({product,score:productScore(product,query)}))
        .filter(result => result.score)
        .sort((first,second) => second.score-first.score)
        .map(result => result.product);
    }

    if(sort.value === 'price-asc') results.sort((first,second) => first.price-second.price);
    if(sort.value === 'price-desc') results.sort((first,second) => second.price-first.price);
    if(sort.value === 'name') results.sort((first,second) => first.name.localeCompare(second.name));
    if(sort.value === 'new') results.sort((first,second) => String(second.updated).localeCompare(String(first.updated)));

    const pageCount = Math.max(1,Math.ceil(results.length/perPage));
    currentPage = Math.min(currentPage,pageCount);
    const visible = results.slice((currentPage-1)*perPage,currentPage*perPage);

    $('#resultCount').textContent = `${results.length} product${results.length===1?'':'s'} found`;
    grid.innerHTML = visible.length
      ? visible.map(productCard).join('')
      : `<div class="no-result"><div class="kicker">No Exact Match</div><h3>Keep this search from becoming a dead end.</h3><p>Send the SKU or manufacturer part number and ask Tillman Tough to check availability or suggest an alternative.</p><a class="btn btn-dark" href="source-item.html?q=${encodeURIComponent(query)}">Request This Item</a></div>`;

    const chips = [];
    if(query) chips.push(['Search',query,() => search.value='']);
    if(category.value) chips.push(['Category',category.value,() => category.value='']);
    if(brand.value) chips.push(['Brand',brand.value,() => brand.value='']);
    if(availability.checked) chips.push(['Availability','Available only',() => availability.checked=false]);

    $('#activeFilters').innerHTML = chips
      .map((chip,index) => `<button class="filter-chip" type="button" data-chip="${index}">${escapeHtml(chip[0])}: ${escapeHtml(chip[1])} ×</button>`)
      .join('');

    $$('[data-chip]').forEach(button => {
      button.onclick = () => {
        chips[Number(button.dataset.chip)][2]();
        currentPage = 1;
        render();
      };
    });

    pagination.innerHTML = Array.from({length:pageCount},(_,index) =>
      `<button class="${index+1===currentPage?'active':''}" type="button" data-page="${index+1}" aria-label="Page ${index+1}">${index+1}</button>`
    ).join('');

    $$('[data-page]',pagination).forEach(button => {
      button.onclick = () => {
        currentPage = Number(button.dataset.page);
        render();
        scrollTo({top:$('#catalogue').offsetTop-100,behavior:'smooth'});
      };
    });

    if(query) recordSearch(query,results.length);
  }

  [search,minimum,maximum].forEach(element => {
    element.addEventListener('input',() => {
      currentPage = 1;
      render();
    });
  });
  [category,brand,availability,sort].forEach(element => {
    element.addEventListener('change',() => {
      currentPage = 1;
      render();
    });
  });

  $$('[data-view]').forEach(button => {
    button.addEventListener('click',() => {
      $$('[data-view]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      grid.classList.toggle('list-view',button.dataset.view === 'list');
      writeStorage(KEYS.view,button.dataset.view);
    });
  });

  const view = readStorage(KEYS.view,'grid');
  $(`[data-view="${view}"]`)?.click();
  render();
}

function renderProduct(){
  const id = new URLSearchParams(location.search).get('id');
  const product = productById(id) || PRODUCTS[0];
  const host = $('#productHost');
  if(!host) return;

  document.title = `${product.name} | Tillman Tough`;
  const images = (product.images?.length ? product.images : [product.image]).filter(Boolean);
  const specifications = {
    Brand:product.brand,
    SKU:product.sku,
    Category:product.category,
    Availability:product.inStock ? 'Available' : 'Out of stock',
    ...product.specs
  };

  host.innerHTML = `<div class="product-page">
    <div class="product-gallery">
      <div class="main-product-image"><img id="mainProductImage" src="${escapeHtml(images[0])}" width="600" height="600" alt="${escapeHtml(product.name)}"></div>
      <div class="thumbs">${images.map((image,index) => `<button class="thumb ${index===0?'active':''}" type="button" data-thumb="${escapeHtml(image)}" aria-label="View product image ${index+1}"><img src="${escapeHtml(image)}" width="75" height="75" alt=""></button>`).join('')}</div>
    </div>
    <div class="product-info">
      <div class="kicker">${escapeHtml(product.brand)} · ${escapeHtml(product.category)}</div>
      <span class="sku-line">SKU ${escapeHtml(product.sku)}</span>
      <h2 style="font-size:clamp(2.2rem,3.7vw,4.15rem);margin:16px 0">${escapeHtml(product.name)}</h2>
      <div class="${product.inStock?'stock':'stock out'}">${product.inStock?'Available to order':'Currently unavailable'}</div>
      <div class="price">${money(product.price)}</div>
      <p>${escapeHtml(product.description||'Professional-grade equipment selected for demanding work.')}</p>
      <div class="buy-row"><label class="sr-only" for="productQty">Quantity</label><input id="productQty" type="number" min="1" value="1"><button class="btn btn-yellow" type="button" id="addProduct">Add to Cart</button></div>
      <div class="product-secondary-actions"><button class="btn btn-outline" style="color:#111" type="button" data-compare="${escapeHtml(product.id)}">Compare</button><button class="btn btn-outline" style="color:#111" type="button" data-save="${escapeHtml(product.id)}">Save Product</button><a class="btn btn-outline" style="color:#111" href="quote.html?sku=${encodeURIComponent(product.sku)}">Quantity Quote</a></div>
      <div class="note"><strong>Need a related or unlisted item?</strong><br>Use this SKU in a quote, bulk order or sourcing request.</div>
      <table class="spec-table"><caption class="sr-only">Product specifications</caption><tbody>${Object.entries(specifications).map(([label,value]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}</tbody></table>
      <div class="details-stack"><details open><summary>What is included?</summary><p>Review the full product description and included accessories before purchase. Final package contents should be confirmed in the live product record.</p></details><details><summary>Shipping and returns</summary><p>Dispatch timing, shipping cost and return eligibility depend on the product and destination. The live Wix checkout and published policies provide the final terms.</p></details><details><summary>Need compatibility help?</summary><p>Send the SKU and the equipment you already use. Tillman Tough can help confirm compatibility or recommend an alternative.</p></details></div>
    </div>
  </div>`;

  $$('#productHost [data-thumb]').forEach(button => {
    button.addEventListener('click',() => {
      $$('#productHost [data-thumb]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      $('#mainProductImage').src = button.dataset.thumb;
    });
  });

  $('#addProduct').onclick = () => addCart(product.id,Math.max(1,Number($('#productQty').value)||1));
  $('#relatedGrid').innerHTML = PRODUCTS
    .filter(candidate => candidate.id !== product.id && (candidate.category === product.category || candidate.brand === product.brand))
    .slice(0,4)
    .map(productCard)
    .join('');

  $('#mobileProductPrice').textContent = money(product.price);
  $('#mobileAdd').onclick = () => addCart(product.id,1);
  addProductSchema(product);
}

function renderComparePage(){
  const host = $('#compareHost');
  if(!host) return;
  const selected = readStorage(KEYS.compare,[]).map(productById).filter(Boolean);

  if(!selected.length){
    host.innerHTML = '<div class="compare-empty"><h2>No products selected.</h2><p>Use the compare button on product cards to place up to four items side by side.</p><a class="btn btn-yellow" href="shop.html">Shop Products</a></div>';
    return;
  }

  const specificationLabels = [...new Set(selected.flatMap(product => Object.keys(product.specs||{})))];
  const rows = [
    ['Price',product => money(product.price)],
    ['Brand',product => product.brand],
    ['SKU',product => product.sku],
    ['Category',product => product.category],
    ['Availability',product => product.inStock?'Available':'Out of stock'],
    ...specificationLabels.map(label => [label,product => product.specs?.[label]||'—'])
  ];

  host.innerHTML = `<div class="compare-table-wrap"><table class="compare-table">
    <thead><tr><th scope="col">Compare</th>${selected.map(product => `<th scope="col"><img class="compare-product-image" src="${escapeHtml(product.image)}" width="150" height="150" alt="${escapeHtml(product.name)}"><a href="product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(shorten(product.name,70))}</a><button class="btn btn-danger" style="margin-top:10px" type="button" data-compare="${escapeHtml(product.id)}">Remove</button></th>`).join('')}</tr></thead>
    <tbody>${rows.map(([label,getValue]) => `<tr><th scope="row">${escapeHtml(label)}</th>${selected.map(product => `<td>${escapeHtml(getValue(product))}</td>`).join('')}</tr>`).join('')}
    <tr><th scope="row">Action</th>${selected.map(product => `<td><button class="btn btn-yellow" type="button" data-add="${escapeHtml(product.id)}">Add to Cart</button></td>`).join('')}</tr></tbody>
  </table></div>`;
}

function parseBulk(text){
  return String(text||'')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(.*?)(?:\s*(?:,|x|×|qty:?|quantity:?)\s*(\d+))?$/i);
      const query = (match?.[1]||line).trim();
      const quantity = Math.max(1,Number(match?.[2]||1));
      return {query,quantity,product:findProducts(query,1)[0]};
    });
}

function renderBulk(){
  let matched = [];
  const input = $('#bulkText');
  const host = $('#bulkResults');

  function updateTotal(){
    const total = matched.reduce((sum,item) => sum + (item.product ? item.product.price*item.quantity : 0),0);
    $('#bulkTotal').textContent = `Matched subtotal: ${money(total)}`;
  }

  function show(){
    matched = parseBulk(input.value);
    host.innerHTML = matched.length
      ? matched.map((item,index) => item.product
        ? `<div class="bulk-row"><img src="${escapeHtml(item.product.image)}" width="60" height="60" alt=""><div><b>${escapeHtml(item.product.name)}</b><small style="display:block">SKU ${escapeHtml(item.product.sku)} · ${money(item.product.price)}</small></div><label><span class="sr-only">Quantity</span><input type="number" min="1" value="${item.quantity}" data-bulk-qty="${index}"></label><button class="btn-icon" type="button" data-bulk-remove="${index}" aria-label="Remove item">${icon('close')}</button></div>`
        : `<div class="bulk-row"><div></div><div><b>No match: ${escapeHtml(item.query)}</b><small style="display:block">This can be carried into a sourcing request.</small></div><label><span class="sr-only">Quantity</span><input type="number" min="1" value="${item.quantity}" data-bulk-qty="${index}"></label><button class="btn-icon" type="button" data-bulk-remove="${index}" aria-label="Remove item">${icon('close')}</button></div>`
      ).join('')
      : '<div class="empty">Enter at least one SKU or upload a CSV.</div>';

    updateTotal();

    $$('[data-bulk-qty]').forEach(field => {
      field.oninput = () => {
        matched[Number(field.dataset.bulkQty)].quantity = Math.max(1,Number(field.value)||1);
        updateTotal();
      };
    });

    $$('[data-bulk-remove]').forEach(button => {
      button.onclick = () => {
        matched.splice(Number(button.dataset.bulkRemove),1);
        input.value = matched.map(item => `${item.query}, ${item.quantity}`).join('\n');
        show();
      };
    });
  }

  $('#matchBulk').onclick = show;
  $('#addBulkCart').onclick = () => {
    const cart = getCart();
    matched.filter(item => item.product).forEach(item => {
      const row = cart.find(candidate => candidate.id === String(item.product.id));
      if(row) row.qty += item.quantity;
      else cart.push({id:String(item.product.id),qty:item.quantity});
    });
    saveCart(cart);
    toast('Matched products added to cart.');
  };

  $('#bulkQuote').onclick = () => {
    const lines = matched.map(item =>
      `${item.product?item.product.sku:item.query} — Qty ${item.quantity}${item.product?` — ${item.product.name}`:' — sourcing needed'}`
    ).join('\n');
    location.href = `quote.html?items=${encodeURIComponent(lines)}`;
  };

  const upload = $('#bulkCsv');
  upload.onchange = async () => {
    const file = upload.files?.[0];
    if(!file) return;
    const text = await file.text();
    input.value = text.split(/\r?\n/).map(line => line.split(',').slice(0,2).join(', ')).join('\n');
    show();
  };

  const zone = $('#uploadZone');
  ['dragenter','dragover'].forEach(type => zone.addEventListener(type,event => {
    event.preventDefault();
    zone.classList.add('dragover');
  }));
  ['dragleave','drop'].forEach(type => zone.addEventListener(type,event => {
    event.preventDefault();
    zone.classList.remove('dragover');
  }));
  zone.addEventListener('drop',async event => {
    const file = event.dataTransfer.files?.[0];
    if(!file) return;
    input.value = await file.text();
    show();
  });
}

function renderFinder(){
  const form = $('#finderForm');
  const host = $('#finderResults');
  if(!form) return;

  form.onsubmit = event => {
    event.preventDefault();
    const formData = new FormData(form);
    const category = formData.get('category');
    const budget = Number(formData.get('budget')||999999);
    const keyword = formData.get('keyword')||'';

    let results = PRODUCTS.filter(product =>
      (!category || product.category === category) && product.price <= budget
    );

    if(keyword){
      results = results
        .map(product => ({product,score:productScore(product,keyword)}))
        .filter(result => result.score)
        .sort((first,second) => second.score-first.score)
        .map(result => result.product);
    }else{
      results.sort((first,second) => second.price-first.price);
    }

    results = results.slice(0,6);
    host.innerHTML = results.length
      ? `<div class="section-head"><div><div class="kicker">Recommended Preview Products</div><h2>Strong matches for your request.</h2></div><p>Review specifications and confirm compatibility before ordering.</p></div><div class="product-grid">${results.map(productCard).join('')}</div>`
      : '<div class="no-result"><h2>No preview product matched every answer.</h2><p>Submit the requirement and Tillman Tough can help source or recommend an alternative.</p><a class="btn btn-dark" href="source-item.html">Request Help</a></div>';

    host.scrollIntoView({behavior:'smooth',block:'start'});
  };
}

function renderFaq(){
  const search = $('#faqSearch');
  const items = $$('.faq-item');

  search?.addEventListener('input',() => {
    const query = search.value.toLowerCase();
    items.forEach(item => {
      item.hidden = Boolean(query && !item.textContent.toLowerCase().includes(query));
    });
  });

  $$('.faq-question').forEach(button => {
    button.onclick = () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded',String(!open));
      button.nextElementSibling.hidden = open;
    };
  });

  addFaqSchema();
}

function renderReview(){
  const duplicateCount = PRODUCTS.filter(product => product.duplicateSku).length;
  const brandsToReview = PRODUCTS.filter(product => !product.brand || product.brand === 'Tillman Tough').length;
  const searches = readStorage(KEYS.searches,[]);
  const submissions = readStorage(KEYS.submissions,[]);

  $('#reviewStats').innerHTML = [
    ['Products loaded',PRODUCTS.length],
    ['Duplicate SKU records',duplicateCount],
    ['Brands needing review',brandsToReview],
    ['Demo submissions',submissions.length]
  ].map(([label,value]) => `<div class="review-stat"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`).join('');

  $('#searchInsight').innerHTML = searches.length
    ? searches.slice(-10).reverse().map(item => `<div class="review-row"><span class="status">✓</span><div><b>${escapeHtml(item.query)}</b><div class="small muted">${item.count} result(s) · ${new Date(item.at).toLocaleString()}</div></div></div>`).join('')
    : '<div class="empty">Search activity will appear here after the client tests the mockup.</div>';
}

function addSchema(data){
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.append(script);
}

function addOrganizationSchema(){
  addSchema({
    '@context':'https://schema.org',
    '@type':'Organization',
    name:'Krella Tillman Sales Group, LLC',
    alternateName:'Tillman Tough',
    url:'https://www.tillmantough.com',
    logo:SITE.assets.logo,
    address:{
      '@type':'PostalAddress',
      addressLocality:'Powder Springs',
      addressRegion:'GA',
      addressCountry:'US'
    }
  });
}

function addProductSchema(product){
  addSchema({
    '@context':'https://schema.org',
    '@type':'Product',
    name:product.name,
    sku:product.sku,
    brand:{'@type':'Brand',name:product.brand},
    image:product.images?.length ? product.images : [product.image],
    description:product.description,
    offers:{
      '@type':'Offer',
      priceCurrency:'USD',
      price:String(product.price),
      availability:product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url:product.url
    }
  });
}

function addFaqSchema(){
  const entities = $$('.faq-item').map(item => ({
    '@type':'Question',
    name:item.querySelector('.faq-question')?.textContent.trim(),
    acceptedAnswer:{
      '@type':'Answer',
      text:item.querySelector('.faq-answer')?.textContent.trim()
    }
  }));
  addSchema({'@context':'https://schema.org','@type':'FAQPage',mainEntity:entities});
}

function globalEvents(){
  document.addEventListener('click',event => {
    const target = event.target.closest('button,a');
    if(!target) return;

    if(target.matches('[data-open-search]')) openSearch();
    if(target.matches('[data-close-search]')) closeSearch();
    if(target.matches('[data-open-cart]')) openCart();
    if(target.matches('[data-close-cart]')) closeCart();
    if(target.matches('[data-add]')) addCart(target.dataset.add,1);
    if(target.matches('[data-save]')) toggleSaved(target.dataset.save);
    if(target.matches('[data-compare]')) toggleCompare(target.dataset.compare);
    if(target.matches('[data-cart-minus]')) updateCart(target.dataset.cartMinus,-1);
    if(target.matches('[data-cart-plus]')) updateCart(target.dataset.cartPlus,1);
    if(target.matches('[data-cart-remove]')) removeCart(target.dataset.cartRemove);

    if(target.matches('[data-clear-compare]')){
      writeStorage(KEYS.compare,[]);
      updateCounts();
      if(page === 'compare') renderComparePage();
    }

    if(target.matches('[data-menu]')){
      const navigation = $('#mobileNav');
      const open = navigation.classList.toggle('open');
      target.setAttribute('aria-expanded',String(open));
    }

    if(target.matches('[data-recent]')){
      const input = $('#globalSearch');
      input.value = target.dataset.recent;
      input.dispatchEvent(new Event('input'));
      input.focus();
    }
  });

  $('#drawerOverlay')?.addEventListener('click',closeCart);
  $('#searchModal')?.addEventListener('click',event => {
    if(event.target.id === 'searchModal') closeSearch();
  });

  document.addEventListener('keydown',event => {
    if(event.key === 'Escape'){
      closeCart();
      closeSearch();
      $('#mobileNav')?.classList.remove('open');
    }
  });

  $$('.demo-form').forEach(form => {
    form.addEventListener('submit',event => {
      event.preventDefault();
      submitDemoForm(form);
    });
  });

  bindSearch($('#globalSearch'),$('#globalSuggestions'));
}

function initialize(){
  $('#siteHeader').innerHTML = header();
  $('#siteFooter').innerHTML = footer();
  document.body.insertAdjacentHTML(
    'beforeend',
    `${searchModal()}${cartDrawer()}${compareTray()}<div id="toast" class="toast" role="status" aria-live="polite"></div>`
  );

  globalEvents();
  renderCart();
  updateCounts();
  addOrganizationSchema();

  const pageRenderers = {
    home:renderHome,
    shop:renderShop,
    product:renderProduct,
    compare:renderComparePage,
    bulk:renderBulk,
    finder:renderFinder,
    faq:renderFaq,
    review:renderReview
  };
  (pageRenderers[page]||(() => {}))();

  if(['quote','source','contact'].includes(page)){
    const parameters = new URLSearchParams(location.search);

    if(page === 'quote'){
      const items = $('#quoteItems');
      if(parameters.get('items')) items.value = parameters.get('items');
      else if(parameters.get('sku')) items.value = parameters.get('sku');
      else if(parameters.get('cart')){
        items.value = getCart()
          .map(row => {
            const product = productById(row.id);
            return product ? `${product.sku} — Qty ${row.qty} — ${product.name}` : '';
          })
          .filter(Boolean)
          .join('\n');
      }
    }

    if(page === 'source' && parameters.get('q')){
      $('#sourceSku').value = parameters.get('q');
    }
  }
}

document.addEventListener('DOMContentLoaded',initialize);
})();
