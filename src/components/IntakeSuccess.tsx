import { CheckCircle } from "lucide-react";
import type { IntakeFormSource } from "@/lib/submitPublicIntake";

export default function IntakeSuccess({
  formSource,
  agentName,
}: {
  formSource: IntakeFormSource;
  agentName: string;
}) {
  const detail =
    formSource === "call_request"
      ? `${agentName} has your request for a call. This is not a confirmed appointment. A time still has to be scheduled with you.`
      : `${agentName} has your quote request. This is not a confirmed appointment.`;

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <CheckCircle className="h-16 w-16 text-accent" aria-hidden="true" />
      <h2 className="text-2xl font-bold text-foreground">Request saved</h2>
      <p className="text-muted-foreground">{detail}</p>
      <p className="text-sm text-muted-foreground">
        If you left both text-message boxes unchecked, this request did not add SMS permission.
      </p>
    </div>
  );
}
