import { useState } from "react"
import AppLayout from "@/components/AppLayout"
import Empty from "@/components/Empty"
import { ToastProvider } from "@/components/Toast"
import { PAGES, getPageById } from "@/config/pages"

const Placeholder = ({ title }: { title: string }) => (
  <Empty title={title} description="该页面待迁移" />
)

export default function App() {
  const [activePageId, setActivePageId] = useState(PAGES[0]?.id ?? "")
  const activePage = getPageById(activePageId)

  return (
    <ToastProvider>
      <AppLayout activePageId={activePageId} onSelect={setActivePageId}>
        {activePage ? activePage.render() : <Placeholder title="功能迁移中" />}
      </AppLayout>
    </ToastProvider>
  )
}
