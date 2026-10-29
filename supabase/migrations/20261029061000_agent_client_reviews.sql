-- Independent client review system. Does not alter A2P, consent, licenses or AgentFlow data.
-- Public users may READ published reviews, never write or moderate them directly.
CREATE TABLE public.agent_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 1000),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden')),
  request_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_reviews_agent_published_recent_idx
  ON public.agent_reviews(agent_id, created_at DESC) WHERE status='published';
CREATE INDEX agent_reviews_agent_recent_idx ON public.agent_reviews(agent_id,created_at DESC);
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT (id,agent_id,rating,comment,status,created_at) ON public.agent_reviews TO anon,authenticated;
CREATE POLICY "Visitors see published reviews for published agents"
  ON public.agent_reviews FOR SELECT TO anon, authenticated
  USING (
    status='published' AND EXISTS (
      SELECT 1 FROM public.agents a WHERE a.id=agent_id AND a.is_published
    )
  );
CREATE POLICY "Owners inspect reviews on their own profile"
  ON public.agent_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a WHERE a.id=agent_id AND a.user_id=(SELECT auth.uid())
    )
  );

-- Accurate aggregate; SECURITY INVOKER keeps the underlying reviews' RLS in force.
CREATE VIEW public.agent_review_summary WITH (security_invoker=true) AS
  SELECT agent_id, count(*)::integer AS review_count,
         round(avg(rating)::numeric,1) AS average_rating
  FROM public.agent_reviews WHERE status='published'
  GROUP BY agent_id;
REVOKE ALL ON public.agent_review_summary FROM PUBLIC;
GRANT SELECT ON public.agent_review_summary TO anon,authenticated;

-- Hashed rate-limit identifiers are not exposed through the Data API.
CREATE TABLE private.agent_review_limits (
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  last_submitted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(agent_id,fingerprint)
);
ALTER TABLE private.agent_review_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.agent_review_limits FROM PUBLIC,anon,authenticated,service_role;

-- The public RPC is ONLY executable with the Edge Function's service-role key.
-- Each invocation is atomic; the advisory transaction lock prevents duplicate
-- concurrent submissions and races around the per-agent daily limit.
CREATE FUNCTION public.record_agent_review_v1(
  p_agent_id uuid,
  p_rating smallint,
  p_comment text,
  p_fingerprint text,
  p_request_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  existing_id uuid;
  touched_at timestamptz;
  new_id uuid;
  normalized_comment text := btrim(coalesce(p_comment,''));
BEGIN
  IF p_agent_id IS NULL OR p_request_id IS NULL OR p_rating IS NULL
    OR p_rating NOT BETWEEN 1 AND 5
    OR char_length(normalized_comment)>1000
    OR p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$'
  THEN RAISE EXCEPTION 'review_invalid' USING ERRCODE='22023'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_agent_id::text));
  SELECT id INTO existing_id FROM public.agent_reviews WHERE request_id=p_request_id;
  IF FOUND THEN RETURN existing_id; END IF;

  PERFORM 1 FROM public.agents WHERE id=p_agent_id AND is_published FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'review_unavailable' USING ERRCODE='22023'; END IF;
  IF (SELECT count(*) FROM public.agent_reviews WHERE agent_id=p_agent_id
    AND created_at >= now() - interval '24 hours') >= 50
  THEN RAISE EXCEPTION 'review_rate_limited' USING ERRCODE='P0001'; END IF;

  INSERT INTO private.agent_review_limits(agent_id,fingerprint,last_submitted_at)
    VALUES(p_agent_id,p_fingerprint,now())
    ON CONFLICT (agent_id,fingerprint)
      DO UPDATE SET last_submitted_at=excluded.last_submitted_at
      WHERE private.agent_review_limits.last_submitted_at <= now()-interval '24 hours'
    RETURNING last_submitted_at INTO touched_at;
  IF touched_at IS NULL THEN RAISE EXCEPTION 'review_rate_limited' USING ERRCODE='P0001'; END IF;

  INSERT INTO public.agent_reviews(agent_id,rating,comment,request_id)
    VALUES(p_agent_id,p_rating,normalized_comment,p_request_id)
    RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_agent_review_v1(uuid,smallint,text,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_agent_review_v1(uuid,smallint,text,text,uuid)
  TO service_role;
