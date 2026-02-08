import React from "react"
import { Button } from "@/components/ui/button"

type AppErrorBoundaryProps = {
  children: React.ReactNode
  onReload?: () => void
  onReset?: () => void
}

type AppErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

export default class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[AppErrorBoundary]", error, errorInfo)
    }
  }

  private handleReload = () => {
    if (this.props.onReload) {
      this.props.onReload()
      return
    }
    window.location.reload()
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">页面加载失败</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              页面出现异常，请点击刷新页面后重试。
            </p>
            {this.state.error ? (
              <p className="mt-2 text-xs leading-5 text-slate-500 break-all">
                错误信息：{this.state.error.message || "未知错误"}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={this.handleReload}>刷新页面</Button>
              {this.props.onReset ? (
                <Button variant="outline" onClick={this.handleReset}>
                  重试
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
