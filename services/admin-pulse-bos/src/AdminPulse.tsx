import React, { useState, useEffect } from "react";

/**
 * Conxian Admin Pulse (BOS Edition)
 * A Sovereign, Decentralized Monitoring Component
 * 
 * Ethos: Censorship-Resistant, Nakamoto-Aligned, Premium UX
 */

const GLASS_STYLE = {
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "24px",
  padding: "2rem",
  color: "#fff",
  fontFamily: "'Inter', sans-serif"
};

export const AdminPulse = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sovereign Discovery: Potential Pulse Endpoints
  const ENDPOINTS = [
    "http://localhost:3000/v1/status",
    "http://localhost:8080/api/v1/status"
  ];

  const refreshPulse = async () => {
    setLoading(true);
    const results = await Promise.all(
      ENDPOINTS.map(async (url) => {
        try {
          const res = await fetch(url);
          if (res.ok) return { url, status: "Active", data: await res.json() };
          return { url, status: "Offline" };
        } catch (e) {
          return { url, status: "Unreachable" };
        }
      })
    );
    setNodes(results);
    setLoading(false);
  };

  useEffect(() => {
    refreshPulse();
    const interval = setInterval(refreshPulse, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={GLASS_STYLE}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, background: "linear-gradient(90deg, #FF9900, #FFCC00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          CONXIAN PULSE (BOS)
        </h1>
        <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>BNS Registered: {nodes.some(n => n.status === "Active") ? "YES" : "NO"}</div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
        {nodes.map((node, i) => (
          <div key={i} style={{ padding: "1.5rem", borderRadius: "16px", background: node.status === "Active" ? "rgba(0, 255, 0, 0.05)" : "rgba(255, 0, 0, 0.05)", border: `1px solid ${node.status === "Active" ? "#00FF8844" : "#FF444444"}` }}>
            <div style={{ fontSize: "0.75rem", opacity: 0.5, marginBottom: "0.5rem" }}>ENDPOINT</div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "1rem", overflow: "hidden", textOverflow: "ellipsis" }}>{node.url}</div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: node.status === "Active" ? "#00FF88" : "#FF4444" }}>● {node.status}</span>
              {node.data && <span style={{ fontSize: "0.8rem" }}>Block: {node.data.processed_height}</span>}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={refreshPulse}
        style={{ marginTop: "2rem", width: "100%", padding: "1rem", borderRadius: "12px", background: "#FF9900", border: "none", color: "#000", fontWeight: 700, cursor: "pointer", transition: "transform 0.2s" }}
        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        REFRESH SOVEREIGN STATE
      </button>
    </div>
  );
};
