import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicAgent, buildProfileMetadata } from './agentPreview';
afterEach(()=>vi.unstubAllGlobals());
describe('public metadata scope',()=>{
 it('uses public fields only and excludes unpublished agents at the REST boundary',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify([]),{status:200})); vi.stubGlobal('fetch',fetcher);
  expect(await getPublicAgent('example-life','jordan-example')).toBeNull();
  const url=new URL(fetcher.mock.calls[0][0]);
  expect(url.searchParams.get('is_published')).toBe('eq.true');
  expect(url.searchParams.get('select')).toBe('name,agency,headshot_url,updated_at');
  expect(url.searchParams.get('agency_slug')).toBe('eq.example-life');
  expect(url.searchParams.get('slug')).toBe('eq.jordan-example');
 });
 it('versions the photo URL without changing the canonical shared profile link',()=>{
  const html=buildProfileMetadata('<head><title>Generic</title></head>',{name:'Jordan Example',agency:'Example Life',headshot_url:'',updated_at:'2026-10-17T00:00:00Z'},'https://www.underwriterverified.com/example-life/jordan-example','https://www.underwriterverified.com/api/agent-photo?agency=example-life&agent=jordan-example');
  expect(html).toContain('v=2026-10-17T00%3A00%3A00Z');
  expect(html).toContain('rel="canonical" href="https://www.underwriterverified.com/example-life/jordan-example"');
 });
});
