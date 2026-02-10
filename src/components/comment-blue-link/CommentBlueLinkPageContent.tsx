import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useToast } from "@/components/Toast"

import { apiRequest } from "@/lib/api"

import {

  buildComboContent,

  buildProductContent,

  getPinnedComments,

  isBilibiliInput,

} from "@/lib/bilibili"

import CommentBlueLinkDialogs from "./CommentBlueLinkDialogs"

import CommentBlueLinkPageView from "./CommentBlueLinkPageView"

import { fetchCommentBlueLinkState } from "./commentBlueLinkApi"

import { useListDataPipeline } from "@/hooks/useListDataPipeline"

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

import type { CommentAccount, CommentCombo } from "./types"
import { getUserErrorMessage } from "@/lib/errorMessages"
const COMMENT_BLUE_LINK_PRODUCT_KEY = "comment_combo_product_"

const CHUNK_SIZE = 40

type CommentBlueLinkState = {
  accounts: CommentAccount[]
  combos: CommentCombo[]
}

const EMPTY_STATE: CommentBlueLinkState = { accounts: [], combos: [] }
export default function CommentBlueLinkPage() {
  const { showToast } = useToast()
  const { items: stateItems, status, error, setItems: setStateItems } =
    useListDataPipeline<CommentBlueLinkState, { scope: string }, CommentBlueLinkState>({
      cacheKey: "comment-blue-link",
      ttlMs: 3 * 60 * 1000,

      pageSize: 1,

      initialFilters: { scope: "all" },

      fetcher: async () => fetchCommentBlueLinkState(),
      mapResponse: (response) => {
        const accounts = Array.isArray(response.accounts) ? response.accounts : []
        const combos = Array.isArray(response.combos) ? response.combos : []
        return {
          items: [{ accounts, combos }],
          pagination: { hasMore: false, nextOffset: 1 },
        }
      },
    })
  const state = stateItems[0] ?? EMPTY_STATE
  const accounts = state.accounts
  const combos = state.combos
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [visibleCombos, setVisibleCombos] = useState<CommentCombo[]>([])
  const chunkTimerRef = useRef<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCombo, setEditingCombo] = useState<CommentCombo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CommentCombo | null>(null)
  const [formAccountId, setFormAccountId] = useState("")
  const [formName, setFormName] = useState("")
  const [formSourceLink, setFormSourceLink] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formRemark, setFormRemark] = useState("")
  const [extracting, setExtracting] = useState(false)

  const [comboViewModes, setComboViewModes] = useState<

    Record<string, "full" | "product">

  >({})

  const [productContents, setProductContents] = useState<Record<string, string>>({})

  const [productLoading, setProductLoading] = useState<Record<string, boolean>>({})

  const lastErrorRef = useRef<string | null>(null)



  const updateState = useCallback(

    (updater: (prev: CommentBlueLinkState) => CommentBlueLinkState) => {

      setStateItems((prev) => {

        const current = prev[0] ?? EMPTY_STATE

        return [updater(current)]

      })

    },

    [setStateItems]

  )



  const isPageLoading = status === "loading" || status === "warmup"
  const isListLoading = status === "loading" || status === "warmup" || status === "refreshing"
  const combosIndex = useMemo(() => {
    const byAccount = new Map<string, CommentCombo[]>()
    const counts = new Map<string, number>()
    combos.forEach((combo) => {
      const accountId = combo.account_id
      let list = byAccount.get(accountId)
      if (!list) {
        list = []
        byAccount.set(accountId, list)
      }
      list.push(combo)
      counts.set(accountId, (counts.get(accountId) ?? 0) + 1)
    })
    return { byAccount, counts }
  }, [combos])
  const filteredCombos = useMemo(() => {
    if (!currentAccountId) return []
    return combosIndex.byAccount.get(currentAccountId) ?? []
  }, [combosIndex, currentAccountId])
  useEffect(() => {

    if (status !== "error" || !error) return

    if (lastErrorRef.current === error) return

    lastErrorRef.current = error

    showToast(error, "error")

  }, [error, showToast, status])



  useEffect(() => {
    if (accounts.length === 0) {
      setCurrentAccountId(null)
      return
    }
    setCurrentAccountId((prev) => {
      if (prev && accounts.some((item) => item.id === prev)) {
        return prev
      }
      return accounts[0]?.id || null
    })
  }, [accounts])
  useEffect(() => {

    if (chunkTimerRef.current) {

      window.clearTimeout(chunkTimerRef.current)

      chunkTimerRef.current = null

    }

    if (!filteredCombos.length) {

      setVisibleCombos([])

      return

    }

    let index = 0

    const next = () => {

      index += CHUNK_SIZE

      setVisibleCombos(filteredCombos.slice(0, index))

      if (index < filteredCombos.length) {

        chunkTimerRef.current = window.setTimeout(next, 16)

      }

    }

    setVisibleCombos(filteredCombos.slice(0, CHUNK_SIZE))

    if (filteredCombos.length > CHUNK_SIZE) {

      chunkTimerRef.current = window.setTimeout(next, 16)

    }

  }, [filteredCombos])

  const readProductCache = (comboId: string) => {

    if (!comboId) return ""

    try {

      return (

        localStorage.getItem(`${COMMENT_BLUE_LINK_PRODUCT_KEY}${comboId}`)?.trim() ||

        ""

      )

    } catch {

      return ""

    }

  }

  const writeProductCache = (comboId: string, content: string) => {

    if (!comboId) return

    const safeContent = (content || "").trim()

    if (!safeContent) return

    try {

      localStorage.setItem(`${COMMENT_BLUE_LINK_PRODUCT_KEY}${comboId}`, safeContent)

    } catch {

      // ignore

    }

  }

  const ensureProductContent = async (combo: CommentCombo) => {

    if (!combo?.id) return

    const comboId = combo.id

    const directProduct = (combo.product_content || "").trim()

    if (directProduct) {

      if (!productContents[comboId]) {

        setProductContents((prev) => ({ ...prev, [comboId]: directProduct }))

      }

      return

    }

    const cached = productContents[comboId] || readProductCache(comboId)

    if (cached) {

      if (!productContents[comboId]) {

        setProductContents((prev) => ({ ...prev, [comboId]: cached }))

      }

      return

    }

    if (!combo.source_link) {

      const fallback = "未获取到商品名称"

      setProductContents((prev) => ({ ...prev, [comboId]: fallback }))

      writeProductCache(comboId, fallback)

      return

    }

    if (productLoading[comboId]) return

    setProductLoading((prev) => ({ ...prev, [comboId]: true }))

    try {

      const result = await getPinnedComments(combo.source_link)

      const content = buildProductContent(result)

      const safeContent = (content || "").trim() || "未获取到商品名称"

      setProductContents((prev) => ({ ...prev, [comboId]: safeContent }))

      writeProductCache(comboId, safeContent)

    } catch (error) {

      const message = getUserErrorMessage(error, "生成商品版失败")

      showToast(message, "error")

      const fallback = "未获取到商品名称"

      setProductContents((prev) => ({ ...prev, [comboId]: fallback }))

      writeProductCache(comboId, fallback)

    } finally {

      setProductLoading((prev) => ({ ...prev, [comboId]: false }))

    }

  }

      const getComboDisplayContent = (combo: CommentCombo) => {

    const mode = comboViewModes[combo.id] ?? "full"

    if (mode === "product") {

      const directProduct = (combo.product_content || "").trim()

      if (directProduct) {

        return directProduct

      }

      const cached = productContents[combo.id] || readProductCache(combo.id)

      if (cached) {

        if (!productContents[combo.id]) {

          setProductContents((prev) => ({ ...prev, [combo.id]: cached }))

        }

        return cached

      }

      if (!combo.source_link) {

        return "请先填写来源链接"

      }

      if (productLoading[combo.id]) {

        return "正在提取商品内容..."

      }

      return ""

    }

    return combo.content || ""

  }

  const copyText = async (content: string) => {

    if (navigator.clipboard?.writeText) {

      await navigator.clipboard.writeText(content)

      return true

    }

    try {

      const textarea = document.createElement("textarea")

      textarea.value = content

      textarea.style.position = "fixed"

      textarea.style.opacity = "0"

      document.body.appendChild(textarea)

      textarea.select()

      document.execCommand("copy")

      document.body.removeChild(textarea)

      return true

    } catch {

      return false

    }

  }

  const handleCopyCombo = async (combo: CommentCombo) => {

    const content = getComboDisplayContent(combo).trim()

    if (!content) {

      const mode = comboViewModes[combo.id] ?? "full"

      if (mode === "product") {

        showToast("商品内容为空，正在尝试提取", "info")

        void ensureProductContent(combo)

      } else {

        showToast("暂无可复制内容", "info")

      }

      return

    }

    try {

      const ok = await copyText(content)

      if (ok) {

        showToast("复制成功", "success")

      } else {

        showToast("复制失败，请手动复制", "error")

      }

    } catch {

      showToast("复制失败，请手动复制", "error")

    }

  }

  const handleToggleVersion = (combo: CommentCombo) => {

    const current = comboViewModes[combo.id] ?? "full"

    const next = current === "full" ? "product" : "full"

    setComboViewModes((prev) => ({ ...prev, [combo.id]: next }))

    if (next === "product") {

      const directProduct = (combo.product_content || "").trim()

      if (directProduct) {

        if (!productContents[combo.id]) {

          setProductContents((prev) => ({ ...prev, [combo.id]: directProduct }))

        }

        return

      }

      void ensureProductContent(combo)

    }

  }

  const openCreate = () => {

    setEditingCombo(null)

    const accountId = currentAccountId ?? ""

    setFormAccountId(accountId)

    setFormName("")

    setFormSourceLink("")

    setFormContent("")

    setFormRemark("")

    setModalOpen(true)

  }

  const openEdit = (combo: CommentCombo) => {

    setEditingCombo(combo)

    setFormAccountId(combo.account_id)

    setFormName(combo.name || "")

    setFormSourceLink(combo.source_link || "")

    setFormContent(combo.content || "")

    setFormRemark(combo.remark || "")

    setModalOpen(true)

  }

  const handleExtractContent = async () => {

    if (extracting) return

    const link = formSourceLink.trim()

    if (!link) {

      showToast("请输入B站链接或BV号", "info")

      return

    }

    if (!isBilibiliInput(link)) {

      showToast("仅支持B站链接、b23短链或BV号", "error")

      return

    }

    setExtracting(true)

    try {

      const result = await getPinnedComments(link)

      const content = buildComboContent(result)

      setFormContent(content)

      showToast("提取完成", "success")

    } catch (error) {

      const message = getUserErrorMessage(error, "提取失败")

      showToast(message, "error")

    } finally {

      setExtracting(false)

    }

  }

  const handleSave = async () => {
    if (!formAccountId) {
      showToast("请选择账号", "error")
      return
    }
    if (!formName.trim()) {
      showToast("组合名称不能为空", "error")
      return
    }
    const payload = {
      account_id: formAccountId,
      name: formName.trim(),
      source_link: formSourceLink.trim(),
      content: formContent.trim(),
      remark: formRemark.trim(),
    }
    try {
      if (editingCombo) {
        const data = await apiRequest<{ combo: CommentCombo }>(
          `/api/comment/combos/${editingCombo.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        )
        updateState((prev) => ({
          ...prev,
          combos: prev.combos.map((item) =>
            item.id === data.combo.id ? data.combo : item
          ),
        }))
        showToast("保存成功", "success")
      } else {
        const data = await apiRequest<{ combo: CommentCombo }>("/api/comment/combos", {
          method: "POST",
          body: JSON.stringify(payload),
        })
        updateState((prev) => ({
          ...prev,
          combos: [data.combo, ...prev.combos],
        }))
        showToast("新增成功", "success")
      }
      setModalOpen(false)
    } catch (error) {
      const message = getUserErrorMessage(error, "保存失败")
      showToast(message, "error")
    }
  }
  const handleDelete = async (combo: CommentCombo) => {

    try {

      await apiRequest(`/api/comment/combos/${combo.id}`, { method: "DELETE" })

      updateState((prev) => ({
        ...prev,
        combos: prev.combos.filter((item) => item.id !== combo.id),
      }))
      showToast("删除成功", "success")

    } catch (error) {

      const message = getUserErrorMessage(error, "删除失败")

      showToast(message, "error")

    }

  }

  const handleDeleteConfirm = async () => {

    if (!deleteTarget) return

    await handleDelete(deleteTarget)

    setDeleteTarget(null)

  }

  const comboViewStates = useMemo(() => {

    const states: Record<

      string,

      { mode: "full" | "product"; content: string; loading: boolean }

    > = {}

    combos.forEach((combo) => {

      const mode = comboViewModes[combo.id] ?? "full"

      if (mode === "product") {

        const directProduct = (combo.product_content || "").trim()

        const cached =

          directProduct || productContents[combo.id] || readProductCache(combo.id)

        const loading = Boolean(productLoading[combo.id]) && !directProduct

        let content = cached

        if (!content) {

          if (!combo.source_link) {

            content = "未获取到商品名称"

          } else {

            content = "商品版生成中..."

          }

        }

        states[combo.id] = { mode, content, loading }

        return

      }

      states[combo.id] = {

        mode,

        content: combo.content || "",

        loading: false,

      }

    })

    return states

  }, [combos, comboViewModes, productContents, productLoading])

  const combosCountByAccount = combosIndex.counts

  return (

    <>

      <CommentBlueLinkPageView

        loading={isPageLoading}
        listLoading={isListLoading}
        accounts={accounts}

        currentAccountId={currentAccountId}

        filteredCombos={filteredCombos}

        visibleCombos={visibleCombos}

        combosCountByAccount={combosCountByAccount}

        comboViewStates={comboViewStates}

        onAccountChange={setCurrentAccountId}

        onCopyCombo={handleCopyCombo}

        onOpenCreate={openCreate}

        onOpenEdit={openEdit}

        onDelete={(combo) => setDeleteTarget(combo)}

        onToggleVersion={handleToggleVersion}

      />

      <CommentBlueLinkDialogs

        modalOpen={modalOpen}

        editing={Boolean(editingCombo)}

        accounts={accounts}


        formAccountId={formAccountId}


        formName={formName}

        formSourceLink={formSourceLink}

        formContent={formContent}

        formRemark={formRemark}

        extracting={extracting}

        onModalOpenChange={setModalOpen}

        onAccountChange={setFormAccountId}


        onNameChange={setFormName}

        onSourceLinkChange={setFormSourceLink}

        onContentChange={setFormContent}

        onRemarkChange={setFormRemark}

        onExtract={handleExtractContent}

        onSave={handleSave}

      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => {

        if (!open) setDeleteTarget(null)

      }}>

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>确认删除</AlertDialogTitle>

          <AlertDialogDescription>
            确认删除{deleteTarget?.name ? `【${deleteTarget.name}】` : "该项"}吗？该操作无法撤销。
          </AlertDialogDescription>

          </AlertDialogHeader>

          <AlertDialogFooter>

            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>取消</AlertDialogCancel>

            <AlertDialogAction onClick={handleDeleteConfirm}>确认删除</AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>

    </>

  )

}







