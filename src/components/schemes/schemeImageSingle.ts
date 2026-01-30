export type SingleImageTarget<TItem, TTemplate> =
  | { ok: true; item: TItem; template: TTemplate }
  | { ok: false; error: string }

export const selectSingleImageTarget = <TItem extends { id?: string }>(
  items: TItem[],
  templates: Array<{ id: string; html?: string }>,
  activeTemplateId: string,
  itemId: string
): SingleImageTarget<TItem, { id: string; html?: string }> => {
  if (!activeTemplateId) return { ok: false, error: "请先选择模板" }
  const template = templates.find((t) => t.id === activeTemplateId)
  if (!template?.html) return { ok: false, error: "请先选择模板" }
  const item = items.find((entry) => entry.id === itemId)
  if (!item) return { ok: false, error: "未找到商品" }
  return { ok: true, item, template }
}
