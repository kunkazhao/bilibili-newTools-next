import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import AppErrorBoundary from "./components/AppErrorBoundary"
import SchemeDetailPage from "./pages/SchemeDetailPage"
import { ToastProvider } from "./components/Toast"
import { getStandaloneSchemeId } from "./utils/standaloneRoutes"
import "./index.css"

const renderStandaloneScheme = (schemeId: string) => {
  const handleBack = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete("schemeId")
    url.searchParams.delete("standalone")
    window.location.href = `${url.pathname}${url.search}`
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <div className="pb-8 pt-0">
          <SchemeDetailPage schemeId={schemeId} onBack={handleBack} />
        </div>
      </div>
    </ToastProvider>
  )
}

const standaloneSchemeId = getStandaloneSchemeId(window.location.search)

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      {standaloneSchemeId ? renderStandaloneScheme(standaloneSchemeId) : <App />}
    </AppErrorBoundary>
  </React.StrictMode>
)
