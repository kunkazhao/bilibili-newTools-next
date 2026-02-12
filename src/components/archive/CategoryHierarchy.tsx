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
  title?: string
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
  title: _title,
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
              <AccordionTrigger className="px-3 py-2 text-sm font-medium text-slate-700 data-[state=open]:bg-transparent data-[state=open]:text-slate-900">
                {parent.name}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {children.length ? (
                    children.map((child) => {
                      const isActive = activeCategoryId === child.id
                      return (
                        <button
                          key={child.id}
                          className={`flex w-full items-center gap-3 rounded-xl py-2 pr-3 text-sm ${
                            isActive
                              ? "bg-slate-100 text-slate-900"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                          type="button"
                          onClick={() => onCategorySelect(child.id)}
                        >
                          <span className="min-w-0 flex-1 truncate pl-6 text-left">{child.name}</span>
                          {showChildCount ? (
                            <span
                              className={`shrink-0 min-w-[3rem] text-right text-xs ${
                                isActive ? "text-slate-600" : "text-slate-400"
                              }`}
                            >
                              {child.count ?? 0}
                            </span>
                          ) : null}
                        </button>
                      )
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
                      {"\u6682\u65e0\u4e8c\u7ea7\u5206\u7c7b"}
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
