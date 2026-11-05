import { useEffect, useState } from "react";
import { useAppStore, type AppState } from "../../store";

type RecoveryData = Pick<
  AppState,
  | "metadata"
  | "dimensions"
  | "layers"
  | "keyframes"
  | "activeLayerId"
  | "activeKeyframeId"
  | "fps"
>;
const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("pixaletos-recovery", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export function Recovery() {
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<RecoveryData | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    database()
      .then((db) => {
        const request = db
          .transaction("drafts")
          .objectStore("drafts")
          .get("current");
        request.onsuccess = () => {
          if (cancelled) return;
          if (request.result) setDraft(request.result as RecoveryData);
          else setReady(true);
        };
        request.onerror = () => {
          if (!cancelled) setReady(true);
        };
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("Recovery unavailable");
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout>;
    let previous = useAppStore.getState();
    const unsubscribe = useAppStore.subscribe((state) => {
      if (
        state.layers === previous.layers &&
        state.keyframes === previous.keyframes &&
        state.dimensions === previous.dimensions &&
        state.metadata === previous.metadata &&
        state.fps === previous.fps
      ) {
        previous = state;
        return;
      }
      previous = state;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const current = useAppStore.getState();
        if (!current.layers.length || !current.keyframes.length) return;
        const snapshot: RecoveryData = {
          metadata: current.metadata,
          dimensions: current.dimensions,
          layers: current.layers,
          keyframes: current.keyframes.map((frame) =>
            frame.id === current.activeKeyframeId
              ? { ...frame, layers: current.layers }
              : frame,
          ),
          activeLayerId: current.activeLayerId,
          activeKeyframeId: current.activeKeyframeId,
          fps: current.fps,
        };
        database()
          .then((db) => {
            const tx = db.transaction("drafts", "readwrite");
            tx.objectStore("drafts").put(snapshot, "current");
            tx.oncomplete = () => {
              setStatus("Recovery saved");
              db.close();
            };
            tx.onerror = () => {
              setStatus("Recovery unavailable");
              db.close();
            };
          })
          .catch(() => setStatus("Recovery unavailable"));
      }, 1200);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [ready]);

  return (
    <>
      <span className="hidden sm:inline text-neutral-500" aria-live="polite">
        {status}
      </span>
      {draft && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="recovery-title"
          className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"
        >
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#191c23] p-5 shadow-xl">
            <h2
              id="recovery-title"
              className="text-lg font-semibold text-white"
            >
              Recover your last session?
            </h2>
            <p className="mt-2 text-sm text-neutral-300">
              A local recovery copy of “{draft.metadata.name}” is available.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded px-3 py-2 text-sm hover:bg-white/10"
                onClick={() => {
                  database()
                    .then((db) => {
                      const tx = db.transaction("drafts", "readwrite");
                      tx.objectStore("drafts").delete("current");
                      tx.oncomplete = () => db.close();
                    })
                    .catch(() => {});
                  setDraft(null);
                  setReady(true);
                }}
              >
                Discard
              </button>
              <button
                className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500"
                onClick={() => {
                  useAppStore.setState({
                    ...draft,
                    past: [],
                    future: [],
                    selection: null,
                    isPlaying: false,
                  });
                  setDraft(null);
                  setReady(true);
                  setStatus("Recovered");
                }}
              >
                Recover
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
