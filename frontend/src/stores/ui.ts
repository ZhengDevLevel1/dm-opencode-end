import { create } from "zustand";

interface UiState {
  sidebarPinned: boolean;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  setSidebarPinned: (value: boolean) => void;
  setMobileNavOpen: (value: boolean) => void;
  setCommandOpen: (value: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarPinned: false,
  mobileNavOpen: false,
  commandOpen: false,
  setSidebarPinned: (value) => set({ sidebarPinned: value }),
  setMobileNavOpen: (value) => set({ mobileNavOpen: value }),
  setCommandOpen: (value) => set({ commandOpen: value }),
}));
