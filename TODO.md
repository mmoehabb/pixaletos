# TODO

## Phase 1 — Editor Foundation

- [x] Set up React + Vite project structure
- [x] Configure Tailwind CSS
- [x] Initialize PixiJS canvas/rendering engine wrapper
- [x] Implement core pixel tools (Pencil, Eraser, Line, Rectangle, Ellipse, Fill, Color Picker, Select, Move, etc.)
- [x] Implement layer management (add, remove, visibility, opacity, order)
- [x] Implement undo/redo history (non-destructive)
- [x] Add basic keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, tool bindings)
- [x] Build basic Workspace UI (toolbar, canvas, layers/assets, properties, status bar)

## Phase 2 — File Workflow

- [x] Implement Project format (JSON state preserving canvas, layers, metadata)
- [x] Implement Project save and load functionality
- [x] Implement PNG export (nearest-neighbor scaling, transparent background)
- [x] Implement basic image import (parse PNG to canvas)
- [x] Build Menu bar (File, Edit, Image, Layer, View, AI)
- [x] Implement canvas resize and image transform (crop, rotate, flip, scale)

## Phase 3 — Spritesheet Tooling

- [x] Create spritesheet input interface (drag/drop multiple assets)
- [x] Implement layout configuration (row layout, gap, padding, cell size)
- [x] Build live preview of spritesheet output
- [x] Implement spritesheet PNG export
- [x] Implement spritesheet JSON metadata export

## Phase 4 — AI Foundation

- [ ] Define AI Provider abstraction interfaces (`generate`, `edit`, `analyze`)
- [ ] Implement OpenAI / ChatGPT provider mock/stub
- [ ] Create UI for configuring API credentials and provider selection
- [ ] Build "Ask AI" context panel / UI framework
- [ ] Implement AI request history tracking UI

## Phase 5 — AI Orchestration

- [x] Implement editor-context serialization (dimensions, layers, palette, selected region)
- [x] Wire AI requests to parse context and decide operation type
- [x] Build AI to Asset pipeline (generation -> pixel normalization -> editor asset)
- [x] Implement region-aware AI editing workflows
- [x] Build diff/preview UI for AI modifications (Accept / Reject)
- [x] Integrate accepted AI operations into standard undo/redo history

## Phase 6 — Polish

- [x] Perform UI/UX responsive polish and accessibility passes
- [ ] Implement comprehensive export/import testing
- [ ] Implement autosave and crash recovery
- [ ] Provide customizable keyboard shortcuts
- [ ] Optimize rendering and application performance
- [ ] Handle offline behaviors and error states smoothly
- [x] Fix Undo/Redo state desync when undoing a global transform after switching keyframes
