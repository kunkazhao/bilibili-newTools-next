import { useToast } from "@/components/Toast"
import AutoCartPageView from "@/components/auto-cart/AutoCartPageView"

export default function AutoCartPage() {
  const { showToast } = useToast()

  return (
    <AutoCartPageView
      onStart={() => showToast("一键加购功能待迁移", "info")}
      onClear={() => showToast("清空功能待迁移", "info")}
    />
  )
}
