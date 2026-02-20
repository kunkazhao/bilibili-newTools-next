import { Suspense, useState } from "react"
import AppLayout from "@/components/AppLayout"
import Empty from "@/components/Empty"
import PageSkeleton from "@/components/PageSkeleton"
import { ToastProvider } from "@/components/Toast"
import { PAGES, getPageById } from "@/config/pages"

const Placeholder = ({ title }: { title: string }) => (
  <Empty title={title} description={"\u8be5\u9875\u9762\u5f85\u8fc1\u79fb"} />
)

export default function App() {
  const [activePageId, setActivePageId] = useState(PAGES[0]?.id ?? "")
  const activePage = getPageById(activePageId)

  return (
    <ToastProvider>
      <AppLayout activePageId={activePageId} onSelect={setActivePageId}>
        <Suspense fallback={<PageSkeleton />}>
          <div key={activePageId}>
            {activePage ? activePage.render() : <Placeholder title={"\u529f\u80fd\u8fc1\u79fb\u4e2d"} />}
          </div>
        </Suspense>
      </AppLayout>
    </ToastProvider>
  )
}
