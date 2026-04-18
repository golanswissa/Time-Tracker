import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useStore } from '../store';
import { TaskModal } from '../components/TaskModal';
import type { Task } from '../types';

export function TasksPage() {
  const tasks = useStore((s) => s.tasks);
  const [editing, setEditing] = useState<Task | null | undefined>(undefined);

  return (
    <div className="page">
      <div className="topbar">
        <h1>Tasks</h1>
        <div className="topbar-right">
          <button className="btn btn-dark" onClick={() => setEditing(null)}>
            <Plus size={14} />
            New task
          </button>
        </div>
      </div>

      <div className="table">
        <div className="table-head cols-tasks">
          <div>Name</div>
          <div>Status</div>
          <div></div>
        </div>
        {tasks.length === 0 && (
          <div className="empty">
            <strong>No tasks yet</strong>
            Tasks are the categories of work you track (e.g. Development, Meetings, Research).
          </div>
        )}
        {tasks.map((t) => (
          <div key={t.id} className="table-row cols-tasks">
            <div style={{ fontWeight: 500, letterSpacing: '-0.14px' }}>{t.name}</div>
            <div>
              <span className={`status-pill ${t.active ? 'status-active' : 'status-archived'}`}>
                {t.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="row-actions">
              <button className="iconbtn-ghost" onClick={() => setEditing(t)} aria-label="Edit">
                <Pencil size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing !== undefined && <TaskModal task={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
