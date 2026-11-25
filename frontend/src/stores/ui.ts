import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  sidebarPinned: boolean;
  sidebarLocked: boolean;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  setSidebarPinned: (value: boolean) => void;
  setSidebarLocked: (value: boolean) => void;
  setMobileNavOpen: (value: boolean) => void;
  setCommandOpen: (value: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarPinned: false,
      sidebarLocked: false,
      mobileNavOpen: false,
      commandOpen: false,
      setSidebarPinned: (value) =>
        set(value ? { sidebarPinned: true, sidebarLocked: false } : { sidebarPinned: false }),
      setSidebarLocked: (value) =>
        set(value ? { sidebarLocked: true, sidebarPinned: false } : { sidebarLocked: false }),
      setMobileNavOpen: (value) => set({ mobileNavOpen: value }),
      setCommandOpen: (value) => set({ commandOpen: value }),
    }),
    {
      name: "flower.ui",
      partialize: (state) => ({
        sidebarPinned: state.sidebarPinned,
        sidebarLocked: state.sidebarLocked,
      }),
    },
  ),
);
