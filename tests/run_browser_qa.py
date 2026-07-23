from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re, traceback, urllib.parse, sys

ROOT=Path('/mnt/data/Tillman_Tough_100_Quality')
SCREENS=ROOT/'screenshots';SCREENS.mkdir(exist_ok=True)
CSS=(ROOT/'assets/styles.css').read_text(encoding='utf-8')
APP=(ROOT/'scripts/app.js').read_text(encoding='utf-8')
PRODUCTS=json.loads((ROOT/'data/products.json').read_text(encoding='utf-8'))

def svg_data(title,bg='#f7f7f4',fg='#111111',accent='#f6b817'):
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="{bg}"/><rect width="800" height="70" fill="{accent}"/><rect x="90" y="130" width="620" height="330" rx="18" fill="none" stroke="{fg}" stroke-width="8"/><circle cx="400" cy="290" r="85" fill="{accent}" stroke="{fg}" stroke-width="8"/><text x="400" y="525" text-anchor="middle" font-family="Arial" font-size="42" font-weight="700" fill="{fg}">{title}</text></svg>'''
    return 'data:image/svg+xml,'+urllib.parse.quote(svg,safe='')
LOGO=svg_data('TILLMAN TOUGH','#ffffff','#111111','#f6b817')
HERO=svg_data('TOOLS THAT GET THE JOB DONE','#111111','#ffffff','#f6b817')
CATEGORY=svg_data('PROFESSIONAL TOOLS','#202020','#ffffff','#f6b817')
PRODUCT=svg_data('PRODUCT PREVIEW','#ffffff','#111111','#f6b817')
site={'assets':{k:(LOGO if k=='logo' else HERO if k=='hero' else CATEGORY) for k in ['logo','hero','promo','new','power','hand','abrasives','diagnostics','welding','safety']}}
qa_products=[]
for product in PRODUCTS:
    p=dict(product);p['image']=PRODUCT;p['images']=[PRODUCT,PRODUCT];qa_products.append(p)
SITE_JS='window.TT_SITE='+json.dumps(site,separators=(',',':'))+';'
PRODUCTS_JS='window.TILLMAN_PRODUCTS='+json.dumps(qa_products,separators=(',',':'))+';'
STORAGE='''<script>Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){try{return JSON.parse(window.name||'{}')[k]??null}catch{return null}},setItem(k,v){let d={};try{d=JSON.parse(window.name||'{}')}catch{}d[k]=String(v);window.name=JSON.stringify(d)},removeItem(k){let d={};try{d=JSON.parse(window.name||'{}')}catch{}delete d[k];window.name=JSON.stringify(d)},clear(){window.name='{}'}}});</script>'''

def bundle(name):
    text=(ROOT/name).read_text(encoding='utf-8')
    text=re.sub(r'<link rel="icon"[^>]*>','',text)
    text=text.replace('<link rel="stylesheet" href="assets/styles.css">',f'<style>{CSS}</style>')
    text=text.replace('<script defer src="data/site.js"></script>',f'<script>{SITE_JS}</script>')
    text=text.replace('<script defer src="data/products.js"></script>',f'<script>{PRODUCTS_JS}</script>')
    text=text.replace('<script defer src="scripts/app.js"></script>','')
    text=text.replace('</body>',STORAGE+f'<script>{APP}</script></body>')
    return text

report={'engine':'Playwright Chromium in-memory document QA','layout_tests':[],'functional_tests':[],'console_errors':[],'screenshots':[]}
def check(name,fn):
    try:
        value=fn();report['functional_tests'].append({'name':name,'passed':bool(value),'value':value})
    except Exception as error:
        report['functional_tests'].append({'name':name,'passed':False,'error':str(error),'traceback':traceback.format_exc()})

def load(page,name):
    page.set_content(bundle(name),wait_until='domcontentloaded',timeout=20000)
    page.wait_for_timeout(100)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer','--single-process','--no-zygote'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.set_default_timeout(7000)
    page.on('pageerror',lambda exc: report['console_errors'].append({'type':'pageerror','text':str(exc)}))
    page.on('console',lambda msg: report['console_errors'].append({'type':'console','level':msg.type,'text':msg.text}) if msg.type=='error' else None)
    pages=['index.html','shop.html','product.html','compare.html','bulk-order.html','quote.html','source-item.html','finder.html','faq.html','guides.html','about.html','contact.html','review.html','404.html']
    for label,width,height in [('desktop',1440,1000),('mobile',390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        for index,name in enumerate(pages):
            load(page,name)
            data=page.evaluate('''() => ({title:document.title,mainCount:document.querySelectorAll('main').length,h1Count:document.querySelectorAll('h1').length,footer:Boolean(document.querySelector('footer')),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,bodyText:document.body.innerText.length})''')
            passed=data['mainCount']==1 and data['h1Count']==1 and data['footer'] and not data['overflow'] and data['bodyText']>100
            report['layout_tests'].append({'viewport':label,'page':name,'passed':passed,**data})
            print('layout',label,index+1,'/',len(pages),name,passed,flush=True)
        for name,shot in [('index.html','home'),('shop.html','shop'),('product.html','product'),('bulk-order.html','bulk'),('quote.html','quote')]:
            load(page,name);path=SCREENS/f'{shot}_{label}.png';page.screenshot(path=str(path),full_page=True);report['screenshots'].append(str(path.relative_to(ROOT)))
            print('shot',shot,label,flush=True)

    page.set_viewport_size({'width':1440,'height':1000})
    load(page,'index.html')
    check('Exact SKU search returns expected item',lambda:(page.locator('#homeSearch').fill('SOLJNC4000'),page.wait_for_timeout(60),'SOLJNC4000' in page.locator('#homeSuggestions').inner_text())[-1])
    check('Keyboard search selection works',lambda:(page.locator('#homeSearch').fill('SOLJNC'),page.locator('#homeSearch').press('ArrowDown'),page.wait_for_timeout(30),page.locator('#homeSuggestions [aria-selected="true"]').count()==1)[-1])
    check('Add to cart opens drawer and persists',lambda:(page.locator('[data-add]').first.click(),page.wait_for_timeout(50),'open' in page.locator('#cartDrawer').get_attribute('class') and page.evaluate("JSON.parse(localStorage.getItem('tt-cart-v4')||'[]').length")>=1)[-1])
    check('Product can be added to comparison',lambda:(page.locator('[data-close-cart]').click(),page.locator('[data-compare]').first.click(),page.wait_for_timeout(40),page.evaluate("JSON.parse(localStorage.getItem('tt-compare-v4')||'[]').length")>=1 and 'open' in page.locator('#compareTray').get_attribute('class'))[-1])
    load(page,'shop.html')
    check('Shop search filters catalogue',lambda:(page.locator('#shopSearch').fill('impact wrench'),page.wait_for_timeout(60),0<int(re.search(r'\d+',page.locator('#resultCount').inner_text()).group())<100 and page.locator('#shopGrid .product-card').count()>0)[-1])
    check('No-result search exposes sourcing',lambda:(page.locator('#shopSearch').fill('QZXV987654321'),page.wait_for_timeout(60),'no exact match' in page.locator('#shopGrid').inner_text().lower() and page.locator('#shopGrid a[href^="source-item.html"]').count()==1)[-1])
    load(page,'compare.html')
    check('Comparison table renders selected product',lambda:page.locator('.compare-table').count()==1 and page.locator('.compare-table thead th').count()>=2)
    load(page,'bulk-order.html')
    check('Bulk SKU matching and subtotal work',lambda:(page.locator('#bulkText').fill('SOLJNC4000, 2\nMKXFD131 x 4'),page.locator('#matchBulk').click(),page.wait_for_timeout(50),page.locator('#bulkResults .bulk-row').count()==2 and '$' in page.locator('#bulkTotal').inner_text())[-1])
    load(page,'quote.html')
    check('Required form validation is visible',lambda:(page.locator('form[data-form-type="quote"] button[type="submit"]').click(),page.wait_for_timeout(30),page.locator('.invalid').count()>=3 and page.locator('.field-error').count()>=1)[-1])
    check('Quote form completes with valid data',lambda:(page.locator('form[data-form-type="quote"] [name="name"]').fill('Quality Tester'),page.locator('form[data-form-type="quote"] [name="email"]').fill('test@example.com'),page.locator('form[data-form-type="quote"] [name="items"]').fill('SOLJNC4000 — Qty 2'),page.locator('form[data-form-type="quote"] button[type="submit"]').click(),page.wait_for_timeout(40),'request is ready' in page.locator('form[data-form-type="quote"]').inner_text() and 'TT-' in page.locator('form[data-form-type="quote"]').inner_text())[-1])
    load(page,'finder.html')
    check('Guided finder returns recommendations',lambda:(page.locator('#finderCategory').select_option(label='Power Tools'),page.locator('#finderKeyword').fill('impact'),page.locator('#finderBudget').select_option('1500'),page.locator('#finderForm button').click(),page.wait_for_timeout(50),page.locator('#finderResults .product-card').count()>0)[-1])
    load(page,'faq.html')
    check('FAQ search and accordion work',lambda:(page.locator('#faqSearch').fill('bulk'),page.wait_for_timeout(30),page.locator('.faq-item:not([hidden])').first.locator('.faq-question').click(),page.wait_for_timeout(20),page.locator('.faq-item:not([hidden])').count()>0 and page.locator('.faq-item:not([hidden])').first.locator('.faq-question').get_attribute('aria-expanded')=='true')[-1])
    browser.close()
(ROOT/'tests/browser_report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('RESULT layout',len(report['layout_tests']),'failures',sum(not x['passed'] for x in report['layout_tests']),flush=True)
print('RESULT functional',len(report['functional_tests']),'failures',sum(not x['passed'] for x in report['functional_tests']),flush=True)
print('RESULT console',len(report['console_errors']),flush=True)
for item in report['layout_tests']:
    if not item['passed']:print('LAYOUT_FAIL',item,flush=True)
for item in report['functional_tests']:
    if not item['passed']:print('FUNCTION_FAIL',item,flush=True)
