"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, footer, maxWidth = "max-w-lg" }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/82 z-[200] flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,.82)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={cn("rounded-2xl w-full mt-8 mb-8", maxWidth)}
        style={{ background: "#1e2230", border: "1px solid rgba(99,102,241,.25)" }}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <h3 className="font-semibold text-slate-100 text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex gap-3 p-5 border-t border-slate-700/50">{footer}</div>
        )}
      </div>
    </div>
  );
}
