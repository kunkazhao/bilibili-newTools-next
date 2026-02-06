# Replace Cover Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a ¡°Ìæ»»·âÃæ¡± workflow in the Ñ¡Æ·¿âÒ³Ãæ toolbar that batch-uploads cover images by UID from local filenames, showing progress and failures.

**Architecture:** Introduce a small dialog for file selection, parse UID from filename (prefix before first ¡°-¡±), detect conflicts, then upload all non-conflicting files concurrently to `/api/sourcing/batch-cover`. Reuse ProgressDialog for status and refresh list on completion.

**Tech Stack:** React + TypeScript + existing archive components + REST API.

---

### Task 1: Add dialog component tests

**Files:**
- Create: `src/components/archive/__tests__/ReplaceCoverDialog.test.tsx`
- Create: `src/components/archive/ReplaceCoverDialog.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ReplaceCoverDialog from '../ReplaceCoverDialog';

const fileA = new File(['a'], 'SB001-test.jpg', { type: 'image/jpeg' });

test('submits selected files', () => {
  const onSubmit = vi.fn();
  render(
    <ReplaceCoverDialog
      open
      onOpenChange={() => null}
      onSubmit={onSubmit}
    />
  );

  const input = screen.getByLabelText('Ñ¡ÔñÍ¼Æ¬');
  fireEvent.change(input, { target: { files: [fileA] } });
  fireEvent.click(screen.getByText('¿ªÊ¼Ìæ»»'));

  expect(onSubmit).toHaveBeenCalledWith([fileA]);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/archive/__tests__/ReplaceCoverDialog.test.tsx`
Expected: FAIL (component not found)

**Step 3: Write minimal implementation**

```tsx
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useState } from 'react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (files: File[]) => void;
};

export default function ReplaceCoverDialog({ open, onOpenChange, onSubmit }: Props) {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ìæ»»·âÃæ</DialogTitle>
        </DialogHeader>
        <label className="text-sm" htmlFor="replace-cover-input">Ñ¡ÔñÍ¼Æ¬</label>
        <input
          id="replace-cover-input"
          aria-label="Ñ¡ÔñÍ¼Æ¬"
          type="file"
          multiple
          accept="image/*"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>È¡Ïû</Button>
          <Button onClick={() => onSubmit(files)} disabled={files.length === 0}>¿ªÊ¼Ìæ»»</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test src/components/archive/__tests__/ReplaceCoverDialog.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/__tests__/ReplaceCoverDialog.test.tsx src/components/archive/ReplaceCoverDialog.tsx
git commit -m "test: add replace cover dialog"
```

---

### Task 2: Add upload API and parse logic tests

**Files:**
- Modify: `src/components/archive/archiveApi.ts`
- Modify: `src/components/archive/ArchivePageContent.tsx`
- Test: `src/components/archive/__tests__/ArchivePageContent.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ArchivePageContent from '../ArchivePageContent';
import * as archiveApi from '../archiveApi';

vi.mock('../archiveApi');

const fileA = new File(['a'], 'SB001-test.jpg', { type: 'image/jpeg' });
const fileB = new File(['b'], 'SB001-dup.jpg', { type: 'image/jpeg' });
const fileC = new File(['c'], 'SB002-test.jpg', { type: 'image/jpeg' });

(archiveApi.uploadCoverByUid as any).mockResolvedValue({ success: true });

test('skips duplicate UID and uploads unique files', async () => {
  render(<ArchivePageContent />);

  fireEvent.click(screen.getByText('Ìæ»»·âÃæ'));
  const input = await screen.findByLabelText('Ñ¡ÔñÍ¼Æ¬');
  fireEvent.change(input, { target: { files: [fileA, fileB, fileC] } });
  fireEvent.click(screen.getByText('¿ªÊ¼Ìæ»»'));

  expect(archiveApi.uploadCoverByUid).toHaveBeenCalledTimes(2);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/archive/__tests__/ArchivePageContent.test.tsx`
Expected: FAIL (no button/logic)

**Step 3: Write minimal implementation**

- Add `uploadCoverByUid(uid, file)` in `archiveApi.ts` using `fetch` + `FormData` to `POST /api/sourcing/batch-cover`.
- In `ArchivePageContent.tsx`, add dialog open state, handle submit:
  - Parse UID by `file.name.split('-')[0].trim()`.
  - Detect duplicates and add to failures list (reason: `UID ³åÍ»`).
  - Upload all unique files using `Promise.all`.
  - Update `ProgressDialog` state as each promise resolves.

**Step 4: Run test to verify it passes**

Run: `npm test src/components/archive/__tests__/ArchivePageContent.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/archiveApi.ts src/components/archive/ArchivePageContent.tsx src/components/archive/__tests__/ArchivePageContent.test.tsx
git commit -m "feat: add replace cover upload logic"
```

---

### Task 3: Toolbar button hookup

**Files:**
- Modify: `src/components/archive/ArchivePageView.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import ArchivePageView from '../ArchivePageView';

test('shows replace cover button', () => {
  render(<ArchivePageView />);
  expect(screen.getByText('Ìæ»»·âÃæ')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/archive/__tests__/ArchivePageView.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

Add a toolbar Button labeled ¡°Ìæ»»·âÃæ¡± that toggles dialog open state via props from `ArchivePageContent`.

**Step 4: Run test to verify it passes**

Run: `npm test src/components/archive/__tests__/ArchivePageView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ArchivePageView.tsx src/components/archive/__tests__/ArchivePageView.test.tsx
git commit -m "feat: add replace cover toolbar button"
```

---

### Task 4: Verify + cleanup

**Files:**
- Modify: `src/components/ProgressDialog.tsx` (only if needed)

**Step 1: Run full relevant tests**

Run: `npm test src/components/archive/__tests__/ReplaceCoverDialog.test.tsx src/components/archive/__tests__/ArchivePageContent.test.tsx src/components/archive/__tests__/ArchivePageView.test.tsx`
Expected: PASS

**Step 2: Optional refactor**

If any duplicate parsing logic exists, extract to a small helper function in `ArchivePageContent.tsx`.

**Step 3: Commit (if refactor done)**

```bash
git add src/components/archive/ArchivePageContent.tsx

git commit -m "refactor: tidy replace cover flow"
```
