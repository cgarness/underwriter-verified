import { Link } from "react-router-dom";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import {
  SMS_DISCLOSURE_BODY,
  SMS_DISCLOSURE_VERSION_ID,
  SMS_INFORMATIONAL_TEMPLATE,
  SMS_MARKETING_TEMPLATE,
  absoluteLegalUrls,
  renderSmsLabel,
} from "@/lib/smsDisclosure";

interface SmsConsentFieldsProps<T extends FieldValues> {
  control: Control<T>;
  informationalName: FieldPath<T>;
  marketingName: FieldPath<T>;
  agentName: string;
  agencyName: string;
  agencySlug: string;
  agentSlug: string;
  privacyHref: string;
  termsHref: string;
}

export default function SmsConsentFields<T extends FieldValues>({
  control,
  informationalName,
  marketingName,
  agentName,
  agencyName,
  agencySlug,
  agentSlug,
  privacyHref,
  termsHref,
}: SmsConsentFieldsProps<T>) {
  const informational = renderSmsLabel(SMS_INFORMATIONAL_TEMPLATE, agentName, agencyName);
  const marketing = renderSmsLabel(SMS_MARKETING_TEMPLATE, agentName, agencyName);
  const urls = absoluteLegalUrls(agencySlug, agentSlug);

  return (
    <fieldset
      className="mt-8 space-y-4 border-t border-border pt-6"
      data-disclosure-version={SMS_DISCLOSURE_VERSION_ID}
    >
      <legend className="text-sm font-medium text-foreground">Optional text messages</legend>
      <ConsentBox control={control} name={informationalName} label={informational} />
      <ConsentBox control={control} name={marketingName} label={marketing} />
      <div id="sms-disclosures" className="space-y-2 text-xs leading-relaxed text-muted-foreground">
        <p>{SMS_DISCLOSURE_BODY}</p>
        <p>
          Privacy Policy:{" "}
          <Link
            to={privacyHref}
            className="break-all underline underline-offset-2 hover:text-accent"
            onClick={(event) => event.stopPropagation()}
          >
            {urls.privacy}
          </Link>
        </p>
        <p>
          Terms and Conditions:{" "}
          <Link
            to={termsHref}
            className="break-all underline underline-offset-2 hover:text-accent"
            onClick={(event) => event.stopPropagation()}
          >
            {urls.terms}
          </Link>
        </p>
      </div>
    </fieldset>
  );
}

function ConsentBox<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-xl border border-border p-3">
          <FormControl>
            <Checkbox
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              className="mt-0.5 h-5 w-5"
            />
          </FormControl>
          <FormLabel className="text-sm font-normal leading-snug">{label}</FormLabel>
        </FormItem>
      )}
    />
  );
}
