import { Input } from "@/components/ui/input"

interface InputGroupProps {
  label: string
  placeholder?: string
  value?: string
  errorMessage?: string
  onChange?: (_value: string) => void
  width?: "sm" | "md" | "lg" | "xl"
}

export default function InputGroup({
  label,
  placeholder,
  value,
  errorMessage,
  onChange,
  width = "md",
}: InputGroupProps) {
  const widthClass =
    width === "sm"
      ? "md:max-w-[220px]"
      : width === "lg"
        ? "md:max-w-[420px]"
        : width === "xl"
          ? "md:max-w-[520px]"
          : "md:max-w-[320px]"
  return (
    <label className={`grid gap-3 text-sm text-slate-600 md:grid-cols-[max-content_1fr] md:items-center ${widthClass}`}>
      <span className="font-medium text-slate-700">{label}</span>
      <div className="space-y-1">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
        />
        <span className="min-h-[18px] text-xs text-rose-500">
          {errorMessage}
        </span>
      </div>
    </label>
  )
}
