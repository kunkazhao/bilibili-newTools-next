import { useEffect, useMemo, useRef, useState } from "react"
import Skeleton from "@/components/Skeleton"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { CategoryItem } from "@/components/archive/types"

type CategoryHierarchyProps = {
  title: string
  categories: CategoryItem[]
  activeParentId?: string
  activeCategoryId?: string
  onParentSelect?: (id: string) => void
  onCategorySelect: (id: string) => void
  showChildCount?: boolean
  isLoading: boolean
}

const CategorySkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
      >
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-10" />
      </div>
    ))}
  </div>
)

export default function CategoryHierarchy({
  title,
  categories,
  activeParentId,
  activeCategoryId,
  onParentSelect,
  onCategorySelect,
  showChildCount,
  isLoading,
}: CategoryHierarchyProps) {
  const parents = useMemo(
    () =>
      categories
        .filter((item) => !item.parentId)
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories]
  )

  const childrenByParent = useMemo(() => {
    const map = new Map<string, CategoryItem[]>()
    categories.forEach((item) => {
      if (!item.parentId) return
      const parentKey = String(item.parentId)
      if (!map.has(parentKey)) map.set(parentKey, [])
      map.get(parentKey)?.push(item)
    })
    map.forEach((items) => items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
    return map
  }, [categories])

  const [openParentId, setOpenParentId] = useState(activeParentId ?? "")
  const prevActiveParentRef = useRef<string | undefined>(activeParentId)

  useEffect(() => {
    if (activeParentId && activeParentId !== prevActiveParentRef.current) {
      setOpenParentId(activeParentId)
    }
    prevActiveParentRef.current = activeParentId
  }, [activeParentId])

  useEffect(() => {
    if (!openParentId) return
    if (!parents.some((parent) => parent.id === openParentId)) {
      setOpenParentId("")
    }
  }, [openParentId, parents])

  if (isLoading) {
    return <CategorySkeleton />
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-slate-400">{title}</div>
      <Accordion
        type="single"
        collapsible
        value={openParentId}
        onValueChange={(value) => {
          setOpenParentId(value)
          if (value && onParentSelect) {
            onParentSelect(value)
          }
        }}
      >
        {parents.map((parent) => {
          const children = childrenByParent.get(parent.id) ?? []
          return (
            <AccordionItem key={parent.id} value={parent.id} className="border-none">
              <AccordionTrigger>{parent.name}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {children.length ? (
                    children.map((child) => (
                      <button
                        key={child.id}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${
                          activeCategoryId === child.id
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                        type="button"
                        onClick={() => onCategorySelect(child.id)}
                      >
                        <span>{child.name}</span>
                        {showChildCount ? (
                          <span className="text-xs text-slate-400">
                            {child.count ?? 0} 个选品
                          </span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
                      暂无二级分类
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
