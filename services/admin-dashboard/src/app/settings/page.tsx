"use client";

import React from "react";

type ConnectionStatus = "configured" | "missing" | "unverified";

type Connection = {
  name: string;
  owner: string;
  source: string;
  status: ConnectionStatus;
  detail: string;
};

const connections: Connection[] = [
  { name: "Admin dashboard", owner: "conxius-platform", source: "Vercel environment", status: "configured", detail: "ADMIN_DASHBOARD_API_KEY" },
  { name: "Neon Postgres", owner: "Platform data services", source: "Neon integration", status: "configured", detail: "DATABASE_URL / NEON_DATABASE_URL" },
  { name: "Supabase", owner: "Owned source repository", source: "Supabase integration", status: "configured", detail: "SUPABASE_URL and publishable credentials" },
  { name: "Upstash", owner: "Ephemeral infrastructure", source: "Upstash integration", status: "configured", detail: "REST endpoint and runtime token" },
  { name: "Gateway", owner: "Gateway repository", source: "Vercel environment", status: "unverified", detail: "GATEWAY_URL is configured; authenticated contract check required" },
  { name: "Nexus", owner: "Nexus repository", source: "Vercel environment", status: "unverified", detail: "NEXUS_ADMIN_API_TOKEN is configured; endpoint evidence required" },
  { name: "External protocol services", owner: "Owning repositories", source: "Service-specific configuration", status: "unverified", detail: "Oracle, Stacks, Tableland, and Kwil require owner evidence" },
];

function StatusBadge({ status }: { status: ConnectionStatus }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

export default function SettingsPage() {
  return (
    <main className="settings-page">
      <header className="settings-header">
        <p className="eyebrow">Platform configuration</p>
        <h1>Settings</h1>
        <p className="settings-intro">Configuration is managed by the owning Vercel project, integration, or repository. This page is intentionally read-only.</p>
      </header>

      <section className="settings-notice" aria-labelledby="settings-notice-title">
        <h2 id="settings-notice-title">Secrets are not entered here</h2>
        <p>Do not paste tokens, passwords, private keys, service-account JSON, or mailbox credentials into the dashboard. Use the project environment and connection controls so secrets remain scoped, auditable, and available to deployed runtimes.</p>
      </section>

      <section className="settings-panel" aria-labelledby="connection-inventory-title">
        <div className="settings-panel-heading">
          <div>
            <p className="eyebrow">Source of truth</p>
            <h2 id="connection-inventory-title">Connection inventory</h2>
          </div>
          <span className="inventory-count">{connections.length} surfaces</span>
        </div>
        <div className="connection-list">
          {connections.map((connection) => (
            <article className="connection-row" key={connection.name}>
              <div>
                <h3>{connection.name}</h3>
                <p>{connection.detail}</p>
              </div>
              <div className="connection-meta">
                <span>{connection.owner}</span>
                <span>{connection.source}</span>
                <StatusBadge status={connection.status} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="settings-panel settings-guidance" aria-labelledby="settings-guidance-title">
        <p className="eyebrow">Operational boundary</p>
        <h2 id="settings-guidance-title">How to change configuration</h2>
        <ul>
          <li>Use Vercel project environment variables for runtime configuration.</li>
          <li>Use managed integrations for Neon, Supabase, Upstash, and other connected services.</li>
          <li>Use the owning repository workflow for CI, publishing, wallet, and protocol credentials.</li>
          <li>Use authenticated health and contract checks before marking a dependency healthy.</li>
        </ul>
      </section>
    </main>
  );
}
