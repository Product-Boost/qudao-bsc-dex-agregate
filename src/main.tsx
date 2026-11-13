import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./index.css";
import { wagmiConfig } from "./lib/wagmi";
import { ConfigGate } from "./components/ConfigGate";
import { WalletProvider } from "./components/layout/Wallet";
import { Toasts } from "./components/layout/Toasts";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ConfigGate>
            <WalletProvider>
              <App />
              <Toasts />
            </WalletProvider>
          </ConfigGate>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
    </MotionConfig>
  </StrictMode>,
);
