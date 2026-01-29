import { useState } from "react"
import AppLayout from "@/components/AppLayout"
import CommissionPage from "@/pages/CommissionPage"
import ArchivePage from "@/pages/ArchivePage"
import SchemesPage from "@/pages/SchemesPage"
import SchemeDetailPage from "@/pages/SchemeDetailPage"
import CommentBlueLinkPage from "@/pages/CommentBlueLinkPage"
import BlueLinkMapPage from "@/pages/BlueLinkMapPage"
import RecognizePage from "@/pages/RecognizePage"
import BenchmarkPage from "@/pages/BenchmarkPage"
import ScriptPage from "@/pages/ScriptPage"
import AutoCartPage from "@/pages/AutoCartPage"
import Empty from "@/components/Empty"
import { ToastProvider } from "@/components/Toast"

const Placeholder = ({ title }: { title: string }) => (
  <Empty title={title} description="该页面待迁移" />
)

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeSchemeId, setActiveSchemeId] = useState<string | null>(null)

  const handleSelect = (index: number) => {
    setActiveIndex(index)
    if (index !== 0) {
      setActiveSchemeId(null)
    }
  }

  const renderPage = () => {
    if (activeIndex === 0 && activeSchemeId) {
      return (
        <SchemeDetailPage
          schemeId={activeSchemeId}
          onBack={() => setActiveSchemeId(null)}
        />
      )
    }

    switch (activeIndex) {
      case 0:
        return <SchemesPage onEnterScheme={setActiveSchemeId} />
      case 1:
        return <ArchivePage />
      case 2:
        return <CommissionPage />
      case 3:
        return <RecognizePage />
      case 4:
        return <BenchmarkPage />
      case 5:
        return <CommentBlueLinkPage />
      case 6:
        return <BlueLinkMapPage />
      case 7:
        return <ScriptPage />
      case 8:
        return <AutoCartPage />
      default:
        return <Placeholder title="功能迁移中" />
    }
  }

  return (
    <ToastProvider>
      <AppLayout activeIndex={activeIndex} onSelect={handleSelect}>
        {renderPage()}
      </AppLayout>
    </ToastProvider>
  )
}
