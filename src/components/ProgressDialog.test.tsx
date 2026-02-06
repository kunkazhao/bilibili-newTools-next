// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import ProgressDialog from "./ProgressDialog"

describe("ProgressDialog", () => {
  it("renders title, percent, summary and failure list", () => {
    render(
      <ProgressDialog
        open
        title="Sync Progress"
        status="running"
        total={10}
        processed={5}
        failures={[{ name: "Item A", reason: "match failed" }]}
        showSummary
        showFailures
        allowCancel
      />
    )

    expect(screen.getByText("Sync Progress")).not.toBeNull()
    expect(screen.getByText("50%")).not.toBeNull()
    expect(screen.getByText(/共 10 条/i)).not.toBeNull()
    expect(screen.getAllByText(/失败 1 条/i).length).toBeGreaterThan(0)
    expect(screen.getByText("Item A")).not.toBeNull()
    expect(screen.getByText("match failed")).not.toBeNull()
  })

  it("shows success copy when done without failures", () => {
    render(
      <ProgressDialog
        open
        title="Sync Progress"
        status="done"
        total={3}
        processed={3}
        failures={[]}
        showSummary
      />
    )

    expect(screen.getByText("已全部同步成功")).not.toBeNull()
    expect(screen.getByText("成功 3 条")).not.toBeNull()
    expect(screen.getByText("失败 0 条")).not.toBeNull()
  })
})
