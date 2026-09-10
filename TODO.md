# TODO

## Phase 1 — Editor Foundation

- [ ] Set up React + Vite project structure
- [ ] Configure Tailwind CSS
- [ ] Initialize PixiJS canvas/rendering engine wrapper
- [ ] Implement core pixel tools (Pencil, Eraser, Line, Rectangle, Ellipse, Fill, Color Picker, Select, Move, etc.)
- [ ] Implement layer management (add, remove, visibility, opacity, order)
- [ ] Implement undo/redo history (non-destructive)
- [ ] Add basic keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, tool bindings)
- [ ] Build basic Workspace UI (toolbar, canvas, layers/assets, properties, status bar)

## Phase 2 — File Workflow

- [ ] Implement Project format (JSON state preserving canvas, layers, metadata)
- [ ] Implement Project save and load functionality
- [ ] Implement PNG export (nearest-neighbor scaling, transparent background)
- [ ] Implement basic image import (parse PNG to canvas)
- [ ] Build Menu bar (File, Edit, Image, Layer, View, AI)
- [ ] Implement canvas resize and image transform (crop, rotate, flip, scale)

## Phase 3 — Spritesheet Tooling

- [ ] Create spritesheet input interface (drag/drop multiple assets)
- [ ] Implement layout configuration (row layout, gap, padding, cell size)
- [ ] Build live preview of spritesheet output
- [ ] Implement spritesheet PNG export
- [ ] Implement spritesheet JSON metadata export

## Phase 4 — AI Foundation

- [ ] Define AI Provider abstraction interfaces (`generate`, `edit`, `analyze`)
- [ ] Implement OpenAI / ChatGPT provider mock/stub
- [ ] Create UI for configuring API credentials and provider selection
- [ ] Build "Ask AI" context panel / UI framework
- [ ] Implement AI request history tracking UI

## Phase 5 — AI Orchestration

- [ ] Implement editor-context serialization (dimensions, layers, palette, selected region)
- [ ] Wire AI requests to parse context and decide operation type
- [ ] Build AI to Asset pipeline (generation -> pixel normalization -> editor asset)
- [ ] Implement region-aware AI editing workflows
- [ ] Build diff/preview UI for AI modifications (Accept / Reject)
- [ ] Integrate accepted AI operations into standard undo/redo history

## Phase 6 — Polish

- [ ] Perform UI/UX responsive polish and accessibility passes
- [ ] Implement comprehensive export/import testing
- [ ] Implement autosave and crash recovery
- [ ] Provide customizable keyboard shortcuts
- [ ] Optimize rendering and application performance
- [ ] Handle offline behaviors and error states smoothly
