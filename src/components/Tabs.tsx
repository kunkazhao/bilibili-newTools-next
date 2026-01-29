import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

interface TabItem {
  label: string
  value: string
  content: React.ReactNode
}

interface TabsProps {
  items: TabItem[]
  defaultValue?: string
}

export default function Tabs({ items, defaultValue }: TabsProps) {
  const initialValue = defaultValue ?? items[0]?.value ?? ""

  return (
    <TabsPrimitive.Root defaultValue={initialValue} className="w-full">
      <TabsPrimitive.List className="inline-flex items-center gap-2 rounded-full bg-slate-100 p-1">
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition",
              "data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow"
            )}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          key={item.value}
          value={item.value}
          className="mt-4"
        >
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}
