![Pixalitos Banner](./public/banner.png)

# Pixalitos

**Pronounced:** _piksa-lee-tos_

Pixalitos is an AI-powered Pixel Art Editor built with React, TypeScript, Vite, Tailwind CSS, PixiJS, and Zustand.

The project features a full command-based undo/redo system and an AI layer acting as a first-class orchestration component to understand and modify the editor state.

## Getting Started Locally

This project uses `pnpm` for package management.

### Prerequisites

- Node.js (v24 or later recommended)
- `pnpm` installed

### Installation and Running

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the local development server:

   ```bash
   pnpm run dev
   ```

3. Build the project:

   ```bash
   pnpm run build
   ```

4. Run linting and formatting:
   ```bash
   pnpm run lint
   pnpm run format
   ```

## Tablet and input settings

Open **Edit → Tablet & Input** to record pen buttons or driver-generated keyboard
shortcuts, assign actions, and test pressure. Pen tool actions are temporary;
keyboard tool actions select the tool. Mappings and optional pressure controls
are saved locally in this browser. Remove a mapping to restore the default
keyboard shortcut, or use Reset defaults to reset tablet mappings and pressure.
Pressure size uses whole pixels; pressure opacity and size apply to pencil and
eraser only. Changing pen buttons finishes the current stroke before starting
the new action, so each segment has its own undo entry.

Browsers expose only some tablet controls. Configure express keys as keyboard
shortcuts in the tablet driver if they cannot be detected directly. Device
identity, tilt, and vendor driver configuration are not managed by this editor.

For browser regression checks, start `pnpm dev`, then run
`node tests/tablet.browser.mjs`. Set `CHROMIUM_PATH` to your Chromium executable
and `TABLET_TEST_URL` if the development server uses a different address.
Synthetic pen checks mock pointer capture; physical tablet testing is still
needed to confirm browser and driver compatibility.
