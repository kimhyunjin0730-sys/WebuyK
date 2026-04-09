"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastCtx {
  push: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);
const TIMEOUT_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, TIMEOUT_MS);
  }, []);

  const value = useMemo<ToastCtx>(
    () => ({
      push,
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:items-end sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
                t.kind === "success"
                  ? "border-green-200 bg-green-50/90 text-green-900"
                  : t.kind === "error"
                    ? "border-red-200 bg-red-50/90 text-red-900"
                    : "border-blue-200 bg-blue-50/90 text-blue-900"
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {t.kind === "success" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : t.kind === "error" ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <Info className="h-5 w-5 text-blue-600" />
                )}
              </span>
              <span className="leading-snug">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
