import { create } from "zustand";

interface WalletState {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;

  setWallet: (address: string, chainId: string) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  chainId: null,
  isConnected: false,

  setWallet: (address, chainId) =>
    set({
      address,
      chainId,
      isConnected: true,
    }),

  disconnect: () =>
    set({
      address: null,
      chainId: null,
      isConnected: false,
    }),
}));