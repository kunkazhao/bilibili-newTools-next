import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react"
import { Toaster, toast } from "sonner"

type ToastTone = "success" | "error" | "info"

interface ToastContextValue {
  showToast: (_message: string, _tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    if (tone === "success") {
      toast.success(message)
      return
    }
    if (tone === "error") {
      toast.error(message)
      return
    }
    toast(message)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster position="top-right" richColors />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}
