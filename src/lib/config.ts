// App-wide config from the backend (/api/config): chain, contract addresses, protocol numbers.
import { createContext, useContext } from "react";
import type { AppConfig } from "./api";

export const ConfigContext = createContext<AppConfig | null>(null);

export function useAppConfig(): AppConfig {
  const c = useContext(ConfigContext);
  if (!c) throw new Error("useAppConfig outside ConfigGate");
  return c;
}

/** Contract addresses, or null while Qudao isn't deployed on this network (pages then show market data only). */
export const useDeployment = () => useAppConfig().deployment;
