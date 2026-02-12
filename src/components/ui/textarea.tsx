import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      id,
      name,
      placeholder,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    ref
  ) => {
    const fallbackId = React.useId()
    const resolvedId = id ?? `textarea-${fallbackId}`
    const resolvedName = name ?? resolvedId
    const hasPlaceholder =
      typeof placeholder === "string" && placeholder.trim().length > 0
    const resolvedAriaLabel =
      ariaLabel ?? (ariaLabelledBy ? undefined : hasPlaceholder ? placeholder : undefined)

    return (
      <textarea
        id={resolvedId}
        name={resolvedName}
        placeholder={placeholder}
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "flex min-h-[96px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
