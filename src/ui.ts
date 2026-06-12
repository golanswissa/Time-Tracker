import { create } from 'zustand';

/**
 * Transient UI state for the Phase-1 interface shell.
 * Not persisted — purely view state (which panels are open).
 *
 * taskPanel: null = closed · 'new' = create mode · <id> = editing that task.
 * createPreset: optional defaults (project/client) when opening create.
 */
interface UIState {
  navOpen: boolean;
  chatOpen: boolean;
  taskPanel: string | null;
  createPreset: { projectId?: string; clientId?: string; date?: string } | null;
  toggleNav: () => void;
  toggleChat: () => void;
  openCreate: (preset?: { projectId?: string; clientId?: string; date?: string }) => void;
  openEdit: (id: string) => void;
  closePanel: () => void;
}

export const useUI = create<UIState>((set) => ({
  navOpen: false,
  chatOpen: false,
  taskPanel: null,
  createPreset: null,
  toggleNav: () => set((s) => ({ navOpen: !s.navOpen })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  openCreate: (preset) => set({ taskPanel: 'new', createPreset: preset ?? null }),
  openEdit: (id) => set({ taskPanel: id, createPreset: null }),
  closePanel: () => set({ taskPanel: null, createPreset: null }),
}));
