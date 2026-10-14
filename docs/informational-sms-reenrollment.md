# Informational SMS re-enrollment — October 14, 2026

ClearPath's owner authorized restoring informational texts to his own alert number after being told that an earlier STOP blocked the test. Marketing permission was not authorized.

The original suppression row and website consent evidence remain unchanged. A private append-only event records the new authorization. Only a database administrator can insert restoration events; browser and service roles have no table privileges. The existing eligibility RPC remains service-only.

Repeated STOP requests now append a new event even when the original suppression row already exists, so they override prior restoration. Provider blocks remain blocking. Restoration requires an existing informational grant and never enables marketing. Administrative restoration must lock the original suppression row, verify identity and current evidence, and record the explicit authorization. There is no public re-enrollment endpoint or automatic START handling.

Validation: production transaction with full rollback passed eight assertions: initial STOP block, informational restoration, marketing stays blocked, repeated STOP blocks again, provider block cannot be overridden, original evidence unchanged, no client/service write privileges, and audit mutation rejected. The migration was then applied and the separately authorized restoration recorded. Read-back: informational allowed, marketing suppressed. Security advisor: private RLS-without-policy is intentional deny-all; no new function-execution warning.

No Twilio number, messaging service, registration, or consent disclosure was modified. Provider-level STOP may still require the owner to text START; delivery must be independently verified before enabling automatic alerts.
