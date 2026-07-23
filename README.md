# Tillman Tough — Phase Two Product Discovery & Commercial Ordering Review

This build preserves the current Tillman Tough branding and extends the existing store with a clearer, more useful buying experience.

## Content flow

1. Existing Tillman Tough brand promise
2. Search by SKU, part number, product name, brand or application
3. Four clear buying routes
4. Promotion, new products and guidance
5. Familiar departments
6. Featured products and brand navigation
7. Product finder and comparison
8. Bulk ordering, quotes and product sourcing
9. Direct-answer FAQs and buying guides
10. Support, trust information and newsletter

## Working features

- Exact, partial and fuzzy SKU search
- Search synonyms, recent searches and keyboard navigation
- Category, brand, availability and price filters
- Product comparison for up to four items
- Saved products and persistent demonstration cart
- Product pages with visible SKUs, specifications and related products
- Guided product finder
- Bulk SKU paste, CSV upload, quantity editing, cart and quote handoff
- Quote, sourcing, contact and newsletter validation
- Search analytics and private client review dashboard
- Product, Organization and FAQ structured data
- Responsive layouts, visible focus and reduced-motion support

## Catalogue

The review uses 100 real products from the supplied Wix snapshot. This is enough to demonstrate the complete functionality without fabricating the remaining live-store catalogue.

## Private review protection

This Vercel review is intentionally protected with:

- `meta robots="noindex,nofollow"`
- `robots.txt` disallowing all crawlers
- `X-Robots-Tag: noindex, nofollow` in `vercel.json`

Remove these protections only when the public Wix implementation is approved.

## Quality assurance

- 28/28 core desktop/mobile layout checks passed
- 45/45 responsive-matrix checks passed
- 12/12 functional journeys passed
- Zero Chromium console errors
- JavaScript syntax check passed
- Static page, metadata, link, form and catalogue checks passed

Open `qa-report.html` for the client-readable QA summary. Raw reports and the Playwright runner are in `tests/`.

## What remains for the approved Wix implementation

- Connect all live Wix products rather than the 100-product preview
- Connect the cart, checkout and member accounts to Wix Stores
- Connect forms to Wix Contacts and Automations
- Confirm inventory, dispatch, returns, quantity-pricing and sourcing rules
- Add final high-resolution images, verified reviews and confirmed business proof
- Remove private review notes and noindex protection before public launch
