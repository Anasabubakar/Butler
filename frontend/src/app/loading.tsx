export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-b-canvas)" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full animate-gentle-pulse" style={{ background: "var(--color-b-accent)" }} />
        <span className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>Loading…</span>
      </div>
    </div>
  );
}
