import { useId } from "react"
import Empty from "@/components/Empty"
import PrimaryButton from "@/components/PrimaryButton"
import { Input } from "@/components/ui/input"

type AutoCartPageViewProps = {
  onStart: () => void
  onClear: () => void
}

export default function AutoCartPageView({ onStart, onClear }: AutoCartPageViewProps) {
  const inputId = useId()
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">一键加购</h2>
            <p className="mt-1 text-sm text-slate-500">
              批量输入商品链接，快速生成加购清单。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={onStart}>开始加购</PrimaryButton>
            <PrimaryButton onClick={onClear}>清空列表</PrimaryButton>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="space-y-3">
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            商品链接
          </label>
          <Input id={inputId} placeholder="每行一个商品链接，支持批量粘贴" />
          <p className="text-xs text-slate-400">解析与批量加购逻辑待迁移。</p>
        </div>
        <div className="mt-6">
          <Empty title="暂无加购任务" description="输入链接并开始加购后显示处理结果。" />
        </div>
      </section>
    </div>
  )
}
