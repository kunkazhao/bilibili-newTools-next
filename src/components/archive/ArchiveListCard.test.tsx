// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import ArchiveListCard from "./ArchiveListCard"

describe("ArchiveListCard", () => {
  afterEach(() => {
    cleanup()
  })

  it("uses lazy loading for cover image", () => {
    const { container } = render(
      <ArchiveListCard
        id="1"
        title="商品"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="店铺"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
      />
    )

    const img = container.querySelector("img")
    expect(img?.getAttribute("loading")).toBe("lazy")
    expect(img?.getAttribute("decoding")).toBe("async")
  })

  it("renders a drag handle icon instead of copy action", () => {
    render(
      <ArchiveListCard
        id="1"
        title="商品"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="店铺"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
      />
    )

    expect(screen.getAllByLabelText("Drag handle").length).toBeGreaterThan(0)
  })

  it("marks drag handle as draggable", () => {
    const onDragStart = vi.fn()

    render(
      <ArchiveListCard
        id="1"
        title="商品"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="店铺"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={onDragStart}
        onDrop={vi.fn()}
      />
    )

    const handle = screen.getAllByLabelText("Drag handle")[0]
    expect(handle.getAttribute("draggable")).toBe("true")
  })

  it("uses the card as drag image when dragging the handle", () => {
    const setDragImage = vi.fn()
    const setData = vi.fn()

    render(
      <ArchiveListCard
        id="1"
        title="???"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="???"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
      />
    )

    const handle = screen.getAllByLabelText("Drag handle")[0]
    fireEvent.dragStart(handle, {
      dataTransfer: { setDragImage, setData },
    })

    expect(setDragImage).toHaveBeenCalled()
  })

  it("calls onCoverClick when cover is clicked", () => {
    const onCoverClick = vi.fn()

    const { container } = render(
      <ArchiveListCard
        id="1"
        title="商品"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="店铺"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
        onCoverClick={onCoverClick}
      />
    )

    const cover = container.querySelector('[data-testid="archive-card-cover"]')
    if (!cover) throw new Error("cover not found")
    fireEvent.click(cover)
    expect(onCoverClick).toHaveBeenCalled()
  })

  it("calls onCardClick when card body is clicked", () => {
    const onCardClick = vi.fn()

    const { container } = render(
      <ArchiveListCard
        id="1"
        title="商品"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="店铺"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
        onCardClick={onCardClick}
      />
    )

    const body = container.querySelector('[data-testid="archive-card-body"]')
    if (!body) throw new Error("card body not found")
    fireEvent.click(body)
    expect(onCardClick).toHaveBeenCalled()
  })

  it("calls onJdClick and applies hover style when JD block is clicked", () => {
    const onJdClick = vi.fn()

    render(
      <ArchiveListCard
        id="1"
        title="item"
        price="100"
        commission="10"
        commissionRate="10%"
        jdPrice="100"
        jdCommission="10"
        jdCommissionRate="10%"
        jdSales="50"
        jdLink="https://item.jd.com/100.html"
        sales30="50"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="shop"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
        onJdClick={onJdClick}
      />
    )

    const jdBlock = screen.getByTestId("archive-metrics-jd")
    expect(jdBlock.className).toContain("cursor-pointer")
    expect(jdBlock.className).toContain("hover:bg-slate-50")

    fireEvent.click(jdBlock)
    expect(onJdClick).toHaveBeenCalledWith("https://item.jd.com/100.html")
  })

  it("calls onTbClick and applies hover style when TB block is clicked", () => {
    const onTbClick = vi.fn()

    render(
      <ArchiveListCard
        id="1"
        title="item"
        price="100"
        commission="10"
        commissionRate="10%"
        tbPrice="200"
        tbCommission="40"
        tbCommissionRate="20%"
        tbSales="30"
        tbLink="https://detail.tmall.com/item.htm?id=200"
        sales30="50"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="shop"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
        onTbClick={onTbClick}
      />
    )

    const tbBlock = screen.getByTestId("archive-metrics-tb")
    expect(tbBlock.className).toContain("cursor-pointer")
    expect(tbBlock.className).toContain("hover:bg-slate-50")

    fireEvent.click(tbBlock)
    expect(onTbClick).toHaveBeenCalledWith("https://detail.tmall.com/item.htm?id=200")
  })

  it("does not jump when clicking non JD/TB areas", () => {
    const onJdClick = vi.fn()
    const onTbClick = vi.fn()

    render(
      <ArchiveListCard
        id="1"
        title="item"
        price="100"
        commission="10"
        commissionRate="10%"
        jdPrice="100"
        jdCommission="10"
        jdCommissionRate="10%"
        jdSales="50"
        tbPrice="200"
        tbCommission="40"
        tbCommissionRate="20%"
        tbSales="30"
        jdLink="https://item.jd.com/100.html"
        tbLink="https://detail.tmall.com/item.htm?id=200"
        sales30="50"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="shop"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
        onJdClick={onJdClick}
        onTbClick={onTbClick}
      />
    )

    fireEvent.click(screen.getByTestId("archive-meta-row"))
    expect(onJdClick).not.toHaveBeenCalled()
    expect(onTbClick).not.toHaveBeenCalled()
  })

  it("shows pointer cursor on clickable card and cover", () => {
    const { container } = render(
      <ArchiveListCard
        id="1"
        title="鍟嗗搧"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="搴楅摵"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
        onCoverClick={vi.fn()}
        onCardClick={vi.fn()}
      />
    )

    const cover = container.querySelector('[data-testid="archive-card-cover"]')
    if (!cover) throw new Error("cover not found")
    expect(cover.className).toContain("cursor-pointer")

    const body = container.querySelector('[data-testid="archive-card-body"]')
    if (!body) throw new Error("card body not found")
    expect(body.className).toContain("card-interactive")
  })

  it("renders JD and TB metric rows", () => {
    render(
      <ArchiveListCard
        id="1"
        title="鍟嗗搧"
        price="100"
        commission="10"
        commissionRate="10%"
        jdPrice="100"
        jdCommission="10"
        jdCommissionRate="10%"
        jdSales="50"
        tbPrice="200"
        tbCommission="40"
        tbCommissionRate="20%"
        tbSales="30"
        sales30="50"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="搴楅摵"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
      />
    )

    expect(screen.getAllByTestId("archive-metrics-jd").length).toBeGreaterThan(0)
    expect(screen.getAllByTestId("archive-metrics-tb").length).toBeGreaterThan(0)
    const jdBadge = screen.getByTestId("archive-metrics-badge-jd")
    const tbBadge = screen.getByTestId("archive-metrics-badge-tb")
    expect(jdBadge.className).toContain("h-[40px]")
    expect(jdBadge.className).toContain("w-[60px]")
    expect(jdBadge.className).toContain("justify-center")
    expect(jdBadge.className).toContain("flex-none")
    expect(jdBadge.className).toContain("min-w-[60px]")
    expect(jdBadge.className).toContain("min-h-[40px]")
    expect(jdBadge.className).toContain("self-start")
    expect(tbBadge.className).toContain("h-[40px]")
    expect(tbBadge.className).toContain("w-[60px]")
    expect(tbBadge.className).toContain("justify-center")
    expect(tbBadge.className).toContain("flex-none")
    expect(tbBadge.className).toContain("min-w-[60px]")
    expect(tbBadge.className).toContain("min-h-[40px]")
    expect(tbBadge.className).toContain("self-start")
  })

  it("keeps metrics on a single row", () => {
    render(
      <ArchiveListCard
        id="1"
        title="商品"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="店铺"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
      />
    )

    const metricsRow = screen.getByTestId("archive-metrics-row")
    expect(metricsRow.className).toContain("flex-nowrap")
    expect(metricsRow.className).toContain("text-[16px]")
  })

  it("expands JD/TB metric blocks", () => {
    render(
      <ArchiveListCard
        id="1"
        title="鍟嗗搧"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="搴楅摵"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
      />
    )

    const jdBlock = screen.getByTestId("archive-metrics-jd")
    const tbBlock = screen.getByTestId("archive-metrics-tb")
    expect(jdBlock.className).toContain("min-w-[350px]")
    expect(tbBlock.className).toContain("min-w-[350px]")
    expect(jdBlock.className).toContain("px-7")
    expect(tbBlock.className).toContain("px-7")
    expect(jdBlock.className).toContain("items-start")
    expect(tbBlock.className).toContain("items-start")
    const metricLists = screen.getAllByTestId("archive-metrics-list")
    expect(metricLists.length).toBeGreaterThan(0)
    metricLists.forEach((list) => {
      expect(list.className).toContain("gap-10")
      expect(list.className).toContain("overflow-visible")
    })
  })

  it("stacks metric labels and values vertically", () => {
    render(
      <ArchiveListCard
        id="1"
        title="鍟嗗搧"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="搴楅摵"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
      />
    )

    const metricItems = screen.getAllByTestId("archive-metric-item")
    expect(metricItems.length).toBeGreaterThan(0)
    metricItems.forEach((item) => {
      expect(item.className).toContain("flex-col")
    })
    const metricLabels = screen.getAllByTestId("archive-metric-label")
    expect(metricLabels.length).toBeGreaterThan(0)
    metricLabels.forEach((label) => {
      expect(label.className).toContain("tracking-wider")
    })
  })

  it("removes shop label and shows only id/source row", () => {
    render(
      <ArchiveListCard
        id="1"
        title="商品"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="店铺"
        uid="SB051"
        source="https://item.jd.com/100.html"
        blueLink="https://item.jd.com/100.html"
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
      />
    )

    expect(screen.queryByText(/店铺/)).toBeNull()
    const metaRow = screen.getByTestId("archive-meta-row")
    expect(metaRow.textContent).toContain("商品ID")
    expect(metaRow.textContent).toContain("来源")
  })
})
