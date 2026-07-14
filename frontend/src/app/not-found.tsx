import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--color-b-canvas)" }}>
      <h1 className="display-m" style={{ color: "var(--color-b-text-primary)" }}>404</h1>
      <p className="body-lg mt-4" style={{ color: "var(--color-b-text-secondary)" }}>
        Nothing here, Boss. Let me take you back.
      </p>
      <Link href="/" className="mt-8 inline-flex items-center justify-center px-5 py-2.5 rounded-full text-[15px] font-medium"
        style={{ background: "var(--color-b-ink)", color: "var(--color-b-text-inverse)" }}>
        Go home
      </Link>
    </div>
  );
}
