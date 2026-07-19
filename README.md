# Tillman Tough Phase Two Mockup

This client-facing front-end build contains:

- Advanced search by exact/partial SKU, product name, brand and description
- Instant search suggestions
- Product catalogue, filters, pagination and product pages
- Local cart demonstration
- Bulk-order-by-SKU workflow
- Commercial quote workflow
- Product-sourcing request workflow
- Responsive desktop and mobile design
- SEO-ready page titles and descriptions

## Catalogue included

The supplied Wix page snapshot contained **100 complete product records**. Those 100 products and their Wix-hosted images are included.

The full store is reported to contain more than 2,800 products, but those records were not present in the supplied attachment. To import the full catalogue without fabricating data, obtain a Wix Stores CSV export or authorized Wix API access, then run:

```bash
python import_wix_catalog.py products.csv
```

## Deploy

Static deployment: no build command and no environment variables are required.

For Vercel:
- Framework: Other
- Root directory: repository root
- Output directory: leave blank

## Review limitations

Forms currently prepare a structured email on the visitor's device. In the approved Wix implementation they should be connected to Wix Forms, Contacts, Automations and the live store.
