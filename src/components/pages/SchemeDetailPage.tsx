import SchemeDetailPageContent from "@/components/schemes/SchemeDetailPageContent"

interface SchemeDetailPageProps {
  schemeId: string
  onBack: () => void
}

export default function SchemeDetailPage(props: SchemeDetailPageProps) {
  return <SchemeDetailPageContent {...props} />
}
