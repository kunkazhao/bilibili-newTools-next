import PrimaryButton from "@/components/PrimaryButton"

interface EmptyProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export default function Empty({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">空状态</div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-slate-500">{description}</p>
      ) : null}
      {actionLabel ? (
        <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>
      ) : null}
    </div>
  )
}