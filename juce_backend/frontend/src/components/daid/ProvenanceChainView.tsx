import React from 'react';
import type { ProvenanceChain, DAIDRecord } from '@/types/daid';

type Props = {
  chain: ProvenanceChain;
  onSelect?: (record: DAIDRecord) => void;
};

const ProvenanceChainView: React.FC<Props> = ({ chain, onSelect }) => {
  if (!chain || chain.provenance_chain.length === 0) {
    return <div className="text-daw-text-secondary text-sm">No records found.</div>;
  }

  return (
    <div className="border border-daw-border rounded p-3 bg-daw-surface">
      <div className="text-sm mb-2 text-daw-text-secondary">
        Entity: <span className="text-daw-text-primary font-mono">{chain.entity_type}</span> • ID: <span className="font-mono">{chain.entity_id}</span>
      </div>
      <ul className="space-y-2">
        {chain.provenance_chain.map((r) => (
          <li key={r.daid} className="p-2 rounded border border-daw-border hover:border-daw-accent-primary transition">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-xs text-daw-text-secondary">{r.daid}</div>
                <div className="text-sm">
                  <span className="px-1.5 py-0.5 mr-2 rounded bg-daw-surface/60 border border-daw-border text-daw-text-secondary text-xs">{r.operation}</span>
                  <span className="text-daw-text-primary font-medium">{r.entity_type}</span>
                  <span className="ml-1 font-mono text-xs">{r.entity_id}</span>
                </div>
                <div className="text-xs text-daw-text-secondary">user: {r.user_id || '—'} • depth: {r.depth} • created: {new Date(r.created_at).toLocaleString()}</div>
                {r.tags?.length ? (
                  <div className="mt-1 text-xs text-daw-text-secondary">tags: {r.tags.join(', ')}</div>
                ) : null}
              </div>
              {onSelect ? (
                <button className="text-xs px-2 py-1 rounded border border-daw-border hover:border-daw-accent-primary" onClick={() => onSelect(r)}>Inspect</button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProvenanceChainView;

