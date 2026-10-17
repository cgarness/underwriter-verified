// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseEnvelope, safePhoto } from '../../supabase/functions/_shared/uv-profile/payload';
import { sign, verify, validAuthHeaders, readBoundedText } from '../../supabase/functions/_shared/uv-profile/protocol';
const secret = 'test-only-profile-secret-'.repeat(3);
const env = { schema: 1, organization_id: '10000000-0000-4000-8000-000000000001', profile_id: '20000000-0000-4000-8000-000000000001', version: '1', profile: { published: false } };
async function headers(body: string) {
 const timestamp = String(Math.floor(Date.now()/1000)); const nonce = crypto.randomUUID();
 return new Headers({ 'x-uv-timestamp': timestamp, 'x-uv-nonce': nonce, 'x-uv-signature': await sign(body, secret, timestamp, nonce) });
}
describe('UV profile signed public-data contract', () => {
 it('accepts a minimal tombstone and no extra private fields', () => {
  expect(parseEnvelope(env)).toEqual(env);
  expect(() => parseEnvelope({...env, profile: {published: false, phone:'private'}})).toThrow();
  expect(() => parseEnvelope({...env, service_role:'never allowed'})).toThrow();
 });
 it.each(['0','-1','1.5','9223372036854775808',1])('rejects noncanonical/out-of-range version %s', version => {
  expect(() => parseEnvelope({...env, version})).toThrow();
 });
 it('binds exact body bytes, organization and version', async () => {
  const body=JSON.stringify(env); const h=await headers(body);
  expect(await verify(body,h,secret)).toBe(true);
  expect(await verify(body+' ',h,secret)).toBe(false);
  expect(await verify(JSON.stringify({...env,version:'2'}),h,secret)).toBe(false);
  expect(await verify(body,h,secret+'changed')).toBe(false);
 });
 it('rejects stale timestamps and invalid nonces before work', async () => {
  const h=await headers('{}'); h.set('x-uv-timestamp','1000000000'); expect(validAuthHeaders(h)).toBe(false);
  h.set('x-uv-timestamp',String(Math.floor(Date.now()/1000))); h.set('x-uv-nonce','anything'); expect(validAuthHeaders(h)).toBe(false);
 });
 it('bounds UTF-8 byte length rather than only string characters', async () => {
  await expect(readBoundedText(new Response('éé').body,3)).rejects.toThrow();
  expect(await readBoundedText(new Response('é').body,2)).toBe('é');
 });
 it.each(['data:text/html;base64,PHNjcmlwdD4=','data:image/svg+xml;base64,PHN2Zz4=','http://example.com/a','https://localhost/a','https://localhost./a','https://127.0.0.1/a','https://a:password@example.com/a'])('rejects unsafe image %s', image => expect(safePhoto(image)).toBe(false));
 it('accepts a valid PNG header or public HTTPS photo and no invented fallback', () => {
  expect(safePhoto('')).toBe(true);
  expect(safePhoto('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
  expect(safePhoto('https://images.example.com/agent.png')).toBe(true);
  expect(safePhoto('data:image/jpeg;base64,iVBORw0KGgo=')).toBe(false);
 });
});
