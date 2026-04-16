"use client";
import React, { useEffect, useState } from "react";

type GatewayStats = {
  status: "Healthy" | "Degraded" | "Unknown";
  version: string | null;
  processedHeight: number | null;
  uptimeSeconds: number | null;
};

type NexusState = {
  merkleRoot: string | null;
  syncStatus: "synced" | "syncing" | "unknown";
  leafCount: number | null;
};

async function fetchJsonWithFallback(baseUrl: string, paths: string[]): Promise<unknown | null> {
  for (const path of paths) {
    try {
      const res = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
      if (!res.ok) continue;

      const json = await res.json().catch(() => undefined);
      if (json === undefined) continue;
      return json as unknown;
    } catch {
      continue;
    }
  }

  return null;
}

function getNumber(obj: unknown, key: string): number | null {
  if (typeof obj !== "object" || obj === null) return null;
  if (!(key in (obj as Record<string, unknown>))) return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function getString(obj: unknown, key: string): string | null {
  if (typeof obj !== "object" || obj === null) return null;
  if (!(key in (obj as Record<string, unknown>))) return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

function getBoolean(obj: unknown, key: string): boolean | null {
  if (typeof obj !== "object" || obj === null) return null;
  if (!(key in (obj as Record<string, unknown>))) return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "boolean" ? v : null;
}

function BlueprintCard() {
  const [blueprint, setBlueprint] = useState<any>(null);
  const [show, setShow] = useState(false);

  const fetchBlueprint = async () => {
    const res = await fetch("/api/deployment/blueprint");
    const data = await res.json();
    setBlueprint(data);
    setShow(true);
  };

  return (
    <section style={{ marginTop: '2rem' }}>
      <h3 style={{ borderBottom: '2px solid #D4A017', paddingBottom: '0.5rem', color: '#2E403B' }}>Agentic Audit (Blueprint)</h3>
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginTop: '1rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          Deterministic deployment export for autonomous auditors and AI orchestrators.
        </p>
        <button
          onClick={fetchBlueprint}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#D4A017', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {show ? "Refresh Blueprint" : "Export Blueprint"}
        </button>
        {show && blueprint && (
          <pre style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '0.8rem', overflowX: 'auto', border: '1px solid #eee' }}>
            {JSON.stringify(blueprint, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<GatewayStats | null>(null);
  const [nexus, setNexus] = useState<NexusState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const rawBaseUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
      if (!rawBaseUrl) {
        setStats(null);
        setNexus(null);
        setError("NEXT_PUBLIC_CORE_API_URL is not configured.");
        return;
      }

      const baseUrl = rawBaseUrl.replace(/\/$/, "");

      const statusJson = await fetchJsonWithFallback(baseUrl, ["/api/v1/status", "/v1/status"]);
      if (statusJson === null) {
        setStats(null);
        setNexus(null);
        setError("Could not fetch /api/v1/status from the configured CORE API URL.");
        return;
      }

      const safetyMode = getBoolean(statusJson, "safety_mode");
      const drift = getNumber(statusJson, "drift");

      setStats({
        status: safetyMode === null ? "Unknown" : safetyMode ? "Degraded" : "Healthy",
        version: getString(statusJson, "version"),
        processedHeight: getNumber(statusJson, "processed_height"),
        uptimeSeconds: getNumber(statusJson, "uptime_seconds"),
      });

      const nexusJson = await fetchJsonWithFallback(baseUrl, ["/api/v1/nexus/state"]);
      const merkleRoot =
        getString(nexusJson, "merkle_root") ??
        getString(statusJson, "state_root") ??
        getString(statusJson, "mmr_root");

      setNexus({
        merkleRoot,
        syncStatus: drift === null ? "unknown" : drift === 0 ? "synced" : "syncing",
        leafCount:
          getNumber(nexusJson, "leaf_count") ??
          getNumber(statusJson, "processed_height"),
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Unexpected error while fetching status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fef3c7", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.5rem", color: "#92400e", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontWeight: "bold" }}>INTERNAL USE ONLY:</span> This dashboard provides high-privilege access to platform infrastructure and telemetry.
      </div>
      {error && (
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fee2e2", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.5rem", color: "#b91c1c", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#2E403B' }}>Infrastructure Pulse</h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>Real-time telemetry from the Unified Gateway Engine.</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          style={{
            padding: '0.6rem 1.2rem',
            cursor: 'pointer',
            backgroundColor: loading ? '#ccc' : '#2E403B',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? "Refreshing..." : "Trigger Pulse"}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <StatCard title="Gateway Health" value={stats?.status ?? "Unknown"} color="#2E403B" />
        <StatCard title="Engine Version" value={stats?.version ?? "N/A"} />
        <StatCard title="Requests Handled" value={stats?.processedHeight ?? 0} />
        <StatCard title="Uptime" value={stats?.uptimeSeconds ? `${Math.floor(stats.uptimeSeconds / 60)}m ${stats.uptimeSeconds % 60}s` : "0s"} />
      </div>

      <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        <section>
          <h3 style={{ borderBottom: '2px solid #D4A017', paddingBottom: '0.5rem', color: '#2E403B' }}>Nexus "Glass Node" State</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <DataRow label="Merkle Root" value={nexus?.merkleRoot ?? "Initializing..."} mono />
            </div>
            <DataRow label="Sync Status" value={nexus?.syncStatus ?? "Pending"} highlight={nexus?.syncStatus === 'synced'} />
            <DataRow label="Leaf Count" value={nexus?.leafCount ?? 0} />
          </div>
        </section>

        <section>
          <h3 style={{ borderBottom: '2px solid #D4A017', paddingBottom: '0.5rem', color: '#2E403B' }}>Sovereign Services</h3>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginTop: '1rem' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <ServiceItem name="Stacks (L2)" status="Unknown" />
              <ServiceItem name="Bisq (P2P)" status="Unknown" />
              <ServiceItem name="RGB (Client-side)" status="Unknown" />
              <ServiceItem name="BitVM (Optimistic)" status="Unknown" />
              <ServiceItem name="Lightning Network" status="Unknown" />
            </ul>
          </div>
        </section>
      </div>

      <BlueprintCard />
    </div>
  );
}

function StatCard({ title, value, color }: { title: string, value: string | number, color?: string }) {
  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      borderLeft: color ? `4px solid ${color}` : 'none'
    }}>
      <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h4>
      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: color || '#333' }}>{value}</div>
    </div>
  );
}

function DataRow({ label, value, mono, highlight }: { label: string, value: string | number, mono?: boolean, highlight?: boolean }) {
  return (
    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{
        fontSize: mono ? '0.85rem' : '1.1rem',
        fontWeight: 'bold',
        fontFamily: mono ? 'monospace' : 'inherit',
        color: highlight ? '#2E403B' : '#333',
        wordBreak: 'break-all'
      }}>
        {value}
      </div>
    </div>
  );
}

function ServiceItem({ name, status }: { name: string, status: string }) {
  const statusColor = status === "Unknown" ? "#666" : "#2E403B";
  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #F0F0F0' }}>
      <span style={{ fontWeight: 500 }}>{name}</span>
      <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '0.9rem' }}>{status}</span>
    </li>
  );
}
