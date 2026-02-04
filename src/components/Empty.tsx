import PrimaryButton from "@/components/PrimaryButton"

interface EmptyProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  hideTitle?: boolean
}

export default function Empty({
  title,
  description,
  actionLabel,
  onAction,
  hideTitle = false,
}: EmptyProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
      {!hideTitle && title ? (
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      ) : null}
      {description ? (
        <p className="max-w-sm text-sm text-slate-500">{description}</p>
      ) : null}
      {actionLabel ? (
        <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>
      ) : null}
    </div>
  )
}
