import React from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useLegalBrand } from "@/hooks/useLegalBrand";
import { useLegalPaths } from "@/hooks/useLegalPaths";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  CARRIER_LIABILITY_STATEMENT,
  PRIOR_POLICY_EFFECTIVE_LABEL,
  PRIVACY_EFFECTIVE_LABEL,
  SMS_NON_SHARING_STATEMENT,
} from "@/lib/a2pBrand";
import BrandContactBlock from "@/components/BrandContactBlock";

const TermsAndConditions: React.FC = () => {
  const { brand, scoped, profileHref, isLoading, notFound } = useLegalBrand();
  const { privacy } = useLegalPaths();
  usePageTitle(`Terms and Conditions | ${brand.agency}`);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">Agent Not Found</h1>
        <p className="text-muted-foreground">The terms page you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl p-6 sm:p-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Terms and Conditions for {brand.agency}</h1>
          <p className="text-sm text-muted-foreground">Effective Date: {PRIVACY_EFFECTIVE_LABEL}</p>
          <p className="text-sm text-muted-foreground">
            This version replaces the {PRIOR_POLICY_EFFECTIVE_LABEL} terms. The two separate,
            optional SMS choices remain unchanged; this update clarifies that a call request alone
            does not authorize SMS and strengthens the mobile-information non-sharing language.
          </p>
        </header>

        <p className="text-sm text-muted-foreground leading-relaxed">
          These Terms and Conditions ("Terms") govern your access to and use of services provided by
          {` ${brand.name} and ${brand.agency} `}
          ("we," "us," or "our"), including our website, forms, phone, email, and SMS communications.
          By accessing our website or submitting your information, you agree to these Terms.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By accessing this website, submitting any form, or otherwise communicating with us, you
            acknowledge that you have read, understood, and agree to be bound by these Terms. If you
            do not agree, please discontinue use of our services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">2. Services Provided</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {brand.name} and {brand.agency} provide independent life insurance consulting
            services. We help individuals find and apply for life insurance products offered by
            licensed insurance carriers. We do not underwrite or issue insurance policies, and we do
            not guarantee approval for any insurance product.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">3. SMS Communications</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The <strong>{brand.agency} Messaging Program</strong> is operated by {brand.name} and{" "}
            {brand.agency}. Informational texts and marketing texts are separate optional choices on
            the quote form and the call-request form. Informational texts cover the quote you
            requested, appointments, and application or policy updates. Marketing texts cover life
            insurance products and coverage reviews. Neither box is required to submit the form.
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Message frequency varies</li>
            <li>Message and data rates may apply</li>
            <li>Reply <strong>STOP</strong> to opt out</li>
            <li>Reply <strong>HELP</strong> for help</li>
            <li>SMS consent is not required to request a quote, request a call, or purchase insurance</li>
            <li>{CARRIER_LIABILITY_STATEMENT}</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A saved request stores each SMS choice on its own. This website does not send text
            messages. Checking a box does not confirm an appointment and does not erase a STOP or
            other opt-out once that opt-out is recorded for the number and sender.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For customer support, contact us at {brand.phone} or{" "}
            <a href={`mailto:${brand.email}`} className="underline underline-offset-2 hover:text-accent">
              {brand.email}
            </a>
            . Full contact details are listed below.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>{SMS_NON_SHARING_STATEMENT}</strong>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">4. Phone &amp; Email Communications</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A call request by itself asks us to contact you about scheduling a call. It is not a
            confirmed appointment, and by itself it does not authorize informational or marketing
            SMS/MMS, marketing email, or prerecorded or autodialed calls. If you separately select
            one of the optional SMS checkboxes described in Section 3, that checkbox grants only the
            corresponding SMS permission stated there.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">5. No Professional Advice</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The information on this website is for general informational purposes only and does not
            constitute legal, financial, tax, or insurance advice. You should consult with a
            qualified professional before making any decisions based on the information provided.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">6. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {brand.name} and {brand.agency} shall not be liable for any direct, indirect,
            incidental, consequential, or special damages arising from your use of this website or
            our services, to the fullest extent permitted by law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">7. Changes to These Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We reserve the right to update or modify these Terms at any time. Any changes will be
            reflected by updating the effective date above. Your continued use of our services after
            changes are posted constitutes your acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">8. Contact Information</h2>
          <BrandContactBlock brand={brand} />
        </section>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {scoped && (
            <Link to={profileHref} className="underline underline-offset-2 hover:text-accent">
              Back to profile
            </Link>
          )}
          <Link to={privacy} className="underline underline-offset-2 hover:text-accent">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
