import React from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: 'Inter, system-ui, sans-serif',
        backgroundColor: '#F5F5F5',
        color: '#333333'
      }}>
        <header style={{
          padding: '1rem 2rem',
          backgroundColor: '#2E403B',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '4px solid #D4A017'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '0.05em' }}>CONXIAN ADMIN</h1>
            <span style={{
              fontSize: '0.7rem',
              backgroundColor: '#D4A017',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}>TELEMETRY</span>
          </div>
          <nav style={{ fontSize: '0.9rem', fontWeight: 500 }}>
             <a href="/" style={{ color: 'inherit', textDecoration: 'none', marginRight: '1rem' }}>Overview</a>
             <a href="/multidimensional" style={{ color: 'inherit', textDecoration: 'none', marginRight: '1rem' }}>Pulse</a>
             <a href="/launch" style={{ color: 'inherit', textDecoration: 'none', marginRight: '1rem' }}>Launch</a>
             <a href="/steward" style={{ color: 'inherit', textDecoration: 'none', marginRight: '1rem' }}>Steward</a>
             <a href="/funded-roles" style={{ color: 'inherit', textDecoration: 'none', marginRight: '1rem' }}>Funded Roles</a>
             <a href="/rewards" style={{ color: 'inherit', textDecoration: 'none', marginRight: '1rem' }}>Rewards</a>
             <a href="/operators" style={{ color: 'inherit', textDecoration: 'none', marginRight: '1rem' }}>Operators</a>
             <a href="/tiers" style={{ color: 'inherit', textDecoration: 'none', marginRight: '1rem' }}>Tiers</a>
             <a href="/support" style={{ color: 'inherit', textDecoration: 'none', marginRight: '1rem' }}>Support</a>
             <a href="/settings" style={{ color: 'inherit', textDecoration: 'none' }}>Settings</a>
          </nav>
        </header>
        <main style={{ padding: '2rem' }}>
          {children}
        </main>
        <footer style={{
          padding: '2rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#666',
          borderTop: '1px solid #E0E0E0',
          marginTop: '4rem'
        }}>
          &copy; 2026 Conxian Labs • Unified Authority System
        </footer>
      </body>
    </html>
  );
}
