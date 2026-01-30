import SchemeDetailPageContent from "@/components/pages/SchemeDetailPage"

interface SchemeDetailPageProps {
  schemeId: string
  onBack: () => void
}

export default function SchemeDetailPage(props: SchemeDetailPageProps) {
  return <SchemeDetailPageContent {...props} />
}
