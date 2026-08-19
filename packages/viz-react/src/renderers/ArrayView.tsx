import type { Mark } from '@cs/viz-core';

export function ArrayView({ state, marks }: { state: number[]; marks?: Mark[] }) {
  const kinds = new Map<number, string>();
  for (const m of marks ?? []) {
    if (m.at.t === 'index') kinds.set(m.at.i, m.kind);
    else for (let i = m.at.from; i <= m.at.to; i++) kinds.set(i, m.kind);
  }
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {state.map((v, i) => (
        <div key={i} style={{ border: '1px solid #999', padding: 8, minWidth: 32 }}>
          {v}
          <div style={{ fontSize: 10 }}>{kinds.get(i) ?? ''}</div>
        </div>
      ))}
    </div>
  );
}
