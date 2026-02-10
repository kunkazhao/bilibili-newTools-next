interface ProductCardProps {
  title: string
  price: string
  image: string
}

export default function ProductCard({ title, price, image }: ProductCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="space-y-3 p-5">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>当前报价</span>
          <span className="text-lg font-semibold text-slate-900">
            {price} 元
          </span>
        </div>
      </div>
    </div>
  )
}
