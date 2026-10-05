import { Link } from "react-router-dom";
import { useLegalPaths } from "@/hooks/useLegalPaths";

interface LegalNavLinksProps {
  className?: string;
  privacyHref?: string;
  termsHref?: string;
}

export default function LegalNavLinks({ className, privacyHref, termsHref }: LegalNavLinksProps) {
  const legal = useLegalPaths();
  const privacy = privacyHref ?? legal.privacy;
  const terms = termsHref ?? legal.terms;

  return (
    <nav className={className ?? "flex items-center justify-center gap-4 text-xs text-muted-foreground"}>
      <Link to={privacy} className="hover:text-accent transition-colors underline-offset-4 hover:underline">
        Privacy Policy
      </Link>
      <span aria-hidden="true">·</span>
      <Link to={terms} className="hover:text-accent transition-colors underline-offset-4 hover:underline">
        Terms and Conditions
      </Link>
    </nav>
  );
}
