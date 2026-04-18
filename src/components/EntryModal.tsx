import { useState } from 'react';
import { Modal } from './Modal';
import { useStore } from '../store';
import type { Entry } from '../types';
import { formatHMS, parseDurationInput, todayKey } from '../utils';

interface Props {
  entry?: Entry | null;
  defaultDate?: string;
  onClose: () => void;
}

/** Create or edit an entry manually (not via timer). */
export function EntryModal({ entry, defaultDate, onClose }: Props) {
  const projects = useStore((s) => s.projects.filter((p) => p.status === 'active'));
  const tasks = useStore((s) => s.tasks.filter((t) => t.active));
  const clients = useStore((s) => s.clients);
  const addEntry = useStore((s) => s.addEntry);
  const updateEntry = useStore((s) => s.updateEntry);
  const deleteEntry = useStore((s) => s.deleteEntry);
  const startTimer = useStore((s) => s.startTimer);

  const isEdit = !!entry;
  const [projectId, setProjectId] = useState(entry?.projectId || projects[0]?.id || '');
  const [taskId, setTaskId] = useState(entry?.taskId || tasks[0]?.id || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [date, setDate] = useState(entry?.date || defaultDate || todayKey());
  const [duration, setDuration] = useState(
    entry ? formatHMS(entry.durationSeconds) : '0:00'
  );
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    const seconds = parseDurationInput(duration);
    if (seconds === null) {
      setError('Use H:MM (e.g. 1:30) or decimal (1.5)');
      return;
    }
    if (!projectId || !taskId) {
      setError('Pick a project and task');
      return;
    }
    if (isEdit && entry) {
      updateEntry(entry.id, {
        projectId,
        taskId,
        notes,
        date,
        durationSeconds: seconds,
        isRunning: false,
        startedAt: undefined,
      });
    } else {
      addEntry({
        projectId,
        taskId,
        notes,
        date,
        durationSeconds: seconds,
        isRunning: false,
      });
    }
    onClose();
  };

  const onDelete = () => {
    if (!entry) return;
    if (confirm('Delete this entry?')) {
      deleteEntry(entry.id);
      onClose();
    }
  };

  const onStartTimer = () => {
    if (!projectId || !taskId) {
      setError('Pick a project and task');
      return;
    }
    startTimer(projectId, taskId, notes);
    onClose();
  };

  const footer = (
    <>
      {isEdit && (
        <button className="btn btn-danger-ghost" onClick={onDelete} style={{ marginRight: 'auto' }}>
          Delete
        </button>
      )}
      <button className="btn" onClick={onClose}>Cancel</button>
      {!isEdit && (
        <button className="btn" onClick={onStartTimer} title="Start a running timer now">
          Start timer
        </button>
      )}
      <button className="btn btn-dark" onClick={onSave}>
        {isEdit ? 'Save changes' : 'Add entry'}
      </button>
    </>
  );

  if (projects.length === 0 || tasks.length === 0) {
    return (
      <Modal title="Need a project and task first" onClose={onClose}
        footer={<button className="btn btn-dark" onClick={onClose}>OK</button>}
      >
        <p style={{ color: 'var(--text-muted)' }}>
          Add at least one active project and task to start tracking time.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      title={isEdit ? 'Edit entry' : 'New entry'}
      description="Manually add or adjust a time entry."
      onClose={onClose}
      footer={footer}
    >
      <div className="modal-row">
        <div className="field">
          <label>Project</label>
          <select className="select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => {
              const c = clients.find((cl) => cl.id === p.clientId);
              return (
                <option key={p.id} value={p.id}>
                  {p.name}{c ? ` (${c.name})` : ''}
                </option>
              );
            })}
          </select>
        </div>
        <div className="field">
          <label>Task</label>
          <select className="select" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Notes</label>
        <textarea
          className="textarea"
          placeholder="What did you work on?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="modal-row">
        <div className="field">
          <label>Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Hours (H:MM or 1.5)</label>
          <input
            className="input mono"
            placeholder="0:00"
            value={duration}
            onChange={(e) => { setDuration(e.target.value); setError(null); }}
          />
        </div>
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
    </Modal>
  );
}
