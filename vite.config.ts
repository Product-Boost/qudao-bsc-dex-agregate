import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The app talks to the Qudao backend at /api. In development Vite forwards it to QUDAO_API
// (default: the mainnet backend on :8787; the local-fork backend runs on :8790).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    // the server pulls in an older viem and React 18 (PancakeSwap SDK); the app and its libraries use the copies in web/
    resolve: { dedupe: ["viem", "react", "react-dom"] },
    server: {
      host: "127.0.0.1",
      port: Number(env.PORT ?? 7727),
      proxy: { "/api": { target: env.QUDAO_API ?? "http://localhost:8787", changeOrigin: true } },
      fs: { allow: [".."] }, // contract ABIs live in ../shared
    },
    build: { chunkSizeWarningLimit: 1500 },
  };
});
