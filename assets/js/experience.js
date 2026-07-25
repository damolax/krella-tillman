(() => {
  'use strict';

  const config = window.TT_CONFIG || {};
  const products = config.products || [];
  const urls = config.urls || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const pic = url => /^https?:\/\//i.test(String(url || '')) ? '/api/image?url=' + encodeURIComponent(String(url)) : String(url || '');
  const imgAttrs = url => `src=\"${esc(pic(url))}\" data-original=\"${esc(url)}\" referrerpolicy=\"no-referrer\"`;
  const money = value => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(Number(value || 0));
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  function scoreProduct(product, query) {
    const q = normalize(query);
    if (!q) return 0;
    const compact = q.replace(/\s/g, '');
    const sku = normalize(product.sku).replace(/\s/g, '');
    const name = normalize(product.name);
    const brand = normalize(product.brand);
    const category = normalize(product.category);
    const description = normalize(product.description);
    let score = 0;
    if (sku === compact) score += 1500;
    else if (sku.startsWith(compact)) score += 1000;
    else if (sku.includes(compact)) score += 700;
    if (name.includes(q)) score += 650;
    if (brand.includes(q)) score += 360;
    if (category.includes(q)) score += 250;
    q.split(/\s+/).forEach(token => {
      if (name.includes(token)) score += 110;
      if (brand.includes(token)) score += 90;
      if (description.includes(token)) score += 35;
    });
    return score;
  }

  function findProducts(query, limit = 6) {
    return products
      .map(product => ({product, score: scoreProduct(product, query)}))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.product);
  }

  function exactProductCard(product) {
    return `<article class="tt-card">
      <a class="tt-card__media" href="${urls['product-preview'] || 'product.html'}?id=${encodeURIComponent(product.id)}">
        <img loading="lazy" decoding="async" ${imgAttrs(product.image)} width="500" height="500" alt="${esc(product.name)}">
      </a>
      <div class="tt-card__tools">
        <button type="button" data-save="${esc(product.id)}" aria-label="Save ${esc(product.name)}">♡</button>
        <button type="button" data-compare="${esc(product.id)}" aria-label="Compare ${esc(product.name)}">⇄</button>
      </div>
      <div class="tt-card__body">
        <div class="tt-card__brand">${esc(product.brand)}</div>
        <a class="tt-card__title" href="${urls['product-preview'] || 'product.html'}?id=${encodeURIComponent(product.id)}">${esc(product.name)}</a>
        <div class="tt-card__sku">Part number: <strong>${esc(product.sku)}</strong></div>
        <div class="tt-stock ${product.inStock ? '' : 'tt-stock--out'}">${product.inStock ? 'Available' : 'Out of stock'}</div>
        <div class="tt-price">${money(product.price)}</div>
        <div class="tt-card__actions"><button type="button" data-add="${esc(product.id)}">Add to cart</button><button type="button" data-quick="${esc(product.id)}">Quick view</button></div>
      </div>
    </article>`;
  }

  function renderExactCatalogueVisuals() {
    const featuredHost = $('[data-tt-featured]');
    if (featuredHost) {
      const featuredSkus = ['DWDCF961B','SOLJNC4000','MKXFD131','EL655','DWDCK248D2','CPT7748','DWDCCS620B','AOPRN2'];
      const featured = featuredSkus.map(sku => products.find(product => product.sku === sku)).filter(Boolean);
      featuredHost.innerHTML = featured.map(exactProductCard).join('');
    }

    const categoryHost = $('[data-tt-categories]');
    if (categoryHost) {
      const representatives = [
        ['Power Tools','DWDCF961B'],
        ['Electronics & Diagnostics','EL655'],
        ['Welding Tools & Equipment','FOR11418'],
        ['Abrasives','SS42334'],
        ['PPE, Safety & Apparel','KIM19878'],
        ['Hand Tools','HA4935104']
      ];
      categoryHost.innerHTML = representatives.map(([category, sku]) => {
        const product = products.find(item => item.sku === sku) || products.find(item => item.category === category);
        if (!product) return '';
        const count = products.filter(item => item.category === category).length;
        return `<a class="tt-category" href="${urls.shop || 'shop.html'}?category=${encodeURIComponent(category)}">
          <img loading="lazy" decoding="async" ${imgAttrs(product.image)} width="520" height="520" alt="${esc(product.name)}">
          <b>${esc(category)}</b><span>${count} products in this preview</span>
        </a>`;
      }).join('');
    }
  }

  function installCompactHeader() {
    const header = $('.tt-header');
    if (!header) return;
    let ticking = false;
    const update = () => {
      header.classList.toggle('is-condensed', window.scrollY > 84 && window.innerWidth > 1120);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, {passive:true});
    window.addEventListener('resize', update);
    update();
  }

  function installPreviewGuide() {
    document.body.insertAdjacentHTML('beforeend', `
      <button class="tt-preview-guide-button" type="button" data-tt-preview-guide aria-expanded="false">
        What am I viewing?
      </button>
      <aside class="tt-preview-guide" aria-hidden="true" aria-labelledby="tt-preview-title">
        <button class="tt-preview-guide__close" type="button" data-tt-close-preview aria-label="Close preview guide">×</button>
        <div class="tt-kicker">Working website concept</div>
        <h2 class="tt-h3" id="tt-preview-title">This shows the proposed next stage of Tillman Tough.</h2>
        <p>The current Wix website remains untouched. This preview lets you test product search, filters, exact product images, comparison, cart review, bulk ordering, quotes, sourcing and the product assistant.</p>
        <div class="tt-preview-guide__status"><span></span><strong>Working now:</strong> everything except final payment checkout.</div>
        <a class="tt-btn tt-btn--yellow" href="review.html">Open the concept guide</a>
      </aside>`);

    const button = $('[data-tt-preview-guide]');
    const panel = $('.tt-preview-guide');
    const close = $('[data-tt-close-preview]');
    const setOpen = open => {
      panel.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', String(!open));
      button.setAttribute('aria-expanded', String(open));
    };
    button.addEventListener('click', () => setOpen(!panel.classList.contains('is-open')));
    close.addEventListener('click', () => setOpen(false));
  }

  function installGlobalSearch() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="tt-global-search-overlay" data-tt-search-overlay></div>
      <section class="tt-global-search-modal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="tt-global-search-title">
        <button class="tt-global-search-close" type="button" data-tt-close-search aria-label="Close product search">×</button>
        <div class="tt-kicker">Product search</div>
        <h2 class="tt-h2" id="tt-global-search-title">What are you looking for?</h2>
        <p>Search a product name, brand, model or part number. These examples work immediately.</p>
        <form class="tt-global-search-form">
          <label class="tt-sr-only" for="tt-modal-search">Search products</label>
          <input id="tt-modal-search" autocomplete="off" placeholder="Example: DeWalt impact wrench">
          <button type="submit">Search</button>
        </form>
        <div class="tt-search-examples tt-search-examples--modal"><span>Examples:</span><button type="button" data-tt-example-search="DeWalt impact wrench">DeWalt impact wrench</button><button type="button" data-tt-example-search="Makita drill">Makita drill</button><button type="button" data-tt-example-search="SOLJNC4000">SOLJNC4000</button></div>
        <div class="tt-global-search-results" aria-live="polite"></div>
      </section>`);

    const modal = $('.tt-global-search-modal');
    const overlay = $('[data-tt-search-overlay]');
    const input = $('#tt-modal-search');
    const resultHost = $('.tt-global-search-results');
    const open = query => {
      modal.classList.add('is-open');
      overlay.classList.add('is-open');
      modal.setAttribute('aria-hidden','false');
      document.body.classList.add('tt-lock');
      input.value = query || '';
      setTimeout(() => input.focus(), 30);
      render();
    };
    const close = () => {
      modal.classList.remove('is-open');
      overlay.classList.remove('is-open');
      modal.setAttribute('aria-hidden','true');
      document.body.classList.remove('tt-lock');
    };
    const render = () => {
      const query = input.value.trim();
      if (!query) {
        resultHost.innerHTML = '<p class="tt-muted">Start typing to see matching catalogue products.</p>';
        return;
      }
      const matches = findProducts(query, 5);
      resultHost.innerHTML = matches.length ? matches.map(product => `<a class="tt-search-result" href="${urls['product-preview'] || 'product.html'}?id=${encodeURIComponent(product.id)}"><img ${imgAttrs(product.image)} alt=""><span><strong>${esc(product.name)}</strong><small>${esc(product.brand)} · ${esc(product.sku)}</small></span><b>${money(product.price)}</b></a>`).join('') : `<div class="tt-search-no-result"><strong>No exact product found in this 100-product preview.</strong><p>The full version would search the complete catalogue. You can also submit the part number for sourcing.</p><a class="tt-btn tt-btn--yellow" href="${urls['source-item'] || 'source-item.html'}?q=${encodeURIComponent(query)}">Source this item</a></div>`;
    };

    document.addEventListener('click', event => {
      const target = event.target.closest('button,a');
      if (!target) return;
      if (target.matches('[data-tt-open-search]')) open();
      if (target.matches('[data-tt-close-search],[data-tt-search-overlay]')) close();
      if (target.matches('[data-tt-example-search]')) {
        const query = target.dataset.ttExampleSearch;
        if (modal.classList.contains('is-open')) {
          input.value = query;
          render();
          input.focus();
        } else {
          open(query);
        }
      }
    });
    input.addEventListener('input', render);
    $('.tt-global-search-form').addEventListener('submit', event => {
      event.preventDefault();
      const query = input.value.trim();
      if (query) location.href = `${urls.shop || 'shop.html'}?tt_q=${encodeURIComponent(query)}`;
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  }

  function installAssistant() {
    document.body.insertAdjacentHTML('beforeend', `
      <button class="tt-assistant-button" type="button" data-tt-open-chat aria-expanded="false" aria-label="Open Tillman product assistant">
        <span>AI</span><strong>Ask Tillman</strong>
      </button>
      <section class="tt-assistant" aria-hidden="true" aria-labelledby="tt-assistant-title">
        <header class="tt-assistant__head"><div><span class="tt-assistant__status"></span><strong id="tt-assistant-title">Tillman Product Assistant</strong><small>Catalogue preview + buying guidance</small></div><button type="button" data-tt-close-chat aria-label="Close assistant">×</button></header>
        <div class="tt-assistant__messages" aria-live="polite"></div>
        <div class="tt-assistant__quick"><button type="button" data-chat-prompt="Find a DeWalt impact wrench">Find a product</button><button type="button" data-chat-prompt="How does bulk ordering work?">Bulk ordering</button><button type="button" data-chat-prompt="Why move from Wix to WordPress?">WordPress plan</button></div>
        <form class="tt-assistant__form"><label class="tt-sr-only" for="tt-assistant-input">Ask a question</label><input id="tt-assistant-input" autocomplete="off" placeholder="Ask about a product or feature"><button type="submit">Send</button></form>
        <p class="tt-assistant__notice">Preview assistant: answers from the 100-product demonstration catalogue. The live version can connect to the complete WooCommerce catalogue and hand questions to a person.</p>
      </section>`);

    const panel = $('.tt-assistant');
    const openButtons = $$('[data-tt-open-chat]');
    const closeButton = $('[data-tt-close-chat]');
    const messages = $('.tt-assistant__messages');
    const input = $('#tt-assistant-input');
    let greeted = false;

    const addMessage = (html, type = 'assistant') => {
      const row = document.createElement('div');
      row.className = `tt-assistant__message tt-assistant__message--${type}`;
      row.innerHTML = html;
      messages.append(row);
      messages.scrollTop = messages.scrollHeight;
    };

    const open = () => {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden','false');
      openButtons.forEach(button => button.setAttribute('aria-expanded','true'));
      if (!greeted) {
        greeted = true;
        addMessage(`<p>Hi. I can help you find products in this preview, explain comparison, bulk ordering, quotes, sourcing, or the proposed WordPress direction.</p><p>Try asking: <strong>“Do you have a 20V DeWalt impact wrench?”</strong></p>`);
      }
      setTimeout(() => input.focus(), 30);
    };
    const close = () => {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden','true');
      openButtons.forEach(button => button.setAttribute('aria-expanded','false'));
    };

    function productReply(query) {
      const matches = findProducts(query, 3);
      if (!matches.length) return '';
      return `<p>I found ${matches.length === 1 ? 'this match' : 'these strong matches'} in the preview catalogue:</p><div class="tt-assistant-products">${matches.map(product => `<a href="${urls['product-preview'] || 'product.html'}?id=${encodeURIComponent(product.id)}"><img ${imgAttrs(product.image)} alt=""><span><strong>${esc(product.name)}</strong><small>${esc(product.brand)} · ${esc(product.sku)} · ${money(product.price)}</small></span></a>`).join('')}</div><p>You can open a product, compare it, or add it to the review cart.</p>`;
    }

    function answer(question) {
      const q = normalize(question);
      const productAnswer = productReply(question);
      const likelyProductQuestion = /dewalt|makita|milwaukee|impact|drill|wrench|jump|starter|multimeter|welder|grinding|flap|brush|chainsaw|blower|trimmer|battery|charger|[a-z]{2,}\d{2,}/i.test(question);
      if (likelyProductQuestion && productAnswer) return productAnswer;
      if (/what is this|what am i viewing|mockup|concept|preview/.test(q)) return `<p>This is a working Phase Two concept for Tillman Tough. The live Wix site remains unchanged. You can test product search, exact catalogue images, comparison, cart review, the finder, bulk ordering, quotes, sourcing and this assistant.</p><a href="review.html">Open the concept guide</a>`;
      if (/bulk|csv|spreadsheet|many items|several items/.test(q)) return `<p>The bulk-order tool lets a repeat buyer paste several part numbers and quantities or upload a CSV. The preview matches the products, calculates a subtotal and prepares the list for cart or quote.</p><a href="${urls['bulk-order'] || 'bulk-order.html'}">Try bulk ordering</a>`;
      if (/quote|quantity pricing|discount|commercial price/.test(q)) return `<p>A customer can send product numbers, quantities, delivery location and timing in one structured quote request. That gives the sales team better information and reduces back-and-forth.</p><a href="${urls['request-quote'] || 'quote.html'}">Open the quote form</a>`;
      if (/source|cannot find|missing product|not listed|hard to find/.test(q)) return `<p>The sourcing form keeps an unavailable or unlisted product from becoming a lost visit. The customer can send the part number, brand, quantity and required date.</p><a href="${urls['source-item'] || 'source-item.html'}">Open product sourcing</a>`;
      if (/compare|difference|which one|choose/.test(q)) return `<p>Use Compare on any product card to place up to four products side by side. For customers who know the job but not the exact model, the Product Finder is another route.</p><a href="${urls.compare || 'compare.html'}">Open comparison</a> · <a href="${urls['product-finder'] || 'finder.html'}">Open the finder</a>`;
      if (/wordpress|woocommerce|move from wix|migration|wix/.test(q)) return `<p>The idea is not to discard the work already done in Wix. The proposed WordPress and WooCommerce phase would give more control over catalogue search, product structure, commercial-order workflows, content, visibility and future integrations. Nothing would change on the live site until the replacement is approved and tested.</p>`;
      if (/seo|visibility|google|search engine|traffic/.test(q)) return `<p>The visibility plan would clean product names and categories, keep part numbers and specifications consistent, create useful buying guides, connect structured product data and preserve existing URLs with redirects during migration.</p>`;
      if (/shipping|delivery|return|refund/.test(q)) return `<p>Those rules need to be confirmed against the final product, supplier and destination. The live version would show the correct delivery and return information on each product page and route uncertain questions to support.</p><a href="${urls.contact || 'contact.html'}">Contact support</a>`;
      if (/hello|hi|hey/.test(q)) return `<p>Hello. Ask me about a product, part number, bulk ordering, quotes, product sourcing, comparison, WordPress or website visibility.</p>`;
      if (productAnswer) return productAnswer;
      return `<p>I can help with products in the preview catalogue and explain search, comparison, bulk orders, quotes, sourcing, WordPress and visibility. Try including a product name, brand or part number.</p>`;
    }

    function submit(question) {
      const value = String(question || '').trim();
      if (!value) return;
      addMessage(`<p>${esc(value)}</p>`, 'user');
      input.value = '';
      setTimeout(() => addMessage(answer(value)), 180);
    }

    openButtons.forEach(button => button.addEventListener('click', open));
    closeButton.addEventListener('click', close);
    $$('.tt-assistant__quick button').forEach(button => button.addEventListener('click', () => submit(button.dataset.chatPrompt)));
    $('.tt-assistant__form').addEventListener('submit', event => { event.preventDefault(); submit(input.value); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-tt-fill-bulk-example]');
    if (!target) return;
    const field = document.querySelector('#tt-bulk-text');
    if (!field) return;
    field.value = 'DWDCK211S2, 2\nSOLJNC4000, 1\nMKXFD131, 1';
    document.querySelector('[data-tt-match]')?.click();
  });

  document.addEventListener('DOMContentLoaded', () => {
    renderExactCatalogueVisuals();
    installCompactHeader();
    installPreviewGuide();
    installGlobalSearch();
    installAssistant();
  });
})();
