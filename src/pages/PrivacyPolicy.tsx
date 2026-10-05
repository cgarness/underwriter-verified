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

const PrivacyPolicy: React.FC = () => {
  const { brand, scoped, profileHref, isLoading, notFound } = useLegalBrand();
  const { terms } = useLegalPaths();
  usePageTitle(`Privacy Policy | ${brand.agency}`);

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
        <p className="text-muted-foreground">The privacy policy you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl p-6 sm:p-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy for {brand.agency}</h1>
          <p className="text-sm text-muted-foreground">Effective Date: {PRIVACY_EFFECTIVE_LABEL}</p>
          <p className="text-sm text-muted-foreground">
            This version replaces the {PRIOR_POLICY_EFFECTIVE_LABEL} policy. The two separate,
            optional SMS choices remain unchanged; this update clarifies mobile-information
            non-sharing and the limited processing needed for requested services and permitted texts.
          </p>
        </header>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {brand.agency} ("we," "us," or "our"), operated by {brand.name}, is committed to
          protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard
          your personal information when you interact with us through our website, forms, phone,
          email, and SMS communications.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
          <p className="text-sm text-muted-foreground">We collect personal information that you voluntarily provide, including:</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Full name</li>
            <li>Phone number</li>
            <li>Email address</li>
            <li>Mailing address</li>
            <li>Date of birth</li>
            <li>Information related to your life insurance needs and inquiries</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
          <p className="text-sm text-muted-foreground">We use your information to:</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Provide life insurance quotes and policy information</li>
            <li>Schedule and confirm appointments</li>
            <li>Send transactional and customer service communications</li>
            <li>Send marketing and promotional communications (where consent is given)</li>
            <li>Comply with legal and regulatory requirements</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">3. SMS Messaging &amp; A2P Compliance</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Quote and call forms offer two optional, unchecked SMS choices. Checking the
            informational box is permission for recurring informational SMS/MMS from {brand.name} and{" "}
            {brand.agency} about the quote you requested, appointments, and application or policy
            updates. Checking the marketing box is separate permission for recurring marketing
            SMS/MMS about life insurance products and coverage reviews. Leaving a box unchecked does
            not grant that type of text. Providing a phone number, requesting a call, or reading
            these policies does not grant either text permission.
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Message frequency varies</li>
            <li>Message and data rates may apply</li>
            <li>Reply <strong>STOP</strong> to opt out of text messages you receive</li>
            <li>
              Reply <strong>HELP</strong> for help, or contact us at {brand.phone} or{" "}
              <a href={`mailto:${brand.email}`} className="underline underline-offset-2 hover:text-accent">
                {brand.email}
              </a>
            </li>
            <li>SMS consent is not required to request a quote, request a call, or purchase insurance</li>
            <li>{CARRIER_LIABILITY_STATEMENT}</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When a request is saved, we store the contact details you submitted and the two SMS
            choices separately, with the time of the save and the disclosure text shown on the form.
            This website does not send text messages. A checked box records the choice. It does not
            start a text, and it does not remove an opt-out once one is on file for that number and
            sender.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If texts are sent later, a delivery provider such as Twilio may process the mobile number
            only to transmit a message that the stored choice and any opt-out allow. That processing
            is not a sale of your number and is not permission for another brand to text you.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>{SMS_NON_SHARING_STATEMENT}</strong>{" "}
            Text messaging originator opt-in data and consent are excluded from every sharing
            category below. We do not share that information with third parties or affiliates for
            their marketing or promotional purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">4. Phone &amp; Email Communications</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Submitting a quote or call request asks {brand.name} to contact you about that request.
            It is not a confirmed appointment, and it is not permission for recurring marketing
            email, prerecorded calls, or autodialed calls. This form does not enroll you in
            marketing email.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">5. Information Sharing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We do <strong>not</strong> sell, rent, or trade your personal information.
          </p>
          <p className="text-sm text-muted-foreground">We may share your information only in the following limited circumstances:</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>With licensed insurance carriers, when needed to obtain a quote or complete underwriting you asked for. This does not include selling or transferring SMS consent.</li>
            <li>With a messaging provider, when one is connected, only to transmit a text the stored choice and any opt-out allow</li>
            <li>With government or regulatory authorities when required by law</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            These limited processing disclosures do not transfer SMS consent or authorize any
            carrier, messaging provider, third party, or affiliate to use your mobile information or
            SMS consent for its own marketing or promotional messages.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">6. Data Security</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We implement reasonable administrative, technical, and physical safeguards to protect
            your personal information from unauthorized access, disclosure, or misuse.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">7. Your Privacy Rights (California Residents)</h2>
          <p className="text-sm text-muted-foreground">If you are a California resident, you have the right to:</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Request access to the personal information we collect about you</li>
            <li>Request deletion of your personal information</li>
            <li>Request information about how your data is used</li>
          </ul>
          <p className="text-sm text-muted-foreground">We do not sell your personal information.</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To exercise your rights, contact us at{" "}
            <a href={`mailto:${brand.email}`} className="underline underline-offset-2 hover:text-accent">
              {brand.email}
            </a>{" "}
            or {brand.phone}.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">8. Changes to This Privacy Policy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. Any changes will be reflected by
            updating the effective date above.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">9. Contact Information</h2>
          <BrandContactBlock brand={brand} />
        </section>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {scoped && (
            <Link to={profileHref} className="underline underline-offset-2 hover:text-accent">
              Back to profile
            </Link>
          )}
          <Link to={terms} className="underline underline-offset-2 hover:text-accent">
            Terms and Conditions
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
