// Loads /api/config once before rendering the app.
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { ConfigContext } from "../lib/config";
import { Button } from "./ui";
import { LangSwitch } from "./LangSwitch";
import { useT } from "../i18n";

export function ConfigGate({ children }: { children: ReactNode }) {
  const { t } = useT();
  const { data, error, refetch, isFetching } = useQuery({ queryKey: ["config"], queryFn: api.config, staleTime: Infinity, retry: 2 });
  if (data) return <ConfigContext.Provider value={data}>{children}</ConfigContext.Provider>;
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="absolute top-4 right-4">
        <LangSwitch />
      </div>
      <div className="text-center">
        <img src="/favicon.svg" alt="" className={`mx-auto size-14 ${error ? "" : "animate-pulse"}`} />
        {error ? (
          <>
            <p className="mt-5 text-fg-2">{t("Qudao's server can't be reached right now.")}</p>
            <Button className="mt-4" variant="ghost" busy={isFetching} onClick={() => refetch()}>
              {t("Try again")}
            </Button>
          </>
        ) : (
          <p className="mt-5 text-sm text-mute">{t("Loading…")}</p>
        )}
      </div>
    </div>
  );
}
