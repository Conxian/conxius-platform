import Link from "next/link";

export function RealityStatus() {
  return (
    <aside className="reality-status" aria-label="Platform reality status">
      <div className="reality-status__signal" aria-hidden="true" />
      <div className="reality-status__copy">
        <strong>Evidence-scoped Conxian Platform</strong>
        <span>Live sources are shown only when configured and verified. Unavailable providers are never simulated.</span>
      </div>
      <Link href="/status" className="reality-status__link">Review platform status</Link>
    </aside>
  );
}
