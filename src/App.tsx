import { Suspense, useState } from "react"
import AppLayout from "@/components/AppLayout"
import Empty from "@/components/Empty"
import { ToastProvider } from "@/components/Toast"
import { PAGES, getPageById } from "@/config/pages"

const Placeholder = ({ title }: { title: string }) => (
  <Empty title={title} description="该页面待迁移" />
)

const PageLoadingFallback = () => (
  <Empty title="页面加载中" description="正在加载页面资源，请稍候..." />
)

export default function App() {
  const [activePageId, setActivePageId] = useState(PAGES[0]?.id ?? "")
  const activePage = getPageById(activePageId)

  return (
    <ToastProvider>
      <AppLayout activePageId={activePageId} onSelect={setActivePageId}>
        <Suspense fallback={<PageLoadingFallback />}>
          {activePage ? activePage.render() : <Placeholder title="功能迁移中" />}
        </Suspense>
      </AppLayout>
    </ToastProvider>
  )
}
