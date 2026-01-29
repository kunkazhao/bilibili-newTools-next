import React from "react"
import InputGroup from "@/components/InputGroup"
import ModalForm from "@/components/ModalForm"
import Pagination from "@/components/Pagination"
import PrimaryButton from "@/components/PrimaryButton"
import ProductCard from "@/components/ProductCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Skeleton from "@/components/Skeleton"
import Table from "@/components/Table"
import Tabs from "@/components/Tabs"
import { useToast } from "@/components/Toast"
import Badge from "@/components/Badge"
import Tooltip from "@/components/Tooltip"
import Empty from "@/components/Empty"

interface DemoContentProps {
  price: string
  onPriceChange: (value: string) => void
  onOpenModal: () => void
}

export default function DemoContent({
  price,
  onPriceChange,
  onOpenModal,
}: DemoContentProps) {
  const { showToast } = useToast()
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [categoryValue, setCategoryValue] = React.useState("mouse")

  const tableColumns = [
    { key: "name", title: "商品名" },
    { key: "price", title: "价格" },
    { key: "status", title: "状态" },
  ]

  const tableData = [
    { id: 1, name: "罗技 G 系列鼠标", price: "299 元", status: "已上架" },
    { id: 2, name: "雷蛇 专业键盘", price: "699 元", status: "待调整" },
  ]

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              组件约束模板
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              页面层不写样式，全部通过组件暴露的 Props 组装。
            </p>
          </div>
          <PrimaryButton onClick={onOpenModal}>新建动作</PrimaryButton>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h4 className="text-base font-semibold text-slate-900">
            统一输入组件
          </h4>
          <div className="mt-5 grid gap-4">
            <InputGroup
              label="商品标题"
              placeholder="请输入商品标题"
              value="罗技 G 系列电竞鼠标"
            />
            <InputGroup
              label="价格"
              placeholder="请输入价格"
              value={price}
              onChange={onPriceChange}
              errorMessage={price ? "" : "价格不能为空"}
            />
            <div className="grid items-center gap-2 md:grid-cols-[120px_1fr]">
              <span className="text-sm text-slate-600">所属分类</span>
              <Select value={categoryValue} onValueChange={setCategoryValue}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mouse">鼠标</SelectItem>
                  <SelectItem value="keyboard">键盘</SelectItem>
                  <SelectItem value="headset">耳机</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ProductCard
          title="罗技 G 系列电竞鼠标"
          price={price}
          image="https://images.unsplash.com/photo-1527814050087-3793815479db?q=80&w=1200&auto=format&fit=crop"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h4 className="text-base font-semibold text-slate-900">表格组件</h4>
          <Table columns={tableColumns} data={tableData} />
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h4 className="text-base font-semibold text-slate-900">加载骨架</h4>
          <div className="grid gap-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex gap-3">
            <PrimaryButton onClick={() => showToast("已保存变更", "success")}>
              触发提示
            </PrimaryButton>
            <PrimaryButton onClick={() => setIsFormOpen(true)}>
              打开表单弹窗
            </PrimaryButton>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h4 className="text-base font-semibold text-slate-900">标签与提示</h4>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge label="进行中" tone="primary" />
          <Badge label="已完成" tone="success" />
          <Badge label="待审核" tone="warning" />
          <Tooltip content="这是一个说明提示">
            <span className="cursor-default text-sm text-slate-500">
              鼠标悬浮查看提示
            </span>
          </Tooltip>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h4 className="text-base font-semibold text-slate-900">Tabs + Pagination</h4>
        <div className="mt-4 space-y-6">
          <Tabs
            items={[
              {
                label: "热门",
                value: "hot",
                content: (
                  <p className="text-sm text-slate-600">
                    这里是热门列表的数据视图。
                  </p>
                ),
              },
              {
                label: "最新",
                value: "new",
                content: (
                  <p className="text-sm text-slate-600">
                    这里是最新上架的数据视图。
                  </p>
                ),
              },
              {
                label: "已存档",
                value: "archived",
                content: (
                  <p className="text-sm text-slate-600">
                    这里是已存档商品的数据。
                  </p>
                ),
              },
            ]}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={5}
            onChange={setCurrentPage}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h4 className="text-base font-semibold text-slate-900">Empty</h4>
        <div className="mt-4">
          <Empty
            title="暂无商品"
            description="请先通过导入或新建的方式补充商品数据。"
            actionLabel="立即添加"
            onAction={() => showToast("请打开新增商品弹窗", "info")}
          />
        </div>
      </section>

      <ModalForm
        isOpen={isFormOpen}
        title="新增分类"
        onOpenChange={setIsFormOpen}
        onSubmit={() => {
          setIsFormOpen(false)
          showToast("分类已保存", "success")
        }}
      >
        <InputGroup label="分类名称" placeholder="请输入分类名称" />
        <div className="grid items-center gap-2 md:grid-cols-[120px_1fr]">
          <span className="text-sm text-slate-600">展示状态</span>
          <Select defaultValue="active">
            <SelectTrigger>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">显示</SelectItem>
              <SelectItem value="hidden">隐藏</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ModalForm>
    </div>
  )
}
