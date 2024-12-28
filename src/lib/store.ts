import { create } from "zustand";
interface States {
  userId: string;
  credits: number;
  chatSessionId: string;
}

interface Actions {
  setUserId: (userId: string) => void;

  setChatSessionId: (chatSessionId: string) => void;
  deleteChatSession: () => void;
}
export const useAuthStore = create<States & Actions>((set) => ({
  userId: "",
  credits: 150,
  chatSessionId: "",

  // actions
  setUserId: (userId: string) => set({ userId }),
  setChatSessionId: (chatSessionId: string) => set({ chatSessionId }),
  deleteChatSession: () => set((state) => ({ chatSessionId: "" })),
}));
