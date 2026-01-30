export const getCommissionExportHeaders = () => [
  "商品名称",
  "价格(元)",
  "佣金(元)",
  "佣金比例",
  "30天销量",
  "评价数",
  "店铺名称",
  "商品链接",
  "来源",
]

export const getCommissionExportColumns = () => [
  { wch: 40 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 10 },
  { wch: 18 },
  { wch: 60 },
  { wch: 20 },
]

export const getCommissionRowValues = (payload: {
  title: string
  price: string | number
  commissionRate: string | number
  commission: string | number
  sales30: string | number
  comments: string | number
  shopName: string
  promoLink: string
  source: string
}) => [
  payload.title || "",
  payload.price,
  payload.commission,
  payload.commissionRate,
  payload.sales30,
  payload.comments,
  payload.shopName,
  payload.promoLink,
  payload.source,
]
