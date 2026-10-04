import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const VERIFIED_PRODUCTION_PROJECT_ID = "jzdzeevjpootbeuniygx";
const VERIFIED_PRODUCTION_URL = "https://jzdzeevjpootbeuniygx.supabase.co";
const SUPABASE_ENV_KEYS = [
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_URL",
] as const;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const deploymentEnvironment = process.env.VERCEL_ENV ?? "development";

  if (deploymentEnvironment === "production") {
    // Vercel project-level values still point at the retired Lovable backend.
    // Ignore those production-only process overrides so Vite can load the
    // reviewed public client values committed in .env. Preview/development
    // configuration is intentionally left untouched.
    for (const key of SUPABASE_ENV_KEYS) {
      delete process.env[key];
    }

    const productionEnv = loadEnv(mode, process.cwd(), "VITE_SUPABASE_");
    if (
      productionEnv.VITE_SUPABASE_PROJECT_ID !== VERIFIED_PRODUCTION_PROJECT_ID
      || productionEnv.VITE_SUPABASE_URL !== VERIFIED_PRODUCTION_URL
      || !productionEnv.VITE_SUPABASE_PUBLISHABLE_KEY
    ) {
      throw new Error("Refusing production build: Underwriter Verified Supabase configuration is not verified.");
    }
  }

  return {
    define: {
      // Vercel supplies this for both preview and production builds. Never infer
      // deployment target from Vite's mode: previews are production-mode builds.
      "import.meta.env.VITE_DEPLOYMENT_ENV": JSON.stringify(deploymentEnvironment),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
