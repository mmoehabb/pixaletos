import React from "react";
import { useAppStore } from "../../store";

export const PixelCanvas: React.FC = () => {
  const { dimensions } = useAppStore();

  return (
    <div className="flex items-center justify-center w-full h-full bg-neutral-900 rounded-md overflow-hidden p-4">
      <div
        className="bg-white shadow-lg"
        style={{
          width: dimensions.width * 10, // Just a placeholder scale for now
          height: dimensions.height * 10,
          backgroundSize: "20px 20px",
          backgroundImage:
            "conic-gradient(var(--tw-colors-neutral-300) 90deg, var(--tw-colors-neutral-100) 90deg 180deg, var(--tw-colors-neutral-300) 180deg 270deg, var(--tw-colors-neutral-100) 270deg)",
        }}
      >
        {/* PixiJS Canvas will be injected here */}
        <div className="flex items-center justify-center w-full h-full text-neutral-400 font-mono text-sm">
          [ Canvas {dimensions.width}x{dimensions.height} ]
        </div>
      </div>
    </div>
  );
};
