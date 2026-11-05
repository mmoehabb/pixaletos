import { useState, useEffect, useRef } from "react";
import {
  usePressureSettings,
  defaultPressure,
  penButton,
  actions,
  defaults,
  keyInput,
  useInputSettings,
  type InputAction,
} from "../../input/settings";
export function InputSettingsDialog() {
  const { open, setOpen, bindings, save } = useInputSettings();
  const { settings: pressure, save: savePressure } = usePressureSettings();
  const [recording, setRecording] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    return () => previous?.focus();
  }, [open]);
  const [sample, setSample] = useState(
    "Use your pen in this area to inspect its input.",
  );
  if (!open) return null;
  const record = (input: string) => {
    if (recording) {
      save({ ...bindings, [input]: bindings[input] || "none" });
      setRecording(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Tab") {
          const nodes = Array.from(
            dialog.current?.querySelectorAll<HTMLElement>(
              "button, select, input, [tabindex='0']",
            ) || [],
          );
          const index = nodes.indexOf(document.activeElement as HTMLElement);
          e.preventDefault();
          nodes[
            (index + (e.shiftKey ? -1 : 1) + nodes.length) % nodes.length
          ]?.focus();
          return;
        }
        if (recording) {
          e.preventDefault();
          if (!["Control", "Shift", "Alt", "Meta"].includes(e.key))
            record(keyInput(e.nativeEvent));
        } else if (e.key === "Escape") {
          setRecording(false);
          setOpen(false);
        }
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Tablet and input settings"
        className="w-full max-w-lg rounded-lg bg-neutral-900 p-6 text-white"
      >
        <h2 className="text-lg font-semibold">Tablet &amp; Input</h2>
        <p className="my-3 text-sm text-neutral-400">
          Pen tool mappings apply while held on the canvas. Tablet express keys
          may need a keyboard shortcut assigned in your tablet driver. Keyboard
          tool mappings select the tool.
        </p>
        <fieldset className="my-3">
          <legend>Pen pressure</legend>
          {(["size", "opacity"] as const).map((k) => (
            <label key={k} className="mr-4">
              <input
                type="checkbox"
                checked={pressure[k]}
                onChange={(e) =>
                  savePressure({ ...pressure, [k]: e.target.checked })
                }
              />{" "}
              {k}
            </label>
          ))}
          <label className="block">
            Minimum strength {Math.round(pressure.minimum * 100)}%
            <input
              aria-label="Minimum pressure strength"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={pressure.minimum}
              onChange={(e) =>
                savePressure({ ...pressure, minimum: Number(e.target.value) })
              }
            />
          </label>
          <label className="block">
            Sensitivity curve
            <input
              aria-label="Pressure curve"
              type="range"
              min="0.25"
              max="4"
              step="0.25"
              value={pressure.curve}
              onChange={(e) =>
                savePressure({ ...pressure, curve: Number(e.target.value) })
              }
            />
          </label>
        </fieldset>
        {Object.entries(bindings).map(([input, action]) => (
          <label key={input} className="my-2 flex justify-between gap-3">
            <span>{input}</span>
            <select
              className="bg-neutral-800"
              value={action}
              onChange={(e) =>
                save({ ...bindings, [input]: e.target.value as InputAction })
              }
            >
              {actions.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <button
              aria-label={`Remove ${input}`}
              onClick={() => {
                const next = { ...bindings };
                delete next[input];
                save(next);
              }}
            >
              Remove
            </button>
          </label>
        ))}
        <button
          autoFocus
          className="my-3 rounded bg-indigo-600 p-2"
          onClick={() => setRecording(!recording)}
        >
          {recording ? "Press a key or pen button below…" : "Record input"}
        </button>
        <div
          tabIndex={0}
          className="touch-none rounded border border-neutral-600 p-6"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.preventDefault();
            if (e.pointerType === "pen") record(`pen:${penButton(e.buttons)}`);
          }}
          onPointerMove={(e) => {
            setSample(
              `${e.pointerType}: buttons ${e.buttons}, pressure ${e.pressure.toFixed(2)}`,
            );
            if (e.pointerType === "pen" && e.buttons)
              record(`pen:${penButton(e.buttons)}`);
          }}
        >
          {sample}
        </div>
        <div className="mt-4 flex justify-between">
          <button
            onClick={() => {
              save({ ...defaults });
              savePressure({ ...defaultPressure });
            }}
          >
            Reset defaults
          </button>
          <button
            onClick={() => {
              setRecording(false);
              setOpen(false);
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
