# Alimama Sourcing Helper

Chrome extension to capture product data from Alimama pages and write into this project's sourcing library.

## Features

- Capture current Alimama product page fields:
  - title
  - cover (`cover_url`)
  - price (`tb_price`)
  - commission (`tb_commission`, auto-calculated as price x commission rate / 100)
  - commission rate (`tb_commission_rate`)
  - monthly sales (`tb_sales`)
  - promo link (`spec._tb_promo_link`)
- Two write modes:
  - Update existing sourcing item (manual selection)
  - Create new item in selected category
- Preview before write:
  - old value -> new value
  - checkbox per field
- Can write directly without generating preview first:
  - Create mode: requires category + required fields
  - Update mode: requires selected item + at least one extracted field
- Update rule:
  - only fills empty values
  - `0` is treated as empty and can be overwritten

## Install

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `extensions/alimama-sourcing-helper`.

## Usage

1. Open an Alimama product detail page.
2. Open extension popup and set backend URL (default `http://127.0.0.1:8000`).
3. Click `抓取当前页`.
4. Choose write mode:
   - `更新已有商品`: search and select item manually.
   - `新增到分类`: load and select category.
5. Optional: click `生成预览` to check old/new values and select fields.
6. Click `确认写入`.

## Notes

- For create mode, required fields are:
  - title
  - category
  - `spec._tb_promo_link`
- This extension does not auto-match products.
- Data write uses existing backend APIs under `/api/sourcing/*`.
