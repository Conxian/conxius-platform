"use client";

import { useState, useEffect } from "react";

export default function TelemetryPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ui/telemetry/delivery");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch event bus telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "2rem", backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      <h1 style={{ color: "#2E403B", marginBottom: "1.5rem" }}>Event Bus Delivery Telemetry</h1>

      {loading && !data ? (
        <p>Loading telemetry...</p>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            <MetricCard title="Last Sequence" value={data?.event_bus?.last_sequence ?? 0} />
            <MetricCard title="Success Rate" value={`${data?.event_bus?.delivery_success_rate?.toFixed(1) ?? 100}%`} />
            <MetricCard title="Pending" value={data?.event_bus?.pending_events ?? 0} />
          </div>

          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "#374151" }}>Delivery Records</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem" }}>Event ID</th>
                  <th style={{ padding: "0.75rem" }}>Status</th>
                  <th style={{ padding: "0.75rem" }}>Retries</th>
                  <th style={{ padding: "0.75rem" }}>Last Attempt</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(data?.event_bus?.records ?? {}).map((record: any) => (
                  <tr key={record.event_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.85rem" }}>{record.event_id}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <StatusBadge status={record.status} />
                    </td>
                    <td style={{ padding: "0.75rem" }}>{record.retry_count}</td>
                    <td style={{ padding: "0.75rem", fontSize: "0.85rem", color: "#6b7280" }}>{record.last_attempt_at_iso ?? "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value }: { title: string, value: string | number }) {
  return (
    <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <p style={{ fontSize: "0.875rem", color: "#6b7280", textTransform: "uppercase", marginBottom: "0.5rem" }}>{title}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#111827" }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    delivered: "#065f46",
    failed: "#991b1b",
    retrying: "#92400e",
    pending: "#374151"
  };
  const bgColors: Record<string, string> = {
    delivered: "#d1fae5",
    failed: "#fee2e2",
    retrying: "#fef3c7",
    pending: "#f3f4f6"
  };

  return (
    <span style={{
      padding: "0.25rem 0.625rem",
      borderRadius: "9999px",
      fontSize: "0.75rem",
      fontWeight: "medium",
      color: colors[status] || "#374151",
      backgroundColor: bgColors[status] || "#f3f4f6"
    }}>
      {status.toUpperCase()}
    </span>
  );
}
