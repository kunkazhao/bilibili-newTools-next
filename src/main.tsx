import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
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
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="p-8">
          <SchemeDetailPage schemeId={schemeId} onBack={handleBack} />
        </div>
      </div>
    </ToastProvider>
  )
}

const standaloneSchemeId = getStandaloneSchemeId(window.location.search)

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    {standaloneSchemeId ? renderStandaloneScheme(standaloneSchemeId) : <App />}
  </React.StrictMode>
)
