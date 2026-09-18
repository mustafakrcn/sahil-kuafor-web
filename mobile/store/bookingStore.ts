import { create } from 'zustand';
import type { BookingSelection, Service, Staff, TimeSlot } from '../types';

interface BookingStore {
  selection: BookingSelection;
  currentStep: 1 | 2 | 3;

  // Setter'lar
  setService: (service: Service) => void;
  setStaff: (staff: Staff) => void;
  setDate: (date: string) => void;
  setSlot: (slot: TimeSlot) => void;
  setNotes: (notes: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: 1 | 2 | 3) => void;
  reset: () => void;
}

const initialSelection: BookingSelection = {
  service: null,
  staff: null,
  date: null,
  slot: null,
  notes: '',
};

export const useBookingStore = create<BookingStore>((set) => ({
  selection: initialSelection,
  currentStep: 1,

  setService: (service) =>
    set((state) => ({
      selection: { ...state.selection, service, staff: null, date: null, slot: null },
    })),

  setStaff: (staff) =>
    set((state) => ({
      selection: { ...state.selection, staff, date: null, slot: null },
    })),

  setDate: (date) =>
    set((state) => ({
      selection: { ...state.selection, date, slot: null },
    })),

  setSlot: (slot) =>
    set((state) => ({
      selection: { ...state.selection, slot },
    })),

  setNotes: (notes) =>
    set((state) => ({
      selection: { ...state.selection, notes },
    })),

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, 3) as 1 | 2 | 3,
    })),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 1) as 1 | 2 | 3,
    })),

  goToStep: (step) => set({ currentStep: step }),

  reset: () => set({ selection: initialSelection, currentStep: 1 }),
}));
