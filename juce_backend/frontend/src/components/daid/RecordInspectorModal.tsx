import React, { useMemo, useState } from 'react';
import type { DAIDRecord } from '@/types/daid';
import { useDAIDStore } from '@/stores/daidStore';

type Props = {
  record: DAIDRecord | null;
  onClose: () => void;
};

const RecordInspectorModal: React.FC<Props> = ({ record, onClose }) => {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; detail: string }>(null);
  const { validateRecord } = useDAIDStore();

  const json = useMemo(() => (record ? JSON.stringify(record, null, 2) : ''), [record]);

  if (!record) return null;

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await validateRecord(record.daid);
      setResult({ ok: res.is_valid, detail: res.validation_errors?.join(', ') || 'OK' });
    } catch (e) {
      setResult({ ok: false, detail: e instanceof Error ? e.message : 'Validation failed' });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[720px] max-h-[80vh] overflow-hidden rounded border border-daw-border bg-daw-surface shadow-xl">
        <div className="flex items-center justify-between p-3 border-b border-daw-border">
          <div className="text-sm font-semibold">Inspect Record</div>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded border border-daw-border hover:border-daw-accent-primary">Close</button>
        </div>
        <div className="p-3 space-y-3">
          <div className="text-xs text-daw-text-secondary font-mono break-all">{record.daid}</div>
          <div className="flex items-center gap-2">
            <button onClick={handleValidate} disabled={validating} className="px-3 py-1 rounded border border-daw-border hover:border-daw-accent-primary text-sm">
              {validating ? 'Validating…' : 'Validate'}
            </button>
            {result ? (
              <div className={result.ok ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
                {result.ok ? 'Valid' : 'Invalid'} — {result.detail}
              </div>
            ) : null}
          </div>
          <pre className="text-xs bg-black/30 p-2 rounded max-h-[55vh] overflow-auto border border-daw-border">{json}</pre>
        </div>
      </div>
    </div>
  );
};

export default RecordInspectorModal;

