import React from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif', backgroundColor: '#f4f4f4' }}>
        <header style={{ padding: '1rem', backgroundColor: '#2E403B', color: 'white' }}>
          <h1>Conxian Admin Dashboard</h1>
        </header>
        <main style={{ padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
