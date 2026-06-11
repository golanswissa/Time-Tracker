import { create } from 'zustand';

/**
 * Transient UI state for the Phase-1 interface shell.
 * Not persisted — purely view state (which panels are open).
 *
 * taskPanel: null = closed · 'new' = create mode · <id> = editing that task.
 */
interface UIState {
  navOpen: boolean;
  chatOpen: boolean;
  taskPanel: string | null;
  toggleNav: () => void;
  toggleChat: () => void;
  openCreate: () => void;
  openEdit: (id: string) => void;
  closePanel: () => void;
}

export const useUI = create<UIState>((set) => ({
  navOpen: false,
  chatOpen: false,
  taskPanel: null,
  toggleNav: () => set((s) => ({ navOpen: !s.navOpen })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  openCreate: () => set({ taskPanel: 'new' }),
  openEdit: (id) => set({ taskPanel: id }),
  closePanel: () => set({ taskPanel: null }),
}));
