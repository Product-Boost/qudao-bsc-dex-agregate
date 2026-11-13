// Lets any "Connect wallet" button open the wallet picker.
import { createContext, useContext } from "react";

export const WalletModalCtx = createContext<() => void>(() => {});
export const useOpenWallet = () => useContext(WalletModalCtx);
