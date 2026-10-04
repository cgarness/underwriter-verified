import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import IntakeTextField from "@/components/IntakeTextField";
import { usePublicIntake } from "@/hooks/usePublicIntake";
import { canSubmitPublicIntake, INTAKE_PREVIEW_MESSAGE } from "@/lib/intakeEnvironment";
import type { IntakeFormSource } from "@/lib/submitPublicIntake";
import SmsConsentFields from "@/components/SmsConsentFields";
import IntakeSuccess from "@/components/IntakeSuccess";
import { US_STATES } from "@/lib/usStates";

const phoneRegex = /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;

const intakeSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  phone: z.string().trim().min(1, "Phone number is required").regex(phoneRegex, "Enter a valid US phone number"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(255),
  state: z.string().optional(),
  informationalConsent: z.boolean(),
  marketingConsent: z.boolean(),
  faxNumber: z.string().optional(),
});

type IntakeFormValues = z.infer<typeof intakeSchema>;

interface PublicIntakeFormProps {
  formSource: IntakeFormSource;
  pagePath: string;
  agentName: string;
  agencyName: string;
  agencySlug: string;
  agentSlug: string;
  privacyHref: string;
  termsHref: string;
  includeState: boolean;
  submitLabel: string;
}

export default function PublicIntakeForm({
  formSource,
  pagePath,
  agentName,
  agencyName,
  agencySlug,
  agentSlug,
  privacyHref,
  termsHref,
  includeState,
  submitLabel,
}: PublicIntakeFormProps) {
  const intakeEnabled = canSubmitPublicIntake();
  const { status, errorMessage, submit } = usePublicIntake({
    formSource,
    pagePath,
    agencySlug,
    agentSlug,
  });
  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      state: "",
      informationalConsent: false,
      marketingConsent: false,
      faxNumber: "",
    },
  });

  if (status === "saved") {
    return <IntakeSuccess formSource={formSource} agentName={agentName} />;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          if (includeState && !values.state) {
            form.setError("state", { message: "Please select a state" });
            return;
          }
          if (values.faxNumber) {
            form.setError("faxNumber", { message: "Check the form and try again." });
            return;
          }
          await submit({
            firstName: values.firstName ?? "",
            lastName: values.lastName ?? "",
            phone: values.phone ?? "",
            email: values.email ?? "",
            state: values.state,
            informationalConsent: values.informationalConsent === true,
            marketingConsent: values.marketingConsent === true,
            faxNumber: values.faxNumber,
          });
        })}
        className="space-y-5"
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <IntakeTextField control={form.control} name="firstName" label="First Name *" placeholder="First Name" />
          <IntakeTextField control={form.control} name="lastName" label="Last Name *" placeholder="Last Name" />
        </div>
        <IntakeTextField control={form.control} name="phone" label="Phone Number *" placeholder="(555) 555-5555" type="tel" />
        <IntakeTextField control={form.control} name="email" label="Email Address *" placeholder="you@example.com" type="email" />
        {includeState && (
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <SmsConsentFields
          control={form.control}
          informationalName="informationalConsent"
          marketingName="marketingConsent"
          agentName={agentName}
          agencyName={agencyName}
          agencySlug={agencySlug}
          agentSlug={agentSlug}
          privacyHref={privacyHref}
          termsHref={termsHref}
        />
        <FormField
          control={form.control}
          name="faxNumber"
          render={({ field }) => (
            <input
              {...field}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />
          )}
        />
        {errorMessage && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errorMessage}
          </p>
        )}
        {!intakeEnabled && <p role="status" className="text-sm text-muted-foreground">{INTAKE_PREVIEW_MESSAGE}</p>}
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={!intakeEnabled || status === "submitting"}>
          {status === "submitting" ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
