# AI-Powered Pixel Art Editor Plan

Here’s a concise implementation plan that treats the AI layer as a first-class orchestration component rather than just an image-generation button.

### 1. Core Editor
* Modern, minimal web UI: **canvas/workspace + toolbar + layers/assets + properties + menus**.
* Pixel-perfect canvas with configurable zoom, grid, checkerboard transparency, pan, and selection.
* Non-destructive undo/redo history.
* Layers, opacity, visibility, ordering, rename/duplicate/delete.
* Import/export PNG and common pixel-art formats where practical.

### 2. Basic Pixel-Art Toolset
Implement conventional tools with discoverable keyboard bindings:
* Pencil / pixel brush
* Eraser
* Line
* Rectangle / filled rectangle
* Ellipse
* Fill bucket
* Color picker
* Select / move
* Crop
* Flip / rotate
* Zoom / pan
* Text/basic annotation if useful

Support familiar shortcuts such as `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl/Cmd+C/V/X`, `Ctrl/Cmd+S`, `Ctrl/Cmd+O`, `Ctrl/Cmd+Shift+S`, `Delete`, `B`, `E`, `G`, `I`, etc., with a **shortcut reference/help menu**.

### 3. Menus & Export
Provide conventional menus:

**File**
* New
* Open/import
* Save project
* Export
* Export As
* Recent files
* Close

**Edit**
* Undo/redo
* Cut/copy/paste
* Select all
* Clear
* Transform

**Image**
* Canvas size
* Resize
* Crop
* Rotate
* Flip
* Pixel scaling

**Layer**
* New/duplicate/delete
* Merge
* Move up/down
* Properties

**View**
* Zoom
* Grid
* Pixel grid
* Checkerboard
* Fullscreen

**AI**
* Generate
* Edit current asset
* Analyze
* Upscale/refine
* AI history

**Export is especially important:** provide PNG export with explicit **nearest-neighbor scaling**, transparent-background handling, resolution/scale selection, and spritesheet export.

### 4. Spritesheet Generator
Create a dedicated lightweight workflow:

**Input**
* Drag/drop or select multiple assets.

**Configuration**
* Horizontal/row layout
* Gap
* Padding
* Background/transparency
* Cell size/alignment
* Optional normalization of asset dimensions
* Nearest-neighbor scaling

**Output**
* Live preview
* Calculated spritesheet dimensions
* PNG export
* Optional metadata JSON describing each sprite's position and dimensions.

Example:
```text
[ asset 1 ] gap [ asset 2 ] gap [ asset 3 ]
<------------- padding ------------->
```

### 5. AI Provider Architecture
Introduce a provider abstraction rather than coupling the editor to one AI service:

```text
AI Provider
├── OpenAI / ChatGPT
├── Local Ollama
├── Local/custom HTTP API
├── Other providers
└── User-defined provider
```

Users configure providers/API credentials and select a default model.

The editor should communicate with AI through a normalized interface such as:
```text
generate(prompt, context)
edit(asset, instruction, context)
analyze(asset, context)
```

### 6. AI Orchestration Layer
This is the key differentiator.
The AI should understand the **current editor state**, not merely receive a text prompt.
Provide structured context such as:
```text
Current asset
├── image
├── dimensions
├── palette
├── layers
├── selected region
├── neighboring sprites
└── project metadata
```
Then allow commands such as:
> "Turn this into a fire-element sword."
> "Make the outline darker and add three animation frames."
> "Convert this character into a 16×16 sprite."
> "Create a matching idle animation."

The orchestrator determines whether the request requires **generation, image editing, pixel manipulation, palette operations, resizing, spritesheet creation, etc.**

### 7. AI-Generated Assets
AI generation should produce editor-native assets rather than simply downloading an image.

Pipeline:
```text
Prompt
  ↓
AI Provider
  ↓
Generated Image
  ↓
Pixel-Art Processing
  ↓
Palette / resolution normalization
  ↓
Editor Asset
```
Allow users to inspect, accept, reject, regenerate, or continue editing the result.

### 8. AI Editing Workflow
Make AI editing feel like an editor tool:
```text
Select asset/region
       ↓
"Ask AI" panel
       ↓
Natural-language instruction
       ↓
AI proposes modification
       ↓
Preview / diff
       ↓
Accept / Reject
```
Maintain AI operations in the same undo/redo history as normal editing.

### 9. Project & Asset Model
Use a project format that preserves editor state rather than treating PNG as the source of truth:
```text
Project
├── canvas
├── layers
├── palettes
├── assets
├── spritesheets
├── metadata
└── history
```
PNG remains the primary interchange/export format.

### 10. UX Architecture
Keep the interface deliberately restrained:
```text
┌──────────────────────────────────────────────┐
│ File Edit Image Layer View AI                │
├────┬───────────────────────────────┬─────────┤
│    │                               │ Layers  │
│ T  │                               │ Assets  │
│ o  │          PIXEL CANVAS         │ AI      │
│ o  │                               │         │
│ l  │                               │         │
│ s  │                               │         │
├────┴───────────────────────────────┴─────────┤
│ Color / Palette        Zoom 100%   Status    │
└──────────────────────────────────────────────┘
```
AI should appear as a **contextual panel**, not dominate the normal pixel-editing experience.

### 11. Suggested Implementation Phases
**Phase 1 — Editor foundation**
* Canvas/rendering engine
* Pixel tools
* Layers
* Selection
* Undo/redo
* Keyboard shortcuts

**Phase 2 — File workflow**
* Import
* Project format
* PNG export
* Resize/transform
* Menus

**Phase 3 — Spritesheet tooling**
* Multi-asset input
* Layout configuration
* Preview
* Export + metadata

**Phase 4 — AI foundation**
* Provider abstraction
* Local/custom API support
* OpenAI/ChatGPT provider
* Credential management
* AI request/history UI

**Phase 5 — AI orchestration**
* Editor-context serialization
* Generate/edit/analyze operations
* Region-aware editing
* AI → asset pipeline
* Preview/diff + accept/reject
* AI operations integrated with undo/redo

**Phase 6 — Polish**
* Performance optimization
* Autosave/recovery
* Accessibility
* Shortcut customization
* Responsive UI
* Error handling/offline behavior
* Comprehensive export/import testing

**Core principle:** build a genuinely good pixel-art editor first, then make AI an **orchestration layer capable of operating the editor**, rather than building an AI image generator with a pixel-art canvas attached.
