import { createTestimonialHandler } from "./handler.ts";

Deno.serve(createTestimonialHandler({
  supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
  anonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  aiKey: Deno.env.get("AI_API_KEY") ?? "",
}));
