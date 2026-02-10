import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useToast } from "@/components/Toast"
import ModalForm from "@/components/ModalForm"
import DirectPlansPageView from "./DirectPlansPageView"
import type { DirectPlan, DirectPlanPlatform } from "./types"
import { apiRequest } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Field, FieldContent, FieldLabel, FieldSet } from "@/components/ui/field"
import { getUserErrorMessage } from "@/lib/errorMessages"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const PLATFORM_OPTIONS: DirectPlanPlatform[] = ["京东", "淘宝", "京东+淘宝"]

export default function DirectPlansPageContent() {
  const { showToast } = useToast()
  const [plans, setPlans] = useState<DirectPlan[]>([])
  const [loading, setLoading] = useState(true)
  const dragIdRef = useRef<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DirectPlan | null>(null)
  const [platform, setPlatform] = useState<DirectPlanPlatform>("京东")
  const [category, setCategory] = useState("")
  const [brand, setBrand] = useState("")
  const [planLink, setPlanLink] = useState("")
  const [commissionRate, setCommissionRate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DirectPlan | null>(null)

  const formTitle = editing ? "编辑计划" : "新增计划"

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiRequest<{ plans?: DirectPlan[] }>("/api/direct-plans")
      const list = Array.isArray(data?.plans) ? data.plans : []
      setPlans(list)
    } catch (error) {
      const message = getUserErrorMessage(error, "加载失败")
      showToast(message, "error")
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void fetchPlans()
  }, [fetchPlans])

  const resetForm = useCallback(() => {
    setPlatform("京东")
    setCategory("")
    setBrand("")
    setPlanLink("")
    setCommissionRate("")
  }, [])

  const openAdd = () => {
    resetForm()
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (plan: DirectPlan) => {
    setEditing(plan)
    setPlatform(plan.platform)
    setCategory(plan.category || "")
    setBrand(plan.brand || "")
    setPlanLink(plan.plan_link || "")
    setCommissionRate(plan.commission_rate || "")
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const validateForm = () => {
    if (!platform.trim()) {
      showToast("请选择平台", "error")
      return false
    }
    if (!category.trim()) {
      showToast("分类不能为空", "error")
      return false
    }
    if (!brand.trim()) {
      showToast("品牌不能为空", "error")
      return false
    }
    if (!planLink.trim()) {
      showToast("定向计划链接不能为空", "error")
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!validateForm()) return
    setSubmitting(true)
    try {
      const payload = {
        platform,
        category: category.trim(),
        brand: brand.trim(),
        plan_link: planLink.trim(),
        commission_rate: commissionRate.trim(),
      }
      if (editing) {
        const data = await apiRequest<{ plan?: DirectPlan }>(
          `/api/direct-plans/${editing.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        )
        const nextPlan = data?.plan ?? { ...editing, ...payload }
        setPlans((prev) =>
          prev.map((item) => (item.id === editing.id ? nextPlan : item))
        )
        showToast("已更新定向计划", "success")
      } else {
        const data = await apiRequest<{ plan?: DirectPlan }>("/api/direct-plans", {
          method: "POST",
          body: JSON.stringify(payload),
        })
        if (data?.plan) {
          setPlans((prev) => [data.plan as DirectPlan, ...prev])
        } else {
          await fetchPlans()
        }
        showToast("已新增定向计划", "success")
      }
      closeForm()
    } catch (error) {
      const message = getUserErrorMessage(error, "保存失败")
      showToast(message, "error")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRequest = (plan: DirectPlan) => {
    setDeleteTarget(plan)
    setConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await apiRequest(`/api/direct-plans/${deleteTarget.id}`, { method: "DELETE" })
      setPlans((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      showToast("已删除定向计划", "success")
    } catch (error) {
      const message = getUserErrorMessage(error, "删除失败")
      showToast(message, "error")
    } finally {
      setConfirmOpen(false)
      setDeleteTarget(null)
    }
  }

  const handleDragStart = (id: string) => {
    dragIdRef.current = id
  }

  const handleDragEnd = () => {
    dragIdRef.current = null
  }

  const handleDrop = async (targetId: string) => {
    const dragId = dragIdRef.current
    if (!dragId || dragId === targetId) return
    const next = [...plans]
    const fromIndex = next.findIndex((item) => item.id === dragId)
    const toIndex = next.findIndex((item) => item.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setPlans(next)
    dragIdRef.current = null
    try {
      await apiRequest("/api/direct-plans/reorder", {
        method: "POST",
        body: JSON.stringify({ ids: next.map((item) => item.id) }),
      })
    } catch (error) {
      const message = getUserErrorMessage(error, "保存排序失败")
      showToast(message, "error")
      await fetchPlans()
    }
  }

  const platformOptions = useMemo(
    () =>
      PLATFORM_OPTIONS.map((item) => (
        <SelectItem key={item} value={item}>
          {item}
        </SelectItem>
      )),
    []
  )

  return (
    <>
      <DirectPlansPageView
        loading={loading}
        plans={plans}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDeleteRequest}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDrop={handleDrop}
      />

      <ModalForm
        isOpen={formOpen}
        title={formTitle}
        onSubmit={handleSubmit}
        closeOnOverlayClick={false}
        onOpenChange={(open) => {
          if (!open) closeForm()
        }}
        confirmLabel={submitting ? "保存中..." : "保存"}
      >
        <FieldSet>
          <Field orientation="horizontal" className="items-center">
            <FieldLabel className="min-w-[72px]">平台</FieldLabel>
            <FieldContent>
              <Select value={platform} onValueChange={(value) => setPlatform(value as DirectPlanPlatform)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="选择平台" />
                </SelectTrigger>
                <SelectContent>{platformOptions}</SelectContent>
              </Select>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>分类</FieldLabel>
            <FieldContent>
              <Input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="输入分类"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>品牌</FieldLabel>
            <FieldContent>
              <Input
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="输入品牌"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>定向计划链接</FieldLabel>
            <FieldContent>
              <Input
                value={planLink}
                onChange={(event) => setPlanLink(event.target.value)}
                placeholder="输入定向计划链接"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>佣金比例</FieldLabel>
            <FieldContent>
              <Input
                value={commissionRate}
                onChange={(event) => setCommissionRate(event.target.value)}
                placeholder="例如 20%"
              />
            </FieldContent>
          </Field>
        </FieldSet>
      </ModalForm>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除定向计划？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复，请确认是否继续。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
