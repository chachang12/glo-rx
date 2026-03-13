import React from 'react'
import { clsx } from "clsx"

interface DropZoneProps {
    dragging: boolean;
    setDragging: React.Dispatch<React.SetStateAction<boolean>>;
    handleDrop: (e: React.DragEvent) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    processFile: (file: File) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ dragging, setDragging, handleDrop, inputRef, processFile }) => {
  return (
    <div>
        <div
          className={clsx(
            "border-2 border-dashed border-[#2a2a3a] rounded-xl px-6 py-9 cursor-pointer transition-[border-color,background] duration-200 mb-4",
            dragging && "border-[#4f8ef7] bg-[#4f8ef708]"
        )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />
          <div className="text-[28px] mb-2.5 text-[#4f8ef7]">⬆</div>
          <p className="text-[#ccc] text-[15px] mb-1">Drop your <code className="font-mono bg-[#1e1e2e] px-1.5 py-px rounded text-[0.9em] text-[#a78bfa]">_nclex_test.json</code> here</p>
          <p className="text-[#555] text-[13px]">or click to browse</p>
        </div>
    </div>
  )
}
