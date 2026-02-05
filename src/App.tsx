import { useState } from "react"
import AppLayout from "@/components/AppLayout"
import CommissionPage from "@/pages/CommissionPage"
import ArchivePage from "@/pages/ArchivePage"
import SchemesPage from "@/pages/SchemesPage"
import CommentBlueLinkPage from "@/pages/CommentBlueLinkPage"
import BlueLinkMapPage from "@/pages/BlueLinkMapPage"
import RecognizePage from "@/pages/RecognizePage"
import BenchmarkPage from "@/pages/BenchmarkPage"
import ScriptPage from "@/pages/ScriptPage"
import AutoCartPage from "@/pages/AutoCartPage"
import MyAccountPage from "@/pages/MyAccountPage"
import ZhihuRadarPage from "@/pages/ZhihuRadarPage"
import Empty from "@/components/Empty"
import { ToastProvider } from "@/components/Toast"
import { openSchemeDetailPage } from "@/utils/standaloneRoutes"

const Placeholder = ({ title }: { title: string }) => (
  <Empty title={title} description="该页面待迁移" />
)

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0)

  const renderPage = () => {
    switch (activeIndex) {
      case 0:
        return <ArchivePage />
      case 1:
        return <SchemesPage onEnterScheme={openSchemeDetailPage} />
      case 2:
        return <CommentBlueLinkPage />
      case 3:
        return <BlueLinkMapPage />
      case 4:
        return <MyAccountPage />
      case 5:
        return <CommissionPage />
      case 6:
        return <RecognizePage />
      case 7:
        return <BenchmarkPage />
      case 8:
        return <ScriptPage />
      case 9:
        return <AutoCartPage />
      case 10:
        return <ZhihuRadarPage />
      default:
        return <Placeholder title="功能迁移中" />
    }
  }

  return (
    <ToastProvider>
      <AppLayout activeIndex={activeIndex} onSelect={setActiveIndex}>
        {renderPage()}
      </AppLayout>
    </ToastProvider>
  )
}
