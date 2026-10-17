import { json, readBoundedText, record, SYNC_PATH, validAuthHeaders, verify, type Rpc } from '../_shared/uv-profile/protocol.ts';
import { parseEnvelope } from '../_shared/uv-profile/payload.ts';

export async function handleProfileSync(request: Request, options: { secret: string; rpc: Rpc }): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (![SYNC_PATH, '/agentflow-profile-sync'].includes(url.pathname) || url.search) return json({ error: 'not_found' }, 404);
  if (options.secret.length < 32) return json({ error: 'not_configured' }, 503);
  if (!validAuthHeaders(request.headers)) return json({ error: 'unauthorized' }, 401);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'invalid_body' }, 415);
  let body: string;
  try { body = await readBoundedText(request.body); }
  catch { return json({ error: 'invalid_body' }, 413); }
  if (!await verify(body, request.headers, options.secret)) return json({ error: 'unauthorized' }, 401);
  let envelope;
  try { envelope = parseEnvelope(JSON.parse(body)); }
  catch { return json({ error: 'invalid_profile' }, 400); }
  try {
    const nonce = await options.rpc('consume_agentflow_profile_nonce', {
      p_nonce: request.headers.get('x-uv-nonce'),
      p_sent_at: new Date(Number(request.headers.get('x-uv-timestamp')) * 1000).toISOString(),
    });
    if (nonce.error) return json({ error: 'temporarily_unavailable' }, 503);
    if (nonce.data !== true) return json({ error: 'request_replayed' }, 409);
    const result = await options.rpc('apply_agentflow_profile_v1', {
      p_organization_id: envelope.organization_id, p_profile_id: envelope.profile_id,
      p_version: envelope.version, p_profile: envelope.profile,
    });
    if (result.error) {
      const error = record(result.error) ? result.error : {};
      if (error.code === '40001') return json({ error: 'version_conflict' }, 409);
      if (error.code === '42501') return json({ error: error.message === 'profile_link_required'
        ? 'link_required' : 'configuration_required' }, 403);
      if (error.code === '22023') return json({ error: 'invalid_profile' }, 400);
      return json({ error: 'temporarily_unavailable' }, 503);
    }
    return json(result.data);
  } catch { return json({ error: 'temporarily_unavailable' }, 503); }
}
