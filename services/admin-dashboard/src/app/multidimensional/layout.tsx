import React from 'react';

export default function MultidimensionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="multidimensional-context" style={{ minHeight: '100vh', backgroundColor: '#f4f7f6' }}>
      {children}
    </div>
  );
}
