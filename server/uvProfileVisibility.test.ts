import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicAgent, buildProfileMetadata } from './agentPreview';
afterEach(()=>vi.unstubAllGlobals());
describe('public metadata scope',()=>{
 it('uses public fields only and excludes unpublished agents at the REST boundary',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify([]),{status:200})); vi.stubGlobal('fetch',fetcher);
  expect(await getPublicAgent('example-life','jordan-example')).toBeNull();
  const url=new URL(fetcher.mock.calls[0][0]);
  expect(url.searchParams.get('is_published')).toBe('eq.true');
  expect(url.searchParams.get('select')).toBe('name,agency,headshot_url,updated_at,contact_card_only,profile_verified');
  expect(url.searchParams.get('agency_slug')).toBe('eq.example-life');
  expect(url.searchParams.get('slug')).toBe('eq.jordan-example');
 });
 it.each([true,false,undefined,'true'])('only exposes an explicit server verification boolean: %s',async(value)=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify([{name:'Jordan Example',agency:'Example Life',headshot_url:'',contact_card_only:true,profile_verified:value}]),{status:200})));
  const agent=await getPublicAgent('example-life','jordan-example');
  expect(agent?.profile_verified).toBe(value===true);
  const html=buildProfileMetadata('<head><title>Generic</title></head>',agent!,'https://www.underwriterverified.com/example-life/jordan-example','https://www.underwriterverified.com/photo.png');
  expect(html.includes('✅ Agent Verified')).toBe(value===true);
 });
 it('versions the photo URL without changing the canonical shared profile link',()=>{
  const html=buildProfileMetadata('<head><title>Generic</title></head>',{name:'Jordan Example',agency:'Example Life',headshot_url:'',updated_at:'2026-10-17T00:00:00Z'},'https://www.underwriterverified.com/example-life/jordan-example','https://www.underwriterverified.com/api/agent-photo?agency=example-life&agent=jordan-example');
  expect(html).toContain('v=2026-10-17T00%3A00%3A00Z');
  expect(html).toContain('rel="canonical" href="https://www.underwriterverified.com/example-life/jordan-example"');
 });
});
