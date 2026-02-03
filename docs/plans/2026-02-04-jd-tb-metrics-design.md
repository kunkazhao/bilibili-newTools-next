# JD/TB Dual Metrics Design

**Goal:** Support Taobao link parsing and dual JD/TB metrics (price/commission/commission rate/30-day sales) for sourcing items, while preserving legacy `price/commission/commission_rate` as JD defaults for sorting/export.

## Architecture

We extend the sourcing item schema with dedicated JD/TB columns (`jd_*`, `tb_*`) and keep `price/commission/commission_rate` as the canonical JD-facing fields for backward compatibility. Backend normalization maps legacy fields into JD fields when new columns are absent, so existing data continues to work. Taobao product parsing uses a two-step flow: resolve click URL to item id, then fetch upgraded item details for price, commission rate, and 30-day sales. The frontend owns TB commission amount calculation (price ¡Á commission rate) and sends the computed value to the backend so list cards can show both rows without extra server-side logic.

## Data Flow

1. User enters JD promo link (or Taobao link) and clicks parse.
2. Frontend resolves link and fetches product info; if title/cover already exist, they are preserved.
3. Form stores JD metrics in `price/commission/commissionRate/sales30` and TB metrics in `tbPrice/tbCommissionRate/tbSales` (commission amount derived locally).
4. Submit payload writes both `jd_*` and `tb_*` columns plus legacy fields (JD) to keep exports and sorting unchanged.
5. Archive list cards render two metric rows (JD/TB), defaulting to `--` if a value is missing.

## UI/UX

- Product form shows two parsing entries (JD promo link + Taobao link) and two metric blocks.
- JD metrics remain the default labels for sorting and export.
- TB metrics are a separate row in the list card; commission amount is displayed as a computed value.
- Validation requires at least one of JD link or Taobao link.

## Error Handling

- Invalid link formats show inline field errors.
- Parse failures surface toasts; existing values are not overwritten on failure.
- Missing sales/commission data renders as `--` to avoid misleading zeros.

## Testing

- UI: ProductFormModal parse flows (JD/TB) and field population.
- Backend: taobao product response includes sales, normalize includes jd/tb fields.
- List: Archive card renders both JD/TB metric rows with fallbacks.
