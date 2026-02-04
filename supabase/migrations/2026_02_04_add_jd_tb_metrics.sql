-- Add JD/TB metrics columns for sourcing items
alter table if exists sourcing_items
  add column if not exists jd_price numeric,
  add column if not exists jd_commission numeric,
  add column if not exists jd_commission_rate numeric,
  add column if not exists jd_sales numeric,
  add column if not exists tb_price numeric,
  add column if not exists tb_commission numeric,
  add column if not exists tb_commission_rate numeric,
  add column if not exists tb_sales numeric;
