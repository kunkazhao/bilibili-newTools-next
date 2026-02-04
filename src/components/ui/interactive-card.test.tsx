// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { InteractiveCard } from "./interactive-card"

describe("InteractiveCard", () => {
  afterEach(() => {
    cleanup()
  })

  it("adds card-interactive class when interactive", () => {
    render(
      <InteractiveCard interactive data-testid="card">
        content
      </InteractiveCard>
    )
    expect(screen.getByTestId("card").className).toContain("card-interactive")
  })

  it("does not add card-interactive class when not interactive", () => {
    render(<InteractiveCard data-testid="card">content</InteractiveCard>)
    expect(screen.getByTestId("card").className).not.toContain("card-interactive")
  })

  it("supports asChild and applies class to child element", () => {
    render(
      <InteractiveCard asChild interactive>
        <article data-testid="card">content</article>
      </InteractiveCard>
    )
    expect(screen.getByTestId("card").className).toContain("card-interactive")
  })
})
