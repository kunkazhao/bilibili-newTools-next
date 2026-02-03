// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import ArchiveListCard from "./ArchiveListCard"

describe("ArchiveListCard", () => {
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
  })
})
