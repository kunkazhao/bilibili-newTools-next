import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onChange: (_page: number) => void
}

export default function Pagination({
  currentPage,
  totalPages,
  onChange,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, idx) => idx + 1)

  return (
    <div className="flex items-center gap-2">
      <button
        className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-500 disabled:opacity-40"
        type="button"
        disabled={currentPage === 1}
        onClick={() => onChange(currentPage - 1)}
      >
        上一页
      </button>
      {pages.map((page) => (
        <button
          key={page}
          className={cn(
            "h-9 w-9 rounded-md text-sm font-medium",
            page === currentPage
              ? "bg-brand text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-100"
          )}
          type="button"
          onClick={() => onChange(page)}
        >
          {page}
        </button>
      ))}
      <button
        className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-500 disabled:opacity-40"
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onChange(currentPage + 1)}
      >
        下一页
      </button>
    </div>
  )
}
