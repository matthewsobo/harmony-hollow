/*
 * Settings — parent-facing screen: storage status and progress backup.
 * Export downloads a JSON of all profiles; import restores it. This is the
 * family's insurance against iOS evicting IndexedDB, and the only way
 * progress moves between devices (no cloud sync by design).
 */
import { useEffect, useRef, useState } from 'react';
import { exportData, getMicSettings, importData, type MicSettings } from '../db';
import { TopBar } from '../components/TopBar';

export function Settings({
  persisted,
  onBack,
  onDataImported,
  onCalibrate,
}: {
  persisted: boolean | null;
  onBack: () => void;
  onDataImported: () => void;
  onCalibrate: () => void;
}) {
  const [micSettings, setMicSettings] = useState<MicSettings | null>(null);
  useEffect(() => {
    void getMicSettings().then(setMicSettings);
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');

  async function handleExport() {
    const data = await exportData();
    // Standard "download a generated file" trick: a temporary <a download>.
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony-hollow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Backup downloaded ✔');
  }

  async function handleImportFile(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const count = await importData(parsed);
      setStatus(`Restored ${count} profile${count === 1 ? '' : 's'} ✔`);
      onDataImported();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Import failed');
    }
  }

  return (
    <>
      <TopBar title="Settings" onBack={onBack} />
      <main className="screen">
        <div className="card">
          <div className="settings-row">
            <span>Protected storage</span>
            <span>{persisted === null ? 'checking…' : persisted ? 'on ✔' : 'not granted'}</span>
          </div>
          <div className="settings-row">
            <span>Piano calibration</span>
            <span>
              {micSettings === null
                ? 'checking…'
                : micSettings.calibrated
                  ? `${Math.abs(micSettings.tuningOffsetCents).toFixed(0)}¢ ${micSettings.tuningOffsetCents >= 0 ? 'sharp' : 'flat'} · gate ${micSettings.gateThreshold.toFixed(3)}`
                  : 'not yet tuned'}
            </span>
          </div>
          <div className="settings-row">
            <span>App version</span>
            <span>Phase 4 — Mic play</span>
          </div>
        </div>
        <button className="big-btn big-btn--quiet" onClick={onCalibrate}>
          🎹 Tune up the microphone
        </button>
        <button className="big-btn big-btn--quiet" onClick={() => void handleExport()}>
          ⬇️ Save progress backup
        </button>
        <button className="big-btn big-btn--quiet" onClick={() => fileRef.current?.click()}>
          ⬆️ Restore from backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImportFile(f);
            e.target.value = '';
          }}
        />
        {status && <p className="muted">{status}</p>}
        <p className="muted">
          Backups let you move progress to a new iPad — keep one somewhere safe
          now and then.
        </p>
      </main>
    </>
  );
}
