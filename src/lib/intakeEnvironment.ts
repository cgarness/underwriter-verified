const PRODUCTION_DATABASE_HOST = "jzdzeevjpootbeuniygx.supabase.co";
const PRODUCTION_SITE_HOSTS = new Set(["www.underwriterverified.com", "underwriterverified.com"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const INTAKE_PREVIEW_MESSAGE = "Submissions are disabled on this preview. Use the live website to send a request.";

// Prevent accidental test submissions. This is a client safeguard, not a
// database authorization boundary: the public RPC remains a public endpoint.
export function intakeEnvironmentAllowsSubmission(
  databaseUrl: string,
  siteOrigin: string,
  deploymentEnvironment: string,
): boolean {
  try {
    const database = new URL(databaseUrl);
    const site = new URL(siteOrigin);
    if (database.hostname === PRODUCTION_DATABASE_HOST) {
      return database.protocol === "https:" && site.protocol === "https:"
        && PRODUCTION_SITE_HOSTS.has(site.hostname)
        && deploymentEnvironment === "production";
    }
    // Only a local disposable API is enabled without a separately reviewed
    // isolated-preview configuration. Unknown hosted databases fail closed.
    return deploymentEnvironment === "development"
      && LOCAL_HOSTS.has(database.hostname) && LOCAL_HOSTS.has(site.hostname)
      && ["http:", "https:"].includes(database.protocol)
      && ["http:", "https:"].includes(site.protocol);
  } catch {
    return false;
  }
}

export function canSubmitPublicIntake(): boolean {
  return intakeEnvironmentAllowsSubmission(
    import.meta.env.VITE_SUPABASE_URL,
    window.location.origin,
    import.meta.env.VITE_DEPLOYMENT_ENV ?? "development",
  );
}
