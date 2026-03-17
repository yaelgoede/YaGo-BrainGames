"use client";

import type { ReactNode } from "react";

interface MiniGameOverlayProps {
  children: ReactNode;
  onClose: () => void;
}

export default function MiniGameOverlay({ children, onClose }: MiniGameOverlayProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center animate-overlay-backdrop">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Content */}
      <div className="animate-overlay-content relative z-10 mx-4 w-full max-w-md rounded-3xl panel-dark-strong border border-white/10 p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-gray-400 transition hover:bg-white/20 hover:text-white"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
