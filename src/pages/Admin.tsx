import { useState, useRef, useEffect } from "react";
import { useAgentData, AgentData } from "@/contexts/AgentDataContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Plus, Trash2, ArrowLeft, Check, Upload, Sparkles, Loader2, LogOut, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import IntakeRequestsPanel from "@/components/IntakeRequestsPanel";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

interface StateLicense {
  state: string;
  number: string;
}

const parseLicense = (lic: string): StateLicense => {
  const match = lic.match(/^(\w{2})\s*-\s*#?(.+)$/);
  if (match) return { state: match[1], number: match[2] };
  return { state: "", number: lic };
};

const formatLicense = (sl: StateLicense) => `${sl.state} - #${sl.number}`;

const formatPhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const d = digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");



export default function Admin() {
  const { data, updateData } = useAgentData();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<AgentData>({ ...data });
  const [saved, setSaved] = useState(false);
  const [licenses, setLicenses] = useState<StateLicense[]>(
    data.stateLicenses.map(parseLicense)
  );
  const [generatingTestimonials, setGeneratingTestimonials] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentSlug, setAgentSlug] = useState<string | null>(null);
  const [agencySlug, setAgencySlug] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/agent-admin/login");
      return;
    }

    const loadAgent = async () => {
      setLoadingProfile(true);
      const { data: existingAgent, error } = await supabase
        .from("agents")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        toast.error("Unable to load your profile.");
        setLoadingProfile(false);
        return;
      }

      if (existingAgent) {
        const loadedForm: AgentData = {
          name: existingAgent.name,
          firstName: existingAgent.first_name,
          lastName: existingAgent.last_name,
          phone: existingAgent.phone,
          email: existingAgent.email,
          agency: existingAgent.agency,
          npn: existingAgent.npn,
          bio: existingAgent.bio,
          shortBio: existingAgent.short_bio,
          headshotUrl: existingAgent.headshot_url,
          calendarUrl: existingAgent.calendar_url,
          stateLicenses: existingAgent.state_licenses as string[],
          testimonials: existingAgent.testimonials as { quote: string; name: string }[],
        };
        setAgentId(existingAgent.id);
        setAgentSlug(existingAgent.slug);
        setAgencySlug(existingAgent.agency_slug);
        setForm(loadedForm);
        setLicenses(loadedForm.stateLicenses.map(parseLicense));
        updateData(loadedForm);
      }

      setLoadingProfile(false);
    };

    void loadAgent();
  }, [user, authLoading, navigate, updateData]);


  const set = (field: keyof AgentData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setNameField = (field: "firstName" | "lastName", value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      updated.name = `${updated.firstName} ${updated.lastName}`.trim();
      return updated;
    });
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneInput(value);
    setForm((prev) => ({ ...prev, phone: formatted }));
  };

  const handleHeadshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, headshotUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be signed in to save.");
      return;
    }
    const updatedForm = {
      ...form,
      stateLicenses: licenses
        .filter((l) => l.state && l.number)
        .map(formatLicense),
    };

    const nextAgentSlug = slugify(updatedForm.name);
    const nextAgencySlug = slugify(updatedForm.agency);

    if (!nextAgentSlug || !nextAgencySlug) {
      toast.error("First name, last name, and agency are required before saving.");
      return;
    }

    setSavingProfile(true);
    try {
      const profile = {
        user_id: user.id,
        slug: nextAgentSlug,
        agency_slug: nextAgencySlug,
        name: updatedForm.name,
        first_name: updatedForm.firstName,
        last_name: updatedForm.lastName,
        phone: updatedForm.phone,
        email: updatedForm.email,
        agency: updatedForm.agency,
        npn: updatedForm.npn,
        bio: updatedForm.bio,
        short_bio: updatedForm.shortBio,
        headshot_url: updatedForm.headshotUrl,
        calendar_url: updatedForm.calendarUrl,
        state_licenses: updatedForm.stateLicenses,
        testimonials: updatedForm.testimonials,
      };
      // user_id has a partial unique index, which PostgREST cannot infer for
      // an onConflict upsert. Update the loaded, owned row explicitly.
      const query = agentId
        ? supabase.from("agents").update(profile).eq("id", agentId).eq("user_id", user.id)
        : supabase.from("agents").insert(profile);
      const { data: persistedAgent, error } = await query.select("id, slug, agency_slug").single();

      if (error) throw error;

      updateData(updatedForm);
      setAgentId(persistedAgent.id);
      setAgentSlug(persistedAgent.slug);
      setAgencySlug(persistedAgent.agency_slug);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Profile saved.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile. Please check your admin session.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Licenses
  const addLicense = () => setLicenses((prev) => [...prev, { state: "", number: "" }]);
  const removeLicense = (i: number) => setLicenses((prev) => prev.filter((_, idx) => idx !== i));
  const updateLicense = (i: number, field: keyof StateLicense, value: string) => {
    setLicenses((prev) => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
  };

  // Testimonials
  const updateTestimonial = (index: number, field: "quote" | "name", value: string) => {
    const updated = [...form.testimonials];
    updated[index] = { ...updated[index], [field]: value };
    setForm((prev) => ({ ...prev, testimonials: updated }));
  };
  const addTestimonial = () =>
    setForm((prev) => ({ ...prev, testimonials: [...prev.testimonials, { quote: "", name: "" }] }));
  const removeTestimonial = (index: number) =>
    setForm((prev) => ({ ...prev, testimonials: prev.testimonials.filter((_, i) => i !== index) }));

  const generateTestimonials = async () => {
    setGeneratingTestimonials(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-testimonials", {
        body: { agentName: form.name, bio: form.bio },
      });
      if (error) throw error;
      if (result?.testimonials) {
        setForm((prev) => ({ ...prev, testimonials: result.testimonials }));
        toast.success("Fictional samples generated. Replace them with authentic client feedback before publishing.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate testimonials. Please try again.");
    } finally {
      setGeneratingTestimonials(false);
    }
  };

  const availableStates = US_STATES.filter(
    (s) => !licenses.some((l) => l.state === s)
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Site
          </button>
          <h1 className="text-lg font-bold text-foreground">Agent Dashboard</h1>
          <div className="flex items-center gap-2">
            {agencySlug && agentSlug && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/${agencySlug}/${agentSlug}`, "_blank")}
              >
                <ExternalLink size={14} />
                View
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/agent-admin/login");
              }}
            >
              <LogOut size={14} />
              Sign out
            </Button>
            <Button onClick={handleSave} variant="hero" size="default" disabled={loadingProfile || savingProfile}>
              {savingProfile ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
              {savingProfile ? "Saving..." : saved ? "Saved!" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {loadingProfile ? (
        <div className="container flex max-w-2xl items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading saved profile...
        </div>
      ) : (
        <div className="container max-w-2xl py-10 space-y-10">
          <IntakeRequestsPanel />
          {/* Personal Info */}
          <Section title="Personal Information">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name">
                <Input value={form.firstName} onChange={(e) => setNameField("firstName", e.target.value)} />
              </Field>
              <Field label="Last Name">
                <Input value={form.lastName} onChange={(e) => setNameField("lastName", e.target.value)} />
              </Field>
            </div>
            <Field label="Display Name">
              <Input value={form.name} disabled className="bg-muted text-muted-foreground" />
            </Field>
            <Field label="Phone Number">
              <Input
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(555) 814-2937"
              />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Agency Name">
              <Input value={form.agency} onChange={(e) => set("agency", e.target.value)} placeholder="e.g. Rivera Insurance Group" />
            </Field>
            <Field label="Calendar Booking URL">
              <Input value={form.calendarUrl} onChange={(e) => set("calendarUrl", e.target.value)} placeholder="https://calendly.com/..." />
            </Field>
            <Field label="Headshot Photo">
              <div className="flex items-center gap-4">
                {form.headshotUrl && (
                  <img
                    src={form.headshotUrl}
                    alt="Headshot preview"
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
                  />
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleHeadshotUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload size={16} />
                    {form.headshotUrl ? "Change Photo" : "Upload Photo"}
                  </Button>
                </div>
              </div>
            </Field>
          </Section>

          {/* Bio */}
          <Section title="Bio & About">
            <Field label="Short Bio (under profile photo)">
              <Textarea value={form.shortBio} onChange={(e) => set("shortBio", e.target.value)} rows={3} />
            </Field>
            <Field label="About Me">
              <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={6} />
            </Field>
          </Section>

          {/* Credentials */}
          <Section title="Licenses & Credentials">
            <Field label="National Producer Number (NPN)">
              <Input value={form.npn} onChange={(e) => set("npn", e.target.value)} />
            </Field>
            <div className="space-y-3">
              <Label className="text-sm text-muted-foreground">State Licenses</Label>
              {licenses.map((lic, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={lic.state}
                    onChange={(e) => updateLicense(i, "state", e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">State</option>
                    {[...(lic.state ? [lic.state] : []), ...availableStates].sort().map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <Input
                    value={lic.number}
                    onChange={(e) => updateLicense(i, "number", e.target.value)}
                    placeholder="License #"
                    className="flex-1"
                  />
                  <button
                    onClick={() => removeLicense(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <Button variant="outline" onClick={addLicense} className="w-full">
                <Plus size={16} />
                Add State License
              </Button>
            </div>
          </Section>

          {/* Testimonials */}
          <Section title="Client Testimonials">
            <div className="space-y-6">
              <Button
                variant="outline"
                onClick={generateTestimonials}
                disabled={generatingTestimonials}
                className="w-full border-accent text-accent hover:bg-accent/10"
              >
                {generatingTestimonials ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generatingTestimonials ? "Generating..." : "Generate sample testimonials"}
              </Button>
              {form.testimonials.map((t, i) => (
                <div key={i} className="rounded-xl bg-card p-5 ring-1 ring-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Testimonial {i + 1}</span>
                    <button
                      onClick={() => removeTestimonial(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <Field label="Client Name">
                    <Input value={t.name} onChange={(e) => updateTestimonial(i, "name", e.target.value)} placeholder="Sarah M." />
                  </Field>
                  <Field label="Quote">
                    <Textarea value={t.quote} onChange={(e) => updateTestimonial(i, "quote", e.target.value)} rows={3} />
                  </Field>
                </div>
              ))}
              <Button variant="outline" onClick={addTestimonial} className="w-full">
                <Plus size={16} />
                Add Testimonial
              </Button>
            </div>
          </Section>

          <Button onClick={handleSave} variant="hero" size="lg" className="w-full" disabled={savingProfile}>
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
            {savingProfile ? "Saving..." : saved ? "Saved!" : "Save All Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <div className="mt-1.5 h-0.5 w-10 rounded-full bg-accent" />
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
