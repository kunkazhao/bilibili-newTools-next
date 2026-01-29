import { cn } from "@/lib/utils"

interface BadgeProps {
  label: string
  tone?: "default" | "primary" | "success" | "warning"
}

export default function Badge({ label, tone = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        tone === "default" && "bg-slate-100 text-slate-600",
        tone === "primary" && "bg-brand/10 text-brand",
        tone === "success" && "bg-emerald-100 text-emerald-700",
        tone === "warning" && "bg-amber-100 text-amber-700"
      )}
    >
      {label}
    </span>
  )
}
