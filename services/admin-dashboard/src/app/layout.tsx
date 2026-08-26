import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import React from "react";
import { RealityStatus } from "../components/reality-status";
import { ServiceFabric } from "../components/service-fabric";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Conxian Admin | Operations Control Plane",
  description: "Evidence-scoped telemetry and lifecycle operations for the Conxian platform.",
};

const navigation = [
  ["Overview", "/"],
  ["Services", "/services"],
  ["Connections", "/connections"],
  ["Operations", "/operations"],
  ["Pulse", "/multidimensional"],

  ["Support", "/support"],
  ["Settings", "/settings"],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <header className="site-header">
          <div className="header-inner">
            <a className="brand" href="/" aria-label="Conxian Admin home">
              <span className="brand-mark" aria-hidden="true">CX</span>
              <span>
                <strong>CONXIAN</strong>
                <small>ADMIN CONTROL PLANE</small>
              </span>
            </a>
            <span className="environment-badge">TELEMETRY</span>
            <nav className="primary-nav" aria-label="Primary navigation">
              {navigation.map(([label, href]) => (
                <a key={href} href={href}>{label}</a>
              ))}
            </nav>
          </div>
        </header>
        <main className="site-main">
          <RealityStatus />
          {children}
        </main>
        <footer className="site-footer">
          <span>CONXIAN LABS</span>
          <span>Evidence-scoped operations · 2026</span>
        </footer>
      </body>
    </html>
  );
}
