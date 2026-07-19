#!/usr/bin/env python3
"""
Convert a Wix Stores CSV export into data/products.json and data/products.js.

Usage:
  python import_wix_catalog.py products.csv

The script is deliberately field-tolerant because Wix export column labels can vary.
"""
import csv, json, re, sys
from pathlib import Path

src = Path(sys.argv[1])
rows = list(csv.DictReader(src.open(encoding="utf-8-sig", newline="")))

def value(row, *names):
    lowered = {k.lower().strip(): v for k,v in row.items()}
    for name in names:
        if name.lower() in lowered and lowered[name.lower()] not in (None, ""):
            return lowered[name.lower()].strip()
    return ""

products=[]
for i,row in enumerate(rows):
    sku=value(row,"sku","product sku")
    name=value(row,"name","product name")
    if not sku or not name: continue
    price=float(re.sub(r"[^0-9.]", "", value(row,"price","discounted price") or "0") or 0)
    image=value(row,"image","main media","media")
    products.append({
        "id": value(row,"id","_id") or sku,
        "sku": sku, "name": name, "slug": value(row,"slug"),
        "brand": value(row,"brand") or "Tillman Tough",
        "category": value(row,"category","collections") or "Other Tools",
        "price": price, "originalPrice": price, "currency": "USD",
        "inStock": value(row,"in stock","instock").lower() not in ("false","0","no","out of stock"),
        "ribbon": value(row,"ribbon"), "image": image, "images": [image] if image else [],
        "description": value(row,"description"), "detailsHtml": value(row,"description"),
        "weight": value(row,"weight"), "url": value(row,"product page url","url"),
        "updated": "", "trackInventory": False
    })

out = Path(__file__).resolve().parent / "data"
out.mkdir(exist_ok=True)
(out/"products.json").write_text(json.dumps(products,ensure_ascii=False,indent=2),encoding="utf-8")
(out/"products.js").write_text("window.TILLMAN_PRODUCTS = "+json.dumps(products,ensure_ascii=False)+";",encoding="utf-8")
print(f"Imported {len(products)} products.")
