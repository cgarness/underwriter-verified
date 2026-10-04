// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createTestimonialHandler } from "../../supabase/functions/generate-testimonials/handler";

const userId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const env = { supabaseUrl: "https://isolated.invalid", anonKey: "public-test-key", serviceKey: "private-test-key", aiKey: "provider-test-key" };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const request = (body: unknown = {}, authorization = "Bearer test-session") => new Request("https://function.invalid", {
  method: "POST", headers: { Authorization: authorization }, body: JSON.stringify(body),
});
function authed(...responses: Response[]) {
  const fetcher = vi.fn<typeof fetch>();
  for (const response of [reply({ id: userId }), reply([{ id: "owned-profile" }]), ...responses]) fetcher.mockResolvedValueOnce(response);
  return fetcher;
}
const completion = (testimonials: unknown) => ({ choices: [{ message: { tool_calls: [{ function: {
  name: "return_testimonials", arguments: JSON.stringify({ testimonials }),
} }] } }] });

describe("testimonial function access and paid-call boundaries", () => {
  it("refuses missing authorization without contacting any service", async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect((await createTestimonialHandler(env, fetcher)(request({}, ""))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("refuses public anon keys that are not real user sessions", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(reply({ error: "no user" }, 401));
    expect((await createTestimonialHandler(env, fetcher)(request())) .status).toBe(401);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("requires an owned profile before generation", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(reply({ id: userId })).mockResolvedValueOnce(reply([]));
    expect((await createTestimonialHandler(env, fetcher)(request())).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not reserve quota or call OpenAI when the provider key is absent", async () => {
    const fetcher = authed();
    expect((await createTestimonialHandler({ ...env, aiKey: "" }, fetcher)(request())).status).toBe(503);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("enforces the shared database quota before making the paid call", async () => {
    const fetcher = authed(reply(false));
    expect((await createTestimonialHandler(env, fetcher)(request())).status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("validates input before reserving quota", async () => {
    const fetcher = authed();
    expect((await createTestimonialHandler(env, fetcher)(request({ bio: "x".repeat(5001) }))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("always labels successful output as fictional and keeps service credentials away from OpenAI", async () => {
    const fetcher = authed(reply(true), reply(completion([{ quote: "Example one" }, { quote: "Example two" }, { quote: "Example three" }])));
    const response = await createTestimonialHandler(env, fetcher)(request({ agentName: "Test Agent" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.testimonials).toHaveLength(3);
    expect(body.testimonials.every((t: {name: string;quote: string}) => t.name.startsWith("Sample client") && t.quote.startsWith("[Fictional example]"))).toBe(true);
    const call = fetcher.mock.calls[3];
    expect(call[0]).toBe("https://api.openai.com/v1/chat/completions");
    expect(JSON.stringify(call)).not.toContain(env.serviceKey);
    expect(JSON.parse(call[1]?.body as string).model).toBe("gpt-4o-mini");
  });
  it("rejects malformed model output", async () => {
    const fetcher = authed(reply(true), reply(completion([{ quote: "Only one" }])));
    expect((await createTestimonialHandler(env, fetcher)(request())).status).toBe(502);
  });
  it("never returns raw provider error details", async () => {
    const fetcher = authed(reply(true), reply({ error: `secret ${env.aiKey}` }, 500));
    const response = await createTestimonialHandler(env, fetcher)(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(env.aiKey);
  });
});
