# Notes App — Architecture Reference

Single-file app: `index.html` (~3400 lines). HTML + CSS + JS, no build step. Deployed on GitHub Pages.

## Code Layout (line ranges approximate — verify with grep)

| Section | Lines | What |
|---------|-------|------|
| CSS variables (light/dark) | 10-30 | `--bg`, `--surface`, `--border`, `--text`, `--muted`, `--accent` |
| Header CSS | 42-150 | Top bar, task display widget, buttons |
| Sidebar CSS | 157-333 | Notebook list, TODO card, progress bars |
| Notes grid CSS | 334-430 | Card layout, dragging, recording states |
| Note header CSS | 471-543 | Title input, task count badge, AI title suggestions |
| Checklist CSS | 646-789 | `.checklist-item`, `.checklist-sub`, priority colors, `::before` indicators |
| Priority menu CSS | 749-785 | Right-click priority context menu |
| Format toolbar CSS | 798-823 | Floating bold/italic/underline/bullet bar |
| Modals/menus CSS | 925-1041 | Context menus, dialogs, scrollbar, tags |
| **HTML** | 1046-1125 | Header, workspace, sidebar, notes grids, modals, toolbar |
| **JavaScript** | 1130+ | All logic below HTML |

## Data Model

```
state = {
  notebooks: [{ id, name, color, symbol, active?, activatedAt? }],
  notes: { [notebookId]: [{ id, title, text (HTML), tags[] }] },
  activeNotebook: string,
  secondaryNotebook: string|null
}
```
- localStorage key: `notes_app_v2`
- Undo stack: `undoStack[]` / `redoStack[]`, max 200 snapshots (full state JSON)

## Key Functions

### State
- `loadState()` — Load from localStorage
- `saveState()` — Sync DOM to state, write localStorage
- `snapshotForUndo()` — Push full state to undo stack (call BEFORE mutations)
- `structuralUndo()` / `structuralRedo()` — Restore from stack
- `debounceSave()` — 600ms debounced save

### Rendering
- `render()` — Master: calls renderSidebar + renderNotes + updateTaskDisplay
- `renderSidebar()` — Notebook list with TODO card pinned at top
- `renderPanel(container, nbId, isPrimary)` — Render notes grid for a notebook
- `renderNotes()` — Render both primary + secondary panels
- `updateTaskDisplay()` — Header task widget (unchecked tasks from TO DO notebook, max 2, priority-sorted)
- `updateTaskCount()` — Badge on note card showing unchecked count

### Checklist
- `renumberSubs(parentItem)` — Re-number sub-points (1., 2., 3.)
- `findParentItem(sub)` — Find `.checklist-item` parent of a `.checklist-sub`
- `normalizeChecklist(html)` — Normalize AI-generated checklist HTML

### UI Helpers
- `autoSizeTitle()` — Width title input to content using `ch` units
- `isTodoNotebook(nb)` — Check if notebook name matches "todo" (case-insensitive)
- `getTodoProgress(nbId)` — Return { checked, total } counts
- `makeNote()` — Create new note object with random ID
- `uid()` — Random 7-char string

### AI / Worker
- Worker URL: `https://notes-polish.dcop14c.workers.dev`
- Modes: `title-suggest`, `checklist`, `note-edit`, `smart`, default polish
- AI title suggestions — fetched via ✨ button on note header
- Smart Record — global voice command with action routing (create/edit/check)
- Per-note mic — speech-to-text for individual notes

## HTML Patterns

### Checklist item
```html
<div class="checklist-item" data-priority="0|2|3">
  <input type="checkbox"><span>Task text</span>
</div>
```

### Checked item
```html
<div class="checklist-item checked" data-priority="0" data-checked-at="1712345678000">
  <input type="checkbox" checked><span>Task text</span>
</div>
```

### Sub-points (numbered bullets under a task)
```html
<div class="checklist-sub"><span class="sub-num">1.</span><span>Detail</span></div>
```

### Priority levels
- `0` or missing = Low (grey `#888`)
- `2` = Medium (orange `#e8a030`)
- `3` = High (red `#e05c4a`)
- Visual: `::before` pseudo-element, fixed height matching checkbox

## Important Patterns

1. **Undo before mutations**: Always call `snapshotForUndo()` before any structural change
2. **Null-check state data**: `note.text`, `note.title` can be undefined — guard before `.includes()`, `.trim()`, etc.
3. **Content saved as innerHTML**: `.note-textarea` is contenteditable; `note.text = ta.innerHTML`
4. **Checked items auto-move to bottom** after 300ms delay
5. **Auto-delete checked items** after 4 hours (`data-checked-at` timestamp)
6. **Dark mode**: `.dark` class on `<html>`, stored in `notes_dark_mode` localStorage key
7. **Copy button**: Fixed-position `position: fixed` outside contenteditable to avoid HTML contamination in saved content
8. **Preview before push**: Always test in `npx http-server . -c-1` on port 8080

## Keyboard Shortcuts
- `Ctrl+Z` / `Ctrl+Y` — Undo / Redo
- `Ctrl+G` — Bold, `Ctrl+I` — Italic, `Ctrl+U` — Underline
- `Ctrl+B` — Bullet list (with selection)
- `Alt+R` — Smart record
- `Enter` in checklist — New item (or new sub-point if in sub)
- `Tab` on empty checklist item — Convert to numbered sub-point
- `Backspace` on empty item/sub — Remove and move cursor up
