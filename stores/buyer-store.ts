import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MessageType =
  | "text"
  | "product-card"
  | "quantity-selector"
  | "address-form"
  | "payment-summary"
  | "order-confirmation"
  | "tracking-update"
  | "error"
  | "divider";

export interface ChatMessage {
  id: string;
  timestamp: number;
  direction: "incoming" | "outgoing";
  type: MessageType;
  payload: Record<string, unknown>;
  orderId?: string;
}

export type FlowStep =
  | "idle"
  | "code_entered"
  | "product_shown"
  | "quantity_selected"
  | "address_entry"
  | "payment_pending"
  | "payment_complete"
  | "complete";

export interface FlowProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  category?: string;
  stock?: number;
}

export interface FlowSeller {
  id: string;
  name: string;
  businessNo?: string;
}

export interface FlowAddress {
  buyerName: string;
  buyerPhone: string;
  address: string;
  addressDetail?: string;
  memo?: string;
}

export interface FlowState {
  step: FlowStep;
  shopCode?: string;
  codeKey?: string;
  codeId?: string;
  productId?: string;
  product?: FlowProduct;
  seller?: FlowSeller;
  quantity?: number;
  address?: FlowAddress;
  orderId?: string;
}

interface BuyerState {
  phoneNumber: string | null;
  messages: ChatMessage[];
  currentFlow: FlowState | null;
  setPhoneNumber: (phone: string) => void;
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  setFlow: (flow: FlowState | null) => void;
  updateFlowStep: (step: FlowStep, data?: Partial<FlowState>) => void;
  clearMessages: () => void;
}

let messageCounter = 0;

export const useBuyerStore = create<BuyerState>()(
  persist(
    (set) => ({
      phoneNumber: null,
      messages: [],
      currentFlow: null,

      setPhoneNumber: (phone) => set({ phoneNumber: phone }),

      addMessage: (msg) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...msg,
              id: `msg-${Date.now()}-${++messageCounter}`,
              timestamp: Date.now(),
            },
          ],
        })),

      setFlow: (flow) => set({ currentFlow: flow }),

      updateFlowStep: (step, data) =>
        set((state) => ({
          currentFlow: state.currentFlow
            ? { ...state.currentFlow, step, ...data }
            : null,
        })),

      clearMessages: () => set({ messages: [], currentFlow: null }),
    }),
    {
      name: "liveorder-buyer",
      partialize: (state) => ({
        phoneNumber: state.phoneNumber,
        messages: state.messages.slice(-100), // 최근 100개만 저장
      }),
    }
  )
);
