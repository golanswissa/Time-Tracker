import { useState } from 'react';
import { Modal } from './Modal';
import { useStore } from '../store';
import type { Task } from '../types';

interface Props {
  task?: Task | null;
  onClose: () => void;
}

export function TaskModal({ task, onClose }: Props) {
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);

  const isEdit = !!task;
  const [name, setName] = useState(task?.name || '');
  const [active, setActive] = useState(task?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (isEdit && task) {
      updateTask(task.id, { name: name.trim(), active });
    } else {
      addTask(name.trim());
    }
    onClose();
  };

  const onDelete = () => {
    if (!task) return;
    if (confirm(`Delete "${task.name}"? Time entries using this task will also be removed.`)) {
      deleteTask(task.id);
      onClose();
    }
  };

  const footer = (
    <>
      {isEdit && (
        <button className="btn btn-danger-ghost" onClick={onDelete} style={{ marginRight: 'auto' }}>
          Delete
        </button>
      )}
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-dark" onClick={onSave}>{isEdit ? 'Save' : 'Create'}</button>
    </>
  );

  return (
    <Modal title={isEdit ? 'Edit task' : 'New task'} onClose={onClose} footer={footer}>
      <div className="field">
        <label>Name</label>
        <input
          className="input"
          placeholder="e.g. Development"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          autoFocus
        />
      </div>
      {isEdit && (
        <div className="field">
          <label>Active</label>
          <select className="select" value={active ? '1' : '0'} onChange={(e) => setActive(e.target.value === '1')}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
      )}
      {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
    </Modal>
  );
}
