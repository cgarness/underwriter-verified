#!/usr/bin/env node
// Offline preparation only. This script never connects to either database.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const [snapshotPath, outputDirectory] = process.argv.slice(2);
if (!snapshotPath || !outputDirectory) {
  throw new Error('Usage: node scripts/prepare-supabase-transfer.mjs SOURCE_SNAPSHOT.json NEW_OUTPUT_DIRECTORY');
}
const root = fileURLToPath(new URL('../', import.meta.url));
const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
const expectedSource = 'rtgmdbqzkwlmplurypyh';
const destinationOrganization = 'bmuykmwtwicpltmpenqm';
if (snapshot.format !== 'underwriter-verified-source-snapshot-v1'
  || snapshot.source?.supabase_project_ref !== expectedSource
  || snapshot.destination_organization_id !== destinationOrganization
  || snapshot.counts?.agents !== 1 || snapshot.agents?.length !== 1
  || snapshot.counts?.auth_users !== 0 || snapshot.counts?.auth_identities !== 0
  || snapshot.counts?.storage_buckets !== 0 || snapshot.counts?.storage_objects !== 0) {
  throw new Error('Source inventory differs from the reviewed one-profile, empty-auth/storage migration. Reinspect it.');
}
const agent = snapshot.agents[0];
if (agent.id !== 'e7c2f35a-e215-4e9e-9492-176a344384eb'
  || agent.agency_slug !== 'cg-financial' || agent.slug !== 'christopher-garness'
  || agent.user_id !== null || !agent.headshot_url) {
  throw new Error('Canonical profile changed; stop and review before transfer.');
}

// Reuse reviewed SQL, excluding historical public-write policies. Apply the
// ownership correction before intake exists. One transaction hides all intermediate states.
const migrationFiles = [
  '20260413234020_b0f956fb-25e5-4b74-aaff-bb023fc934c1.sql',
  '20260415225049_1e995c50-57d0-4706-8fe7-74a0ab279f73.sql',
  '20260506175748_d67edb75-8739-45a5-b6e7-2a5959ce78c2.sql',
  '20260506175802_a21407f8-7bb2-4999-a3f3-e1f27e1abc96.sql',
  '20260929203000_lock_agent_ownership.sql',
  '20260929183000_public_intake_and_sms_consent.sql',
];
const hash = value => createHash('sha256').update(value).digest('hex');
const manifest = {
  source: snapshot.source,
  sourceCapturedAt: snapshot.captured_at,
  destinationOrganization,
  destinationProject: null,
  status: 'prepared-not-applied',
  agentId: agent.id,
  sourceAgentSha256: hash(JSON.stringify(agent)),
  headshotSha256: hash(agent.headshot_url),
  migrations: [],
};
let sql = `-- ONLY for a brand-new empty project in Underwriter Verified (${destinationOrganization}).
-- Never run against the source or AgentFlow. Verify the project organization externally.
-- Execute this complete file with Supabase apply_migration (one atomic transaction).
-- For SQL Editor/psql, wrap the COMPLETE file in BEGIN; ... COMMIT;.
-- This file contains the existing public profile, including its original image and timestamps.
SET LOCAL lock_timeout = '5s';
SET LOCAL standard_conforming_strings = on;
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public')
     OR EXISTS (SELECT 1 FROM auth.users)
     OR EXISTS (SELECT 1 FROM storage.buckets)
     OR EXISTS (SELECT 1 FROM storage.objects) THEN
    RAISE EXCEPTION 'Destination is not empty; aborting. Never use this bootstrap on an existing project.';
  END IF;
END
$guard$;
`;
for (const filename of migrationFiles) {
  const contents = await fs.readFile(path.join(root, 'supabase/migrations', filename), 'utf8');
  manifest.migrations.push({ filename, sha256: hash(contents) });
  sql += `\n-- Source: ${filename}\n${contents}\n`;
}
// Copy, never upsert: unexpected existing records must fail without overwriting them.
// Quoted JSON plus standard_conforming_strings preserves quotes/backslashes safely.
const records = JSON.stringify(snapshot.agents).replaceAll("'", "''");
sql += `\nGRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.agents, public.us_state_names, public.sms_disclosure_versions,
  public.intake_requests, public.sms_consent_events, public.sms_suppressions TO service_role;
INSERT INTO public.agents SELECT * FROM jsonb_populate_recordset(NULL::public.agents, '${records}'::jsonb);
DO $verify$
BEGIN
  IF has_table_privilege('anon','public.agents','INSERT')
     OR has_table_privilege('anon','public.agents','UPDATE')
     OR has_table_privilege('anon','public.agents','DELETE')
     OR has_table_privilege('authenticated','public.agents','TRUNCATE') THEN
    RAISE EXCEPTION 'Unexpected profile grants';
  END IF;
  IF (SELECT count(*) FROM public.agents) <> 1
     OR EXISTS (SELECT 1 FROM public.agents WHERE user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Unexpected profile count or ownership';
  END IF;
END
$verify$;
`;
manifest.bootstrapSha256 = hash(sql);
await fs.mkdir(outputDirectory, { mode: 0o700 });
await fs.writeFile(path.join(outputDirectory, 'bootstrap.sql'), sql, { mode: 0o600 });
await fs.writeFile(path.join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ outputDirectory: path.resolve(outputDirectory), bytes: Buffer.byteLength(sql), bootstrapSha256: manifest.bootstrapSha256, migrations: migrationFiles.length }));
