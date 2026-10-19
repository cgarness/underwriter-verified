import { PublicAgentDataProvider, type AgentData } from "@/contexts/AgentDataContext";
import AgentProfileLayout from "./AgentProfileLayout";

/** Shared UV design, retaining direct-contact-only capabilities. */
export default function ManagedContactCard({ agent }: { agent: AgentData }) {
  return <PublicAgentDataProvider data={agent}><AgentProfileLayout /></PublicAgentDataProvider>;
}
