// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import BlueLinkMapDialogs from "./BlueLinkMapDialogs"

const noop = () => {}

describe("BlueLinkMapDialogs", () => {
  beforeAll(() => {
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserver
  })

  it("enters edit mode for account rows", async () => {
    const user = userEvent.setup()
    render(
      <BlueLinkMapDialogs
        editOpen={false}
        editLink=""
        editRemark=""
        onEditLinkChange={noop}
        onEditRemarkChange={noop}
        onEditOpenChange={noop}
        onEditSubmit={noop}
        importOpen={false}
        importText=""
        importing={false}
        onImportTextChange={noop}
        onImportOpenChange={noop}
        onImportSubmit={noop}
        accountModalOpen
        accountNameInput=""
        accounts={[{ id: "a1", name: "账号1" }]}
        onAccountNameChange={noop}
        onAccountSubmit={noop}
        onAccountOpenChange={noop}
        onAccountNameBlur={noop}
        onAccountDelete={noop}
        onAccountReorder={noop}
        categoryModalOpen={false}
        categoryNameInput=""
        categoryError=""
        categories={[]}
        activeAccountId={null}
        onCategoryNameChange={noop}
        onCategorySubmit={noop}
        onCategoryOpenChange={noop}
        onCategoryNameBlur={noop}
        onCategoryAddFromOther={noop}
        onCategoryDelete={noop}
        onCategoryReorder={noop}
        pickerOpen={false}
        pickerCategoryId=""
        pickerItems={[]}
        pickerHasMore={false}
        pickerLoading={false}
        onPickerCategoryChange={noop}
        onPickerOpenChange={noop}
        onPickerPick={noop}
        onPickerLoadMore={noop}
        progressOpen={false}
        progressLabel=""
        progressTotal={0}
        progressProcessed={0}
        progressSuccess={0}
        progressFailures={[]}
        progressCancelled={false}
        progressRunning={false}
        onProgressOpenChange={noop}
        onProgressCancel={noop}
        onProgressClose={noop}
        confirmOpen={false}
        confirmTitle=""
        confirmDescription=""
        confirmActionLabel=""
        onConfirmOpenChange={noop}
        onConfirmAction={noop}
      />
    )

    const dialog = screen.getAllByRole("dialog").slice(-1)[0]
    const scope = within(dialog)
    await user.click(scope.getByLabelText("Edit account"))
    expect(scope.getByLabelText("Confirm edit")).toBeTruthy()
    expect(scope.getByLabelText("Cancel edit")).toBeTruthy()
  })
})
