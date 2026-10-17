import type { AgentData } from "@/contexts/AgentDataContext";

/** Linked owners may edit website-only content, not AgentFlow-owned identity or routing. */
export function websiteOwnedFields(form: AgentData) {
  return { bio: form.bio, short_bio: form.shortBio, calendar_url: form.calendarUrl, testimonials: form.testimonials };
}
