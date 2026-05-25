import { useEffect, useRef, useState } from "react";

const INTERACTIVE_SELECTOR =
  'button:not(:disabled), a[href], [role="button"]:not([aria-disabled="true"]), [data-cursor="interactive"], summary, input[type="checkbox"], input[type="radio"], select, label[for]';

const TEXT_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"], [data-cursor="text"]';

const STORAGE_KEY = "sb_custom_cursor";
const PREF_EVENT = "sb-cursor-pref-change";

export function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const onPref = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setEnabled(detail);
    };
    window.addEventListener(PREF_EVENT, onPref);
    return () => window.removeEventListener(PREF_EVENT, onPref);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse = window.matchMedia("(pointer: coarse), (hover: none)");
    if (coarse.matches) {
      setEnabled(false);
      return;
    }
    const onChange = () => {
      if (coarse.matches) setEnabled(false);
    };
    coarse.addEventListener("change", onChange);
    return () => coarse.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!enabled) {
      document.documentElement.classList.remove("custom-cursor");
      return;
    }
    document.documentElement.classList.add("custom-cursor");

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;
    let inside = true;

    const tick = () => {
      const ease = prefersReduced ? 1 : 0.22;
      rx += (mx - rx) * ease;
      ry += (my - ry) * ease;
      const ring = ringRef.current;
      const dot = dotRef.current;
      if (ring) ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      if (dot) dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!inside) {
        inside = true;
        ringRef.current?.classList.remove("cc-hide");
        dotRef.current?.classList.remove("cc-hide");
      }
    };

    const isMatch = (el: EventTarget | null, sel: string): boolean =>
      el instanceof Element ? !!el.closest(sel) : false;

    const setState = (state: "default" | "interactive" | "text" | "disabled") => {
      const ring = ringRef.current;
      const dot = dotRef.current;
      if (ring) ring.dataset.state = state;
      if (dot) dot.dataset.state = state;
    };

    const onOver = (e: PointerEvent) => {
      const target = e.target;
      if (target instanceof Element && target.closest('button:disabled, [aria-disabled="true"]')) {
        setState("disabled");
        return;
      }
      if (isMatch(target, INTERACTIVE_SELECTOR)) {
        setState("interactive");
        return;
      }
      if (isMatch(target, TEXT_SELECTOR)) {
        setState("text");
        return;
      }
      setState("default");
    };

    const onDown = () => ringRef.current?.classList.add("cc-press");
    const onUp = () => ringRef.current?.classList.remove("cc-press");

    const onLeave = () => {
      inside = false;
      ringRef.current?.classList.add("cc-hide");
      dotRef.current?.classList.add("cc-hide");
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        const next = !enabled;
        try {
          window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new CustomEvent(PREF_EVENT, { detail: next }));
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerover", onOver);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("keydown", onKey);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("custom-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]" aria-hidden>
      <div ref={ringRef} className="cc-ring" />
      <div ref={dotRef} className="cc-dot" />
    </div>
  );
}
