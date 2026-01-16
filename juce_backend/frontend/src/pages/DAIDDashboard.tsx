import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDAIDStore } from '@/stores/daidStore';
import ProvenanceChainView from '@/components/daid/ProvenanceChainView';
import { EntityType, type DAIDRecord } from '@/types/daid';
import RecordInspectorModal from '@/components/daid/RecordInspectorModal';
import { useWebSocketStore } from '@/stores/websocketStore';
import { adminDaidFlush, adminDaidCleanup, adminDaidValidate, adminDaidChain, adminUserSummary } from '@/lib/admin';

const DAIDDashboard: React.FC = () => {
  const [entityType, setEntityType] = useState<EntityType>(EntityType.PROJECT);
  const [entityId, setEntityId] = useState('current_project');

  const {
    getProvenanceChain,
    setProvenanceChain,
    refreshProvenanceChain,
    validateChain,
    exportProvenance,
    loading,
    errors,
  } = useDAIDStore();

  const chain = useMemo(() => getProvenanceChain(entityType, entityId), [getProvenanceChain, entityType, entityId]);
  const [selected, setSelected] = useState<DAIDRecord | null>(null);
  const [retention, setRetention] = useState(365);
  const [dryRun, setDryRun] = useState(true);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [summaryUserId, setSummaryUserId] = useState('');
  const [summary, setSummary] = useState<any>(null);

  // Auto-refresh on incoming WS messages (debounced)
  const { subscribe } = useWebSocketStore();
  const refreshTimer = useRef<number | null>(null);
  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (!msg?.type || typeof msg.type !== 'string' || !msg.type.startsWith('daid.')) return;
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        refreshProvenanceChain(entityType, entityId);
      }, 500);
    });
    return () => {
      unsub();
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, [subscribe, refreshProvenanceChain, entityType, entityId]);

  const handleRefresh = async () => {
    await refreshProvenanceChain(entityType, entityId);
  };

  const handleValidate = async () => {
    try {
      await adminDaidValidate(entityType, entityId);
      setAdminMsg('Validation requested');
    } catch (e) {
      setAdminMsg(e instanceof Error ? e.message : 'Validate failed');
    }
  };

  const handleExport = async () => {
    const blob = await exportProvenance(entityType, entityId, {
      format: 'json',
      include_metadata: true,
      anonymize: false,
      include_integrity_proof: true,
      compression: false,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `provenance_${entityType}_${entityId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFlush = async () => {
    try {
      await adminDaidFlush();
      setAdminMsg('Flushed pending operations');
    } catch (e) {
      setAdminMsg(e instanceof Error ? e.message : 'Flush failed');
    }
  };

  const handleCleanup = async () => {
    try {
      const res = await adminDaidCleanup(retention, dryRun);
      setAdminMsg(`Cleanup: ${res.total_records_found} candidates (dry_run=${res.dry_run})`);
    } catch (e) {
      setAdminMsg(e instanceof Error ? e.message : 'Cleanup failed');
    }
  };

  const handleFetchChainAdmin = async () => {
    try {
      const c = await adminDaidChain(entityType, entityId);
      // push into store for reuse
      if (c) {
        setProvenanceChain(entityType, entityId, c);
        setAdminMsg('Chain loaded via admin');
      }
    } catch (e) {
      setAdminMsg(e instanceof Error ? e.message : 'Admin chain load failed');
    }
  };

  const handleUserSummary = async () => {
    try {
      const res = await adminUserSummary(summaryUserId, 30);
      setSummary(res);
      setAdminMsg('Loaded user summary');
    } catch (e) {
      setAdminMsg(e instanceof Error ? e.message : 'Summary failed');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">DAID Dashboard</h2>

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-daw-text-secondary mb-1">Entity Type</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityType)}
            className="px-2 py-1 border border-daw-border rounded bg-daw-surface text-sm"
          >
            {Object.values(EntityType).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-daw-text-secondary mb-1">Entity ID</label>
          <input
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="project_123 or track_1"
            className="w-full px-2 py-1 border border-daw-border rounded bg-daw-surface text-sm"
          />
        </div>
        <button onClick={handleRefresh} className="px-3 py-1 rounded border border-daw-border hover:border-daw-accent-primary text-sm">
          {loading.chains ? 'Loading…' : 'Load Chain'}
        </button>
        <button onClick={handleValidate} className="px-3 py-1 rounded border border-daw-border hover:border-daw-accent-primary text-sm">
          Validate
        </button>
        <button onClick={handleExport} className="px-3 py-1 rounded border border-daw-border hover:border-daw-accent-primary text-sm">
          Export JSON
        </button>
        <button onClick={handleFlush} className="px-3 py-1 rounded border border-daw-border hover:border-daw-accent-primary text-sm">
          Flush Pending
        </button>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-daw-text-secondary mb-1">Retention (days)</label>
            <input type="number" value={retention} onChange={e => setRetention(parseInt(e.target.value || '0', 10))} className="w-28 px-2 py-1 border border-daw-border rounded bg-daw-surface text-sm" />
          </div>
          <label className="flex items-center gap-1 text-xs text-daw-text-secondary mb-1">
            <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} /> dry-run
          </label>
          <button onClick={handleCleanup} className="px-3 py-1 rounded border border-daw-border hover:border-daw-accent-primary text-sm">
            Cleanup
          </button>
        </div>
        <button onClick={handleFetchChainAdmin} className="px-3 py-1 rounded border border-daw-border hover:border-daw-accent-primary text-sm">
          Load via Admin
        </button>
      </div>

      {adminMsg ? <div className="text-xs text-daw-text-secondary">{adminMsg}</div> : null}

      {errors.chains ? (
        <div className="text-sm text-red-400">Error: {errors.chains}</div>
      ) : null}

      {chain ? (
        <ProvenanceChainView chain={chain} onSelect={setSelected} />
      ) : (
        <div className="text-sm text-daw-text-secondary">No chain loaded. Choose an entity and click Load Chain.</div>
      )}

      <div className="mt-4 border-t border-daw-border pt-4">
        <div className="text-sm font-semibold mb-2">User Summary</div>
        <div className="flex items-end gap-2">
          <input value={summaryUserId} onChange={e => setSummaryUserId(e.target.value)} placeholder="user_123" className="px-2 py-1 border border-daw-border rounded bg-daw-surface text-sm" />
          <button onClick={handleUserSummary} className="px-3 py-1 rounded border border-daw-border hover:border-daw-accent-primary text-sm">Fetch Summary</button>
        </div>
        {summary ? (
          <pre className="text-xs bg-black/30 p-2 rounded max-h-[35vh] overflow-auto border border-daw-border mt-2">{JSON.stringify(summary, null, 2)}</pre>
        ) : null}
      </div>

      {selected ? (
        <RecordInspectorModal record={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
};

export default DAIDDashboard;
