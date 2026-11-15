import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  sidebarPinned: boolean;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  setSidebarPinned: (value: boolean) => void;
  setMobileNavOpen: (value: boolean) => void;
  setCommandOpen: (value: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarPinned: false,
      mobileNavOpen: false,
      commandOpen: false,
      setSidebarPinned: (value) => set({ sidebarPinned: value }),
      setMobileNavOpen: (value) => set({ mobileNavOpen: value }),
      setCommandOpen: (value) => set({ commandOpen: value }),
    }),
    {
      name: "flower.ui",
      partialize: (state) => ({ sidebarPinned: state.sidebarPinned }),
    },
  ),
);
