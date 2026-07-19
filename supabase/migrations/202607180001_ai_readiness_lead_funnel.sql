-- Synclaro AI Readiness Micro-Funnel v2 – atomare Baseline
-- Vor Ausführung zwingend auf einer Supabase-Branch testen und separat freigeben.
-- Production hat keine frühere Readiness-Migration angewandt. Übergangsobjekte aus dem ursprünglichen v1-Entwurf
-- werden innerhalb derselben Transaktion finalisiert und sind außerhalb dieser Transaktion nie sichtbar.
-- Bestehende RLS-/Grant-Regeln der CRM-Basistabellen werden bewusst nicht verändert.

begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists public.ai_readiness_assessments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  run_id uuid not null unique,
  session_hash text not null check (session_hash ~ '^[0-9a-f]{64}$'),
  contact_id uuid not null references public.crm_contacts(id) on delete restrict,

  assessment_version text not null,
  privacy_version text not null,
  industry text not null,
  employee_band text not null check (employee_band in ('solo', '1-5', '6-10', '11-20', '21-50', '51+')),
  respondent_role text not null check (respondent_role in ('inhaber', 'geschaeftsfuehrung', 'leitung', 'mitarbeit', 'beratung')),
  primary_goal text not null check (primary_goal in ('zeit', 'wachstum', 'qualitaet', 'wissen', 'klarheit')),
  lead_fit boolean not null,

  answers jsonb not null check (jsonb_typeof(answers) = 'array' and pg_column_size(answers) <= 65536),
  score_total smallint not null check (score_total between 0 and 100),
  score_breakdown jsonb not null check (jsonb_typeof(score_breakdown) = 'object' and pg_column_size(score_breakdown) <= 16384),
  readiness_level text not null,
  analysis_status text not null default 'pending' check (analysis_status in ('pending', 'completed', 'failed')),
  analysis_result jsonb check (analysis_result is null or (jsonb_typeof(analysis_result) = 'object' and pg_column_size(analysis_result) <= 131072)),
  analysis_lease_token uuid,
  analysis_locked_at timestamptz,
  analyzed_at timestamptz,
  check ((analysis_lease_token is null and analysis_locked_at is null) or (analysis_lease_token is not null and analysis_locked_at is not null)),

  attribution jsonb not null default '{}'::jsonb check (jsonb_typeof(attribution) = 'object' and pg_column_size(attribution) <= 16384),
  tracking_subject_hash text not null check (tracking_subject_hash ~ '^[0-9a-f]{64}$'),

  callback_consent_version text not null,
  callback_consent_text text not null,
  callback_consent_hash text not null check (callback_consent_hash ~ '^[0-9a-f]{64}$'),
  callback_consent_granted_at timestamptz not null,
  callback_consent_revoked_at timestamptz,
  ai_consent_version text not null,
  ai_consent_text text not null,
  ai_consent_hash text not null check (ai_consent_hash ~ '^[0-9a-f]{64}$'),
  ai_consent_granted_at timestamptz not null,
  ai_consent_revoked_at timestamptz,
  analytics_consent boolean not null default false,
  analytics_consent_version text,
  analytics_consent_text text,
  analytics_consent_hash text check (analytics_consent_hash is null or analytics_consent_hash ~ '^[0-9a-f]{64}$'),
  analytics_consent_granted_at timestamptz,
  analytics_consent_revoked_at timestamptz,
  marketing_tracking_consent boolean not null default false,
  marketing_consent_version text,
  marketing_consent_text text,
  marketing_consent_hash text check (marketing_consent_hash is null or marketing_consent_hash ~ '^[0-9a-f]{64}$'),
  marketing_consent_granted_at timestamptz,
  marketing_consent_revoked_at timestamptz,
  consent_evidence_ip_hash text check (consent_evidence_ip_hash is null or consent_evidence_ip_hash ~ '^[0-9a-f]{64}$'),
  consent_evidence_user_agent text,

  notification_status text not null default 'pending' check (notification_status in ('pending', 'delivered', 'retry_pending', 'not_configured', 'dead')),
  notification_delivered_at timestamptz,
  telegram_delivery_status text not null default 'pending' check (telegram_delivery_status in ('pending', 'delivered', 'retry_pending', 'not_configured', 'dead')),
  telegram_delivered_at timestamptz,
  meta_delivery_status text not null default 'not_requested' check (meta_delivery_status in ('not_requested', 'pending', 'delivered', 'retry_pending', 'not_configured', 'dead')),
  meta_delivered_at timestamptz,

  created_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  retention_review_at timestamptz not null default (now() + interval '24 months')
);

create index if not exists ai_readiness_assessments_contact_idx on public.ai_readiness_assessments(contact_id, created_at desc);
create index if not exists ai_readiness_assessments_session_idx on public.ai_readiness_assessments(session_hash, created_at desc);
create index if not exists ai_readiness_assessments_campaign_idx on public.ai_readiness_assessments((attribution ->> 'utm_campaign'));
create index if not exists ai_readiness_assessments_pending_idx on public.ai_readiness_assessments(created_at) where analysis_status = 'pending';
create index if not exists ai_readiness_assessments_tracking_subject_idx on public.ai_readiness_assessments(tracking_subject_hash, created_at desc);

create table if not exists private.ai_readiness_tracking_consents (
  id uuid primary key default gen_random_uuid(),
  recorded_seq bigint generated always as identity unique,
  decision_id uuid not null unique,
  assessment_id uuid references public.ai_readiness_assessments(id) on delete set null,
  run_id uuid not null,
  session_hash text not null check (session_hash ~ '^[0-9a-f]{64}$'),
  tracking_subject_hash text not null check (tracking_subject_hash ~ '^[0-9a-f]{64}$'),
  consent_version text not null,
  analytics_consent boolean not null,
  analytics_consent_text text not null,
  analytics_consent_hash text not null check (analytics_consent_hash ~ '^[0-9a-f]{64}$'),
  marketing_consent boolean not null,
  marketing_consent_text text not null,
  marketing_consent_hash text not null check (marketing_consent_hash ~ '^[0-9a-f]{64}$'),
  decided_at timestamptz not null,
  evidence_ip_hash text check (evidence_ip_hash is null or evidence_ip_hash ~ '^[0-9a-f]{64}$'),
  evidence_user_agent text,
  created_at timestamptz not null default now(),
  retention_until timestamptz not null default (now() + interval '24 months'),
  unique (id, run_id, session_hash)
);
create index if not exists ai_readiness_tracking_consents_session_idx on private.ai_readiness_tracking_consents(session_hash, run_id, recorded_seq desc);
create index if not exists ai_readiness_tracking_consents_subject_idx on private.ai_readiness_tracking_consents(tracking_subject_hash, recorded_seq desc);
create index if not exists ai_readiness_tracking_consents_assessment_idx on private.ai_readiness_tracking_consents(assessment_id) where assessment_id is not null;

create table if not exists public.ai_readiness_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique,
  run_id uuid not null,
  session_hash text not null check (session_hash ~ '^[0-9a-f]{64}$'),
  assessment_id uuid references public.ai_readiness_assessments(id) on delete cascade,
  event_name text not null check (event_name in (
    'landing_viewed', 'test_started', 'profile_completed', 'phase_started', 'phase_completed',
    'result_preview_viewed', 'lead_form_viewed', 'lead_form_validation_error',
    'lead_submitted', 'report_viewed', 'calendar_cta_clicked', 'consent_updated',
    'scroll_depth', 'session_duration'
  )),
  step smallint check (step between 0 and 100),
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object' and pg_column_size(properties) <= 4096),
  tracking_consent_id uuid not null,
  analytics_consent_version text not null,
  analytics_consent_granted_at timestamptz not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (tracking_consent_id, run_id, session_hash)
    references private.ai_readiness_tracking_consents(id, run_id, session_hash) on delete restrict
);

create index if not exists ai_readiness_events_session_idx on public.ai_readiness_events(session_hash, created_at);
create index if not exists ai_readiness_events_run_idx on public.ai_readiness_events(run_id, created_at);
create index if not exists ai_readiness_events_assessment_idx on public.ai_readiness_events(assessment_id, created_at) where assessment_id is not null;
create index if not exists ai_readiness_events_name_idx on public.ai_readiness_events(event_name, created_at);
create index if not exists ai_readiness_events_tracking_consent_idx on public.ai_readiness_events(tracking_consent_id);

create table if not exists private.ai_readiness_rate_limits (
  scope text not null check (scope in ('event_session', 'consent_session', 'lead_ip', 'lead_email', 'lead_phone')),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  bucket_start timestamptz not null,
  attempts integer not null check (attempts > 0),
  expires_at timestamptz not null,
  primary key (scope, key_hash, bucket_start)
);
create index if not exists ai_readiness_rate_limits_expiry_idx on private.ai_readiness_rate_limits(expires_at);

create table if not exists private.ai_readiness_outbox (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.ai_readiness_assessments(id) on delete cascade,
  delivery_type text not null check (delivery_type in ('internal_notification', 'telegram_notification', 'meta_capi')),
  dedupe_key text not null default 'assessment' check (char_length(dedupe_key) between 1 and 128),
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'dead')),
  attempts smallint not null default 0 check (attempts between 0 and 12),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  lease_token uuid,
  delivery_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(delivery_payload) = 'object' and pg_column_size(delivery_payload) <= 2048),
  last_error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  unique (assessment_id, delivery_type, dedupe_key),
  check (
    (status = 'processing' and locked_at is not null and lease_token is not null)
    or (status <> 'processing' and locked_at is null and lease_token is null)
  )
);
create index if not exists ai_readiness_outbox_pending_idx on private.ai_readiness_outbox(available_at, created_at) where status = 'pending';
create index if not exists ai_readiness_outbox_processing_idx on private.ai_readiness_outbox(locked_at) where status = 'processing';
create index if not exists ai_readiness_outbox_expiry_idx on private.ai_readiness_outbox(expires_at) where status in ('pending', 'processing');

create table if not exists private.ai_readiness_contact_consents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  assessment_id uuid references public.ai_readiness_assessments(id) on delete set null,
  consent_type text not null check (consent_type in ('callback', 'ai_processing')),
  consent_version text not null,
  consent_text text not null,
  consent_hash text not null check (consent_hash ~ '^[0-9a-f]{64}$'),
  granted_at timestamptz not null,
  revoked_at timestamptz,
  subject_email_hash text not null check (subject_email_hash ~ '^[0-9a-f]{64}$'),
  subject_email_normalized text not null check (subject_email_normalized ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  subject_phone_hash text not null check (subject_phone_hash ~ '^[0-9a-f]{64}$'),
  subject_phone_e164 text not null check (subject_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  evidence_ip_hash text check (evidence_ip_hash is null or evidence_ip_hash ~ '^[0-9a-f]{64}$'),
  evidence_user_agent text,
  created_at timestamptz not null default now(),
  retention_until timestamptz not null,
  unique (submission_id, consent_type)
);
create index if not exists ai_readiness_contact_consents_retention_idx on private.ai_readiness_contact_consents(retention_until);
create index if not exists ai_readiness_contact_consents_assessment_idx on private.ai_readiness_contact_consents(assessment_id) where assessment_id is not null;

create table if not exists private.ai_readiness_callback_uses (
  id uuid primary key default gen_random_uuid(),
  use_id uuid not null unique,
  consent_id uuid not null references private.ai_readiness_contact_consents(id) on delete cascade,
  assessment_id uuid references public.ai_readiness_assessments(id) on delete set null,
  channel text not null check (channel in ('telephone', 'email_follow_up')),
  used_at timestamptz not null,
  actor_reference text not null check (char_length(actor_reference) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (consent_id, channel)
);
create index if not exists ai_readiness_callback_uses_consent_idx on private.ai_readiness_callback_uses(consent_id, used_at desc);

alter table public.ai_readiness_assessments enable row level security;
alter table public.ai_readiness_events enable row level security;
alter table private.ai_readiness_tracking_consents enable row level security;
alter table private.ai_readiness_rate_limits enable row level security;
alter table private.ai_readiness_outbox enable row level security;
alter table private.ai_readiness_contact_consents enable row level security;
alter table private.ai_readiness_callback_uses enable row level security;

revoke all on public.ai_readiness_assessments from public, anon, authenticated;
revoke all on public.ai_readiness_events from public, anon, authenticated;
revoke all on private.ai_readiness_tracking_consents from public, anon, authenticated;
revoke all on private.ai_readiness_rate_limits from public, anon, authenticated;
revoke all on private.ai_readiness_outbox from public, anon, authenticated;
revoke all on private.ai_readiness_contact_consents from public, anon, authenticated;
revoke all on private.ai_readiness_callback_uses from public, anon, authenticated;
grant select, insert, update, delete on public.ai_readiness_assessments to service_role;
grant select, insert, update, delete on public.ai_readiness_events to service_role;
grant select, insert, update, delete on private.ai_readiness_tracking_consents to service_role;
grant select, insert, update, delete on private.ai_readiness_rate_limits to service_role;
grant select, insert, update, delete on private.ai_readiness_outbox to service_role;
grant select, insert, update, delete on private.ai_readiness_contact_consents to service_role;
grant select, insert, update, delete on private.ai_readiness_callback_uses to service_role;

create or replace function private.ai_readiness_phone_key(p_phone text)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select pg_catalog.regexp_replace(p_phone, '[^0-9]', '', 'g');
$$;
revoke all on function private.ai_readiness_phone_key(text) from public, anon, authenticated;
grant execute on function private.ai_readiness_phone_key(text) to service_role;

create or replace function public.consume_ai_readiness_rate_limit_v1(p_scope text, p_key_hash text)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_limit integer;
  v_window_seconds integer;
  v_bucket timestamptz;
  v_attempts integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_rate_key'; end if;
  case p_scope
    when 'event_session' then v_limit := 120; v_window_seconds := 900;
    when 'consent_session' then v_limit := 30; v_window_seconds := 3600;
    when 'lead_ip' then v_limit := 5; v_window_seconds := 3600;
    when 'lead_email' then v_limit := 3; v_window_seconds := 86400;
    when 'lead_phone' then v_limit := 3; v_window_seconds := 86400;
    else raise exception 'invalid_rate_scope';
  end case;

  v_bucket := pg_catalog.date_bin(
    pg_catalog.make_interval(secs => v_window_seconds),
    pg_catalog.clock_timestamp(),
    '1970-01-01 00:00:00+00'::timestamptz
  );
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_scope || ':' || p_key_hash || ':' || v_bucket::text, 28411));

  insert into private.ai_readiness_rate_limits as bucket(scope, key_hash, bucket_start, attempts, expires_at)
  values (p_scope, p_key_hash, v_bucket, 1, v_bucket + pg_catalog.make_interval(secs => v_window_seconds * 2))
  on conflict (scope, key_hash, bucket_start) do update
    set attempts = bucket.attempts + 1
    where bucket.attempts < v_limit
  returning attempts into v_attempts;

  if not found then
    return query select false, 0, v_bucket + pg_catalog.make_interval(secs => v_window_seconds);
    return;
  end if;
  return query select true, greatest(v_limit - v_attempts, 0), v_bucket + pg_catalog.make_interval(secs => v_window_seconds);
end;
$$;
revoke all on function public.consume_ai_readiness_rate_limit_v1(text, text) from public, anon, authenticated;
grant execute on function public.consume_ai_readiness_rate_limit_v1(text, text) to service_role;

create or replace function public.record_ai_readiness_tracking_consent_v1(
  p_decision_id uuid,
  p_previous_decision_id uuid,
  p_run_id uuid,
  p_session_hash text,
  p_tracking_subject_hash text,
  p_consent_version text,
  p_analytics boolean,
  p_marketing boolean,
  p_evidence_ip_hash text,
  p_evidence_user_agent text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c_cookie_version constant text := 'cookie-v1-2026-07-18';
  c_analytics_text constant text := 'Analyse: Synclaro speichert pseudonyme Funnel-Ereignisse, um Nutzung und Abbrüche des AI Readiness Tests auszuwerten. Testantworten und Kontaktdaten werden dabei nicht als Ereigniseigenschaften gespeichert.';
  c_marketing_text constant text := 'Marketing einschließlich Meta: Synclaro darf Meta Pixel und Conversions API einsetzen, um die Kampagne zu messen und Werbung zu personalisieren. Dabei können Online-Kennungen, Browser- und Gerätedaten sowie gehashte Kontaktdaten an Meta Platforms Ireland Limited übermittelt werden.';
  v_allowed boolean;
  v_decision private.ai_readiness_tracking_consents%rowtype;
  v_latest_decision private.ai_readiness_tracking_consents%rowtype;
  v_decision_id uuid;
  v_decided_at timestamptz := pg_catalog.statement_timestamp();
begin
  if p_decision_id is null or p_run_id is null
    or p_session_hash !~ '^[0-9a-f]{64}$'
    or p_tracking_subject_hash !~ '^[0-9a-f]{64}$'
    or p_consent_version <> c_cookie_version
    or p_analytics is null or p_marketing is null
    or (p_evidence_ip_hash is not null and p_evidence_ip_hash !~ '^[0-9a-f]{64}$')
  then raise exception 'invalid_tracking_consent'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_tracking_subject_hash, 71192));
  if exists (
    select 1 from private.ai_readiness_tracking_consents
    where run_id = p_run_id
      and (session_hash <> p_session_hash or tracking_subject_hash <> p_tracking_subject_hash)
  ) then raise exception 'run_session_conflict'; end if;
  select * into v_latest_decision
  from private.ai_readiness_tracking_consents
  where tracking_subject_hash = p_tracking_subject_hash
  order by recorded_seq desc
  limit 1;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_decision_id::text, 71191));
  select * into v_decision
  from private.ai_readiness_tracking_consents
  where decision_id = p_decision_id;
  if found then
    if v_decision.run_id <> p_run_id
      or v_decision.session_hash <> p_session_hash
      or v_decision.tracking_subject_hash <> p_tracking_subject_hash
      or v_decision.consent_version <> p_consent_version
      or v_decision.analytics_consent <> p_analytics
      or v_decision.marketing_consent <> p_marketing
    then raise exception 'tracking_consent_conflict'; end if;
    if v_latest_decision.id is distinct from v_decision.id then
      return pg_catalog.jsonb_build_object(
        'accepted', false,
        'status', 'stale',
        'current_decision_id', v_latest_decision.decision_id,
        'current_analytics', coalesce(v_latest_decision.analytics_consent, false),
        'current_marketing', coalesce(v_latest_decision.marketing_consent, false),
        'current_decided_at', v_latest_decision.decided_at
      );
    end if;
    return pg_catalog.jsonb_build_object(
      'accepted', true, 'status', 'idempotent',
      'decision_id', v_decision.decision_id, 'decided_at', v_decision.decided_at
    );
  end if;

  if (v_latest_decision.id is null and p_previous_decision_id is not null)
    or (v_latest_decision.id is not null and p_previous_decision_id is distinct from v_latest_decision.decision_id)
  then
    return pg_catalog.jsonb_build_object(
      'accepted', false,
      'status', 'stale',
      'current_decision_id', v_latest_decision.decision_id,
      'current_analytics', coalesce(v_latest_decision.analytics_consent, false),
      'current_marketing', coalesce(v_latest_decision.marketing_consent, false),
      'current_decided_at', v_latest_decision.decided_at
    );
  end if;

  select rate.allowed into v_allowed
  from public.consume_ai_readiness_rate_limit_v1('consent_session', p_session_hash) as rate;
  if not v_allowed then raise exception 'rate_limited'; end if;

  insert into private.ai_readiness_tracking_consents(
    decision_id, run_id, session_hash, tracking_subject_hash, consent_version,
    analytics_consent, analytics_consent_text, analytics_consent_hash,
    marketing_consent, marketing_consent_text, marketing_consent_hash,
    decided_at, evidence_ip_hash, evidence_user_agent, retention_until
  ) values (
    p_decision_id, p_run_id, p_session_hash, p_tracking_subject_hash, c_cookie_version,
    p_analytics, c_analytics_text, pg_catalog.encode(extensions.digest(c_analytics_text, 'sha256'), 'hex'),
    p_marketing, c_marketing_text, pg_catalog.encode(extensions.digest(c_marketing_text, 'sha256'), 'hex'),
    v_decided_at, p_evidence_ip_hash, pg_catalog.left(p_evidence_user_agent, 500),
    v_decided_at + interval '24 months'
  ) returning id into v_decision_id;

  if p_analytics then
    update public.ai_readiness_assessments set
      analytics_consent = true,
      analytics_consent_version = c_cookie_version,
      analytics_consent_text = c_analytics_text,
      analytics_consent_hash = pg_catalog.encode(extensions.digest(c_analytics_text, 'sha256'), 'hex'),
      analytics_consent_granted_at = v_decided_at,
      analytics_consent_revoked_at = null
    where run_id = p_run_id and session_hash = p_session_hash
      and tracking_subject_hash = p_tracking_subject_hash;
  else
    update public.ai_readiness_assessments set
      analytics_consent = false,
      analytics_consent_revoked_at = coalesce(analytics_consent_revoked_at, v_decided_at)
    where tracking_subject_hash = p_tracking_subject_hash
      and analytics_consent and analytics_consent_revoked_at is null;
  end if;

  if p_marketing then
    update public.ai_readiness_assessments set
      marketing_tracking_consent = true,
      marketing_consent_version = c_cookie_version,
      marketing_consent_text = c_marketing_text,
      marketing_consent_hash = pg_catalog.encode(extensions.digest(c_marketing_text, 'sha256'), 'hex'),
      marketing_consent_granted_at = v_decided_at,
      marketing_consent_revoked_at = null
    where run_id = p_run_id and session_hash = p_session_hash
      and tracking_subject_hash = p_tracking_subject_hash;
  else
    update public.ai_readiness_assessments set
      marketing_tracking_consent = false,
      marketing_consent_revoked_at = coalesce(marketing_consent_revoked_at, v_decided_at)
    where tracking_subject_hash = p_tracking_subject_hash
      and marketing_tracking_consent and marketing_consent_revoked_at is null;

    with cancelled as (
      update private.ai_readiness_outbox as outbox set
        status = 'dead', delivery_payload = '{}'::jsonb,
        locked_at = null, lease_token = null, last_error_code = 'consent_revoked'
      from public.ai_readiness_assessments as assessment
      where outbox.assessment_id = assessment.id
        and assessment.tracking_subject_hash = p_tracking_subject_hash
        and outbox.delivery_type = 'meta_capi'
        and outbox.status in ('pending', 'processing')
      returning outbox.assessment_id
    )
    update public.ai_readiness_assessments as assessment
    set meta_delivery_status = 'dead'
    where assessment.id in (select cancelled.assessment_id from cancelled)
      and assessment.meta_delivery_status <> 'delivered';
  end if;

  update private.ai_readiness_tracking_consents as consent
  set assessment_id = assessment.id
  from public.ai_readiness_assessments as assessment
  where consent.id = v_decision_id
    and assessment.run_id = p_run_id
    and assessment.session_hash = p_session_hash
    and assessment.tracking_subject_hash = p_tracking_subject_hash;

  return pg_catalog.jsonb_build_object(
    'accepted', true, 'status', 'accepted',
    'decision_id', p_decision_id, 'decided_at', v_decided_at
  );
end;
$$;
revoke all on function public.record_ai_readiness_tracking_consent_v1(uuid, uuid, uuid, text, text, text, boolean, boolean, text, text) from public, anon, authenticated;
grant execute on function public.record_ai_readiness_tracking_consent_v1(uuid, uuid, uuid, text, text, text, boolean, boolean, text, text) to service_role;

create or replace function public.record_ai_readiness_event_v1(
  p_event_id uuid,
  p_run_id uuid,
  p_session_hash text,
  p_event_name text,
  p_step smallint,
  p_properties jsonb,
  p_occurred_at timestamptz,
  p_analytics_consent_version text,
  p_analytics_consent_granted_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allowed boolean;
  v_assessment_id uuid;
  v_occurred_at timestamptz;
  v_tracking_consent private.ai_readiness_tracking_consents%rowtype;
  v_run_consent private.ai_readiness_tracking_consents%rowtype;
  v_existing_event public.ai_readiness_events%rowtype;
begin
  if p_event_id is null or p_run_id is null or p_session_hash !~ '^[0-9a-f]{64}$'
    or p_event_name not in (
      'landing_viewed', 'test_started', 'profile_completed', 'phase_started', 'phase_completed',
      'result_preview_viewed', 'lead_form_viewed', 'lead_form_validation_error',
      'lead_submitted', 'report_viewed', 'calendar_cta_clicked', 'consent_updated',
      'scroll_depth', 'session_duration'
    )
    or p_properties is null or pg_catalog.jsonb_typeof(p_properties) <> 'object'
    or pg_catalog.pg_column_size(p_properties) > 4096
    or p_analytics_consent_version <> 'cookie-v1-2026-07-18'
    or p_analytics_consent_granted_at is null
    or p_analytics_consent_granted_at < pg_catalog.statement_timestamp() - interval '180 days'
    or p_analytics_consent_granted_at > pg_catalog.statement_timestamp() + interval '5 minutes'
  then raise exception 'invalid_event'; end if;

  select rate.allowed into v_allowed
  from public.consume_ai_readiness_rate_limit_v1('event_session', p_session_hash) as rate;
  if not v_allowed then raise exception 'rate_limited'; end if;

  select * into v_run_consent
  from private.ai_readiness_tracking_consents
  where session_hash = p_session_hash and run_id = p_run_id
  order by recorded_seq desc
  limit 1;
  if not found then raise exception 'analytics_consent_not_current'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_run_consent.tracking_subject_hash, 71192));

  select * into v_tracking_consent
  from private.ai_readiness_tracking_consents
  where tracking_subject_hash = v_run_consent.tracking_subject_hash
  order by recorded_seq desc
  limit 1;
  if not found
    or not v_run_consent.analytics_consent
    or v_run_consent.consent_version <> p_analytics_consent_version
    or pg_catalog.abs(extract(epoch from (v_run_consent.decided_at - p_analytics_consent_granted_at))) > 1
    or not v_tracking_consent.analytics_consent
    or v_tracking_consent.consent_version <> p_analytics_consent_version
  then raise exception 'analytics_consent_not_current'; end if;

  if exists (
    select 1 from public.ai_readiness_assessments
    where run_id = p_run_id and session_hash <> p_session_hash
  ) then raise exception 'run_session_conflict'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_event_id::text, 31903));
  select * into v_existing_event
  from public.ai_readiness_events
  where event_id = p_event_id;
  if found then
    if v_existing_event.run_id <> p_run_id
      or v_existing_event.session_hash <> p_session_hash
      or v_existing_event.event_name <> p_event_name
      or v_existing_event.step is distinct from p_step
      or v_existing_event.properties is distinct from p_properties
    then raise exception 'event_id_conflict'; end if;
    return pg_catalog.jsonb_build_object('accepted', true, 'status', 'idempotent');
  end if;

  select assessment.id into v_assessment_id
  from public.ai_readiness_assessments as assessment
  where assessment.session_hash = p_session_hash and assessment.run_id = p_run_id
    and assessment.analytics_consent
    and assessment.analytics_consent_revoked_at is null
  limit 1;

  v_occurred_at := coalesce(p_occurred_at, pg_catalog.statement_timestamp());
  if v_occurred_at < pg_catalog.statement_timestamp() - interval '24 hours'
     or v_occurred_at > pg_catalog.statement_timestamp() + interval '5 minutes'
  then v_occurred_at := pg_catalog.statement_timestamp(); end if;

  insert into public.ai_readiness_events(
    event_id, run_id, session_hash, assessment_id, event_name, step, properties,
    tracking_consent_id, analytics_consent_version, analytics_consent_granted_at, occurred_at
  )
  values (
    p_event_id, p_run_id, p_session_hash, v_assessment_id, p_event_name, p_step, p_properties,
    v_run_consent.id, p_analytics_consent_version, p_analytics_consent_granted_at, v_occurred_at
  );
  return pg_catalog.jsonb_build_object('accepted', true, 'status', 'accepted');
end;
$$;
revoke all on function public.record_ai_readiness_event_v1(uuid, uuid, text, text, smallint, jsonb, timestamptz, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_ai_readiness_event_v1(uuid, uuid, text, text, smallint, jsonb, timestamptz, text, timestamptz) to service_role;

create or replace function public.claim_ai_readiness_analysis_v1(
  p_assessment_id uuid,
  p_submission_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_assessment public.ai_readiness_assessments%rowtype;
  v_consent private.ai_readiness_contact_consents%rowtype;
begin
  if p_assessment_id is null or p_submission_id is null or p_lease_token is null
  then raise exception 'invalid_analysis_claim'; end if;

  select consent.* into v_consent
  from private.ai_readiness_contact_consents as consent
  where consent.assessment_id = p_assessment_id and consent.consent_type = 'ai_processing';
  if not found then raise exception 'ai_consent_not_found'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_consent.id::text, 73303));
  select consent.* into v_consent
  from private.ai_readiness_contact_consents as consent
  where consent.id = v_consent.id
  for update;
  select assessment.* into v_assessment
  from public.ai_readiness_assessments as assessment
  where assessment.id = p_assessment_id and assessment.submission_id = p_submission_id
  for update;
  if not found then raise exception 'assessment_not_found'; end if;
  if v_assessment.analysis_status = 'completed' and v_assessment.analysis_result is not null then
    return pg_catalog.jsonb_build_object('status', 'completed', 'result', v_assessment.analysis_result);
  end if;
  if v_consent.revoked_at is not null or v_assessment.ai_consent_revoked_at is not null then
    return pg_catalog.jsonb_build_object('status', 'consent_revoked');
  end if;
  if v_assessment.analysis_lease_token = p_lease_token
    and v_assessment.analysis_locked_at >= pg_catalog.now() - interval '45 seconds'
  then return pg_catalog.jsonb_build_object('status', 'claimed'); end if;
  if v_assessment.analysis_locked_at is not null
    and v_assessment.analysis_locked_at >= pg_catalog.now() - interval '45 seconds'
  then return pg_catalog.jsonb_build_object('status', 'busy'); end if;

  update public.ai_readiness_assessments set
    analysis_status = 'pending', analysis_lease_token = p_lease_token,
    analysis_locked_at = pg_catalog.now()
  where id = p_assessment_id;
  return pg_catalog.jsonb_build_object('status', 'claimed');
end;
$$;
revoke all on function public.claim_ai_readiness_analysis_v1(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_ai_readiness_analysis_v1(uuid, uuid, uuid) to service_role;

create or replace function public.complete_ai_readiness_analysis_v1(
  p_assessment_id uuid,
  p_lease_token uuid,
  p_result jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_assessment public.ai_readiness_assessments%rowtype;
  v_consent private.ai_readiness_contact_consents%rowtype;
begin
  if p_assessment_id is null or p_lease_token is null
    or p_result is null or pg_catalog.jsonb_typeof(p_result) <> 'object'
    or pg_catalog.pg_column_size(p_result) > 131072
  then raise exception 'invalid_analysis_result'; end if;

  select consent.* into v_consent
  from private.ai_readiness_contact_consents as consent
  where consent.assessment_id = p_assessment_id and consent.consent_type = 'ai_processing';
  if not found then raise exception 'ai_consent_not_found'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_consent.id::text, 73303));
  select consent.* into v_consent
  from private.ai_readiness_contact_consents as consent
  where consent.id = v_consent.id
  for update;
  select assessment.* into v_assessment
  from public.ai_readiness_assessments as assessment
  where assessment.id = p_assessment_id
  for update;
  if not found then raise exception 'assessment_not_found'; end if;
  if v_assessment.analysis_status = 'completed' and v_assessment.analysis_result is not null then
    return v_assessment.analysis_result;
  end if;
  if v_consent.revoked_at is not null or v_assessment.ai_consent_revoked_at is not null then
    raise exception 'analysis_consent_revoked';
  end if;
  if v_assessment.analysis_lease_token is distinct from p_lease_token
    or v_assessment.analysis_locked_at is null
    or v_assessment.analysis_locked_at < pg_catalog.now() - interval '45 seconds'
  then raise exception 'analysis_lease_invalid'; end if;
  update public.ai_readiness_assessments set
    analysis_status = 'completed', analysis_result = p_result,
    analysis_lease_token = null, analysis_locked_at = null,
    analyzed_at = pg_catalog.now()
  where id = p_assessment_id;
  return p_result;
end;
$$;
revoke all on function public.complete_ai_readiness_analysis_v1(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.complete_ai_readiness_analysis_v1(uuid, uuid, jsonb) to service_role;

create or replace function public.submit_ai_readiness_lead_v1(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c_callback_version constant text := 'callback-v1-2026-07-18';
  c_callback_text constant text := 'Ich möchte meine vollständige KI-Readiness-Auswertung erhalten und bitte Synclaro IT Dienstleistungen, Inhaber Marco Heer, mich zu diesem Testergebnis einmal per Telefon zu kontaktieren. Falls ich nicht erreichbar bin, darf Synclaro per E-Mail nachfassen. Dabei dürfen mir passende Leistungen rund um KI und Automatisierung vorgestellt werden. Ich kann meine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.';
  c_ai_version constant text := 'ai-processing-v2-2026-07-18';
  c_ai_text constant text := 'Ich willige ein, dass meine Unternehmensangaben und Testantworten zur individuellen Auswertung durch OpenAI Ireland Ltd. verarbeitet werden. Dabei kann eine technische Weiterverarbeitung außerhalb des EWR auf Grundlage geeigneter Garantien, zum Beispiel EU-Standardvertragsklauseln, erfolgen. Meine Kontaktdaten werden nicht an OpenAI übermittelt. Ich kann meine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.';
  c_privacy_version constant text := 'privacy-ai-readiness-v1-2026-07-18';
  c_cookie_version constant text := 'cookie-v1-2026-07-18';
  c_analytics_text constant text := 'Analyse: Synclaro speichert pseudonyme Funnel-Ereignisse, um Nutzung und Abbrüche des AI Readiness Tests auszuwerten. Testantworten und Kontaktdaten werden dabei nicht als Ereigniseigenschaften gespeichert.';
  c_marketing_text constant text := 'Marketing einschließlich Meta: Synclaro darf Meta Pixel und Conversions API einsetzen, um die Kampagne zu messen und Werbung zu personalisieren. Dabei können Online-Kennungen, Browser- und Gerätedaten sowie gehashte Kontaktdaten an Meta Platforms Ireland Limited übermittelt werden.';

  v_submission_id uuid;
  v_run_id uuid;
  v_assessment_id uuid;
  v_contact_id uuid;
  v_contact_created boolean := false;
  v_dedupe_status text := 'new';
  v_email text;
  v_phone text;
  v_email_ids uuid[];
  v_phone_ids uuid[];
  v_both_ids uuid[];
  v_existing_email text;
  v_existing_phone text;
  v_allowed boolean;
  v_callback_granted_at timestamptz := pg_catalog.statement_timestamp();
  v_ai_granted_at timestamptz := pg_catalog.statement_timestamp();
  v_marketing boolean;
  v_analytics boolean;
  v_lead_fit boolean;
  v_tracking_decision private.ai_readiness_tracking_consents%rowtype;
  v_global_tracking_decision private.ai_readiness_tracking_consents%rowtype;
begin
  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' or pg_catalog.pg_column_size(p_payload) > 131072 then
    raise exception 'invalid_payload';
  end if;
  v_submission_id := (p_payload ->> 'submission_id')::uuid;
  v_run_id := (p_payload ->> 'run_id')::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_submission_id::text, 61807));

  select assessment.id, assessment.contact_id into v_assessment_id, v_contact_id
  from public.ai_readiness_assessments as assessment where assessment.submission_id = v_submission_id;
  if found then
    if not exists (
      select 1 from public.ai_readiness_assessments as assessment
      where assessment.submission_id = v_submission_id
        and assessment.run_id = v_run_id
        and assessment.session_hash = p_payload ->> 'session_hash'
    ) then raise exception 'submission_conflict'; end if;
    return pg_catalog.jsonb_build_object(
      'accepted', true, 'status', 'idempotent', 'assessment_id', v_assessment_id,
      'contact_id', v_contact_id, 'contact_created', false, 'dedupe_status', 'idempotent'
    );
  end if;

  if p_payload #>> '{consents,callback,version}' <> c_callback_version
     or p_payload #>> '{consents,callback,text}' <> c_callback_text
     or (p_payload #>> '{consents,callback,granted}')::boolean is not true
  then raise exception 'callback_consent_mismatch'; end if;
  if p_payload #>> '{consents,aiProcessing,version}' <> c_ai_version
     or p_payload #>> '{consents,aiProcessing,text}' <> c_ai_text
     or (p_payload #>> '{consents,aiProcessing,granted}')::boolean is not true
  then raise exception 'ai_consent_mismatch'; end if;
  if p_payload ->> 'privacy_version' <> c_privacy_version then raise exception 'privacy_version_mismatch'; end if;

  if p_payload ->> 'tracking_subject_hash' !~ '^[0-9a-f]{64}$' then raise exception 'tracking_subject_invalid'; end if;
  v_marketing := coalesce((p_payload #>> '{consents,marketing,granted}')::boolean, false);
  v_analytics := coalesce((p_payload #>> '{consents,analytics,granted}')::boolean, false);
  if p_payload #>> '{consents,marketing,version}' <> c_cookie_version
     or p_payload #>> '{consents,analytics,version}' <> c_cookie_version
  then raise exception 'tracking_consent_mismatch'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_payload ->> 'tracking_subject_hash', 71192));
  select * into v_tracking_decision
  from private.ai_readiness_tracking_consents
  where tracking_subject_hash = p_payload ->> 'tracking_subject_hash'
    and session_hash = p_payload ->> 'session_hash'
    and run_id = v_run_id
  order by recorded_seq desc
  limit 1;
  select * into v_global_tracking_decision
  from private.ai_readiness_tracking_consents
  where tracking_subject_hash = p_payload ->> 'tracking_subject_hash'
  order by recorded_seq desc
  limit 1;
  if v_tracking_decision.id is null
    or v_global_tracking_decision.id is null
    or v_tracking_decision.consent_version <> c_cookie_version
    or v_tracking_decision.analytics_consent <> v_analytics
    or v_tracking_decision.marketing_consent <> v_marketing
    or v_global_tracking_decision.consent_version <> c_cookie_version
    or v_global_tracking_decision.analytics_consent <> v_analytics
    or v_global_tracking_decision.marketing_consent <> v_marketing
  then raise exception 'tracking_consent_not_current'; end if;

  v_email := pg_catalog.lower(pg_catalog.btrim(p_payload #>> '{contact,email}'));
  v_phone := p_payload #>> '{contact,phone}';
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
     or v_phone !~ '^\+[1-9][0-9]{7,14}$'
     or pg_catalog.btrim(p_payload #>> '{contact,firstName}') = ''
     or pg_catalog.btrim(p_payload #>> '{contact,lastName}') = ''
     or pg_catalog.btrim(p_payload #>> '{contact,company}') = ''
  then raise exception 'invalid_contact'; end if;

  select rate.allowed into v_allowed from public.consume_ai_readiness_rate_limit_v1('lead_ip', p_payload ->> 'rate_ip_hash') as rate;
  if not v_allowed then raise exception 'rate_limited'; end if;
  select rate.allowed into v_allowed from public.consume_ai_readiness_rate_limit_v1('lead_email', p_payload ->> 'rate_email_hash') as rate;
  if not v_allowed then raise exception 'rate_limited'; end if;
  select rate.allowed into v_allowed from public.consume_ai_readiness_rate_limit_v1('lead_phone', p_payload ->> 'rate_phone_hash') as rate;
  if not v_allowed then raise exception 'rate_limited'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('email:' || v_email, 61807));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('phone:' || v_phone, 61807));

  select coalesce(pg_catalog.array_agg(c.id order by c.created_at), '{}'::uuid[]) into v_email_ids
  from public.crm_contacts c where pg_catalog.lower(pg_catalog.btrim(c.email)) = v_email;
  select coalesce(pg_catalog.array_agg(c.id order by c.created_at), '{}'::uuid[]) into v_phone_ids
  from public.crm_contacts c where private.ai_readiness_phone_key(coalesce(c.phone, '')) = private.ai_readiness_phone_key(v_phone);
  select coalesce(pg_catalog.array_agg(c.id order by c.created_at), '{}'::uuid[]) into v_both_ids
  from public.crm_contacts c
  where pg_catalog.lower(pg_catalog.btrim(c.email)) = v_email
    and private.ai_readiness_phone_key(coalesce(c.phone, '')) = private.ai_readiness_phone_key(v_phone);

  if pg_catalog.cardinality(v_both_ids) = 1
     and pg_catalog.cardinality(v_email_ids) = 1
     and pg_catalog.cardinality(v_phone_ids) = 1 then
    v_contact_id := v_both_ids[1]; v_dedupe_status := 'email_phone_match';
  elsif pg_catalog.cardinality(v_email_ids) = 1
        and pg_catalog.cardinality(v_phone_ids) = 0 then
    select c.phone into v_existing_phone from public.crm_contacts c where c.id = v_email_ids[1];
    if coalesce(pg_catalog.btrim(v_existing_phone), '') = '' then
      v_contact_id := v_email_ids[1]; v_dedupe_status := 'email_match_phone_added';
    end if;
  elsif pg_catalog.cardinality(v_phone_ids) = 1
        and pg_catalog.cardinality(v_email_ids) = 0 then
    select c.email into v_existing_email from public.crm_contacts c where c.id = v_phone_ids[1];
    if coalesce(pg_catalog.btrim(v_existing_email), '') = '' then
      v_contact_id := v_phone_ids[1]; v_dedupe_status := 'phone_match_email_added';
    end if;
  end if;

  if v_contact_id is null then
    v_dedupe_status := case when pg_catalog.cardinality(v_email_ids) > 0 or pg_catalog.cardinality(v_phone_ids) > 0 then 'dedupe_review' else 'new' end;
    insert into public.crm_contacts(
      first_name, last_name, email, phone, company, contact_type, contact_source,
      lead_source, first_touch_channel, tags, pipeline_stage, created_at, updated_at
    ) values (
      pg_catalog.btrim(p_payload #>> '{contact,firstName}'),
      pg_catalog.btrim(p_payload #>> '{contact,lastName}'),
      v_email, v_phone, pg_catalog.btrim(p_payload #>> '{contact,company}'),
      'lead', 'marketing', 'marketing', 'website_formular',
      case when v_dedupe_status = 'dedupe_review' then array['ai-readiness', 'ki-readiness-test', 'dedupe-review']::text[] else array['ai-readiness', 'ki-readiness-test']::text[] end,
      'neu', pg_catalog.now(), pg_catalog.now()
    ) returning id into v_contact_id;
    v_contact_created := true;
  else
    update public.crm_contacts as c set
      email = case when coalesce(pg_catalog.btrim(c.email), '') = '' then v_email else c.email end,
      phone = case when coalesce(pg_catalog.btrim(c.phone), '') = '' then v_phone else c.phone end,
      company = case when coalesce(pg_catalog.btrim(c.company), '') = '' then pg_catalog.btrim(p_payload #>> '{contact,company}') else c.company end,
      tags = (select pg_catalog.array_agg(distinct u.tag) from pg_catalog.unnest(coalesce(c.tags, '{}'::text[]) || array['ai-readiness', 'ki-readiness-test']::text[]) as u(tag)),
      updated_at = pg_catalog.now()
    where c.id = v_contact_id;
  end if;

  v_assessment_id := extensions.gen_random_uuid();
  v_lead_fit := (p_payload #>> '{profile,mitarbeiter}') in ('solo', '1-5', '6-10', '11-20')
    and (p_payload #>> '{profile,rolle}') in ('inhaber', 'geschaeftsfuehrung');

  insert into public.ai_readiness_assessments(
    id, submission_id, run_id, session_hash, contact_id, assessment_version, privacy_version,
    industry, employee_band, respondent_role, primary_goal, lead_fit,
    answers, score_total, score_breakdown, readiness_level, attribution, tracking_subject_hash,
    callback_consent_version, callback_consent_text, callback_consent_hash, callback_consent_granted_at,
    ai_consent_version, ai_consent_text, ai_consent_hash, ai_consent_granted_at,
    analytics_consent, analytics_consent_version, analytics_consent_text, analytics_consent_hash, analytics_consent_granted_at,
    marketing_tracking_consent, marketing_consent_version, marketing_consent_text, marketing_consent_hash, marketing_consent_granted_at,
    consent_evidence_ip_hash, consent_evidence_user_agent,
    meta_delivery_status
  ) values (
    v_assessment_id, v_submission_id, v_run_id, p_payload ->> 'session_hash', v_contact_id,
    p_payload ->> 'assessment_version', c_privacy_version,
    p_payload #>> '{profile,branche}', p_payload #>> '{profile,mitarbeiter}',
    p_payload #>> '{profile,rolle}', p_payload #>> '{profile,hauptziel}', v_lead_fit,
    p_payload -> 'answers', (p_payload #>> '{baseline,scores,total,percent}')::smallint,
    p_payload #> '{baseline,scores}', p_payload #>> '{baseline,level}', p_payload -> 'attribution', p_payload ->> 'tracking_subject_hash',
    c_callback_version, c_callback_text, pg_catalog.encode(extensions.digest(c_callback_text, 'sha256'), 'hex'), v_callback_granted_at,
    c_ai_version, c_ai_text, pg_catalog.encode(extensions.digest(c_ai_text, 'sha256'), 'hex'), v_ai_granted_at,
    v_analytics, c_cookie_version, case when v_analytics then c_analytics_text else null end,
    case when v_analytics then pg_catalog.encode(extensions.digest(c_analytics_text, 'sha256'), 'hex') else null end,
    case when v_analytics then v_tracking_decision.decided_at else null end,
    v_marketing, c_cookie_version, case when v_marketing then c_marketing_text else null end,
    case when v_marketing then pg_catalog.encode(extensions.digest(c_marketing_text, 'sha256'), 'hex') else null end,
    case when v_marketing then v_tracking_decision.decided_at else null end,
    nullif(p_payload #>> '{consents,evidence,ipHash}', ''), pg_catalog.left(p_payload #>> '{consents,evidence,userAgent}', 500),
    case when v_marketing then 'pending' else 'not_requested' end
  );

  update private.ai_readiness_tracking_consents
  set assessment_id = v_assessment_id
  where run_id = v_run_id
    and session_hash = p_payload ->> 'session_hash'
    and tracking_subject_hash = p_payload ->> 'tracking_subject_hash'
    and assessment_id is null;

  insert into private.ai_readiness_contact_consents(
    submission_id, assessment_id, consent_type, consent_version, consent_text,
    consent_hash, granted_at, subject_email_hash, subject_email_normalized, subject_phone_hash, subject_phone_e164,
    evidence_ip_hash, evidence_user_agent, retention_until
  ) values
  (
    v_submission_id, v_assessment_id, 'callback', c_callback_version, c_callback_text,
    pg_catalog.encode(extensions.digest(c_callback_text, 'sha256'), 'hex'), v_callback_granted_at,
    p_payload ->> 'rate_email_hash', v_email, p_payload ->> 'rate_phone_hash', v_phone,
    nullif(p_payload #>> '{consents,evidence,ipHash}', ''), pg_catalog.left(p_payload #>> '{consents,evidence,userAgent}', 500),
    v_callback_granted_at + interval '5 years'
  ),
  (
    v_submission_id, v_assessment_id, 'ai_processing', c_ai_version, c_ai_text,
    pg_catalog.encode(extensions.digest(c_ai_text, 'sha256'), 'hex'), v_ai_granted_at,
    p_payload ->> 'rate_email_hash', v_email, p_payload ->> 'rate_phone_hash', v_phone,
    nullif(p_payload #>> '{consents,evidence,ipHash}', ''), pg_catalog.left(p_payload #>> '{consents,evidence,userAgent}', 500),
    v_ai_granted_at + interval '24 months'
  );

  insert into public.crm_contact_events(contact_id, event_type, channel, source, summary, details, actor, created_at)
  values (
    v_contact_id,
    case when v_contact_created then 'erstkontakt' else 'folgekontakt' end,
    'website_formular', 'ki_readiness_test', 'KI-Readiness-Auswertung und einmaligen Rückruf angefordert',
    pg_catalog.jsonb_build_object(
      'assessment_id', v_assessment_id, 'submission_id', v_submission_id,
      'score', (p_payload #>> '{baseline,scores,total,percent}')::smallint,
      'readiness_level', p_payload #>> '{baseline,level}',
      'industry', p_payload #>> '{profile,branche}', 'employee_band', p_payload #>> '{profile,mitarbeiter}',
      'lead_fit', v_lead_fit, 'callback_consent_version', c_callback_version,
      'callback_consent_hash', pg_catalog.encode(extensions.digest(c_callback_text, 'sha256'), 'hex'),
      'callback_consent_granted_at', v_callback_granted_at,
      'scope', 'one_time_assessment_follow_up'
    ),
    'system', pg_catalog.now()
  );

  if v_analytics then
    update public.ai_readiness_events set assessment_id = v_assessment_id
    where session_hash = p_payload ->> 'session_hash' and run_id = v_run_id and assessment_id is null;
  else
    delete from public.ai_readiness_events
    where session_hash = p_payload ->> 'session_hash' and run_id = v_run_id and assessment_id is null;
  end if;

  insert into private.ai_readiness_outbox(assessment_id, delivery_type, available_at)
  values (v_assessment_id, 'internal_notification', pg_catalog.now() + interval '2 minutes') on conflict do nothing;
  insert into private.ai_readiness_outbox(assessment_id, delivery_type, available_at)
  values (v_assessment_id, 'telegram_notification', pg_catalog.now() + interval '2 minutes') on conflict do nothing;
  if v_marketing then
    insert into private.ai_readiness_outbox(assessment_id, delivery_type, available_at, expires_at, delivery_payload)
    values (
      v_assessment_id,
      'meta_capi',
      pg_catalog.now() + interval '2 minutes',
      pg_catalog.now() + interval '7 days',
      pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'clientIpAddress', nullif(pg_catalog.left(p_payload #>> '{delivery_context,clientIpAddress}', 80), ''),
        'emailSha256', pg_catalog.encode(extensions.digest(v_email, 'sha256'), 'hex'),
        'phoneSha256', pg_catalog.encode(extensions.digest(pg_catalog.regexp_replace(v_phone, '[^0-9]', '', 'g'), 'sha256'), 'hex')
      ))
    ) on conflict do nothing;
  end if;

  delete from private.ai_readiness_rate_limits
  where ctid in (
    select ctid from private.ai_readiness_rate_limits
    where expires_at < pg_catalog.now()
    limit 500
  );

  return pg_catalog.jsonb_build_object(
    'accepted', true, 'status', 'created', 'assessment_id', v_assessment_id,
    'contact_id', v_contact_id, 'contact_created', v_contact_created, 'dedupe_status', v_dedupe_status
  );
end;
$$;
revoke all on function public.submit_ai_readiness_lead_v1(jsonb) from public, anon, authenticated;
grant execute on function public.submit_ai_readiness_lead_v1(jsonb) to service_role;

create or replace function private.set_ai_readiness_delivery_status_v1(
  p_assessment_id uuid,
  p_delivery_type text,
  p_status text,
  p_delivered_at timestamptz default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_delivery_type not in ('internal_notification', 'telegram_notification', 'meta_capi')
    or p_status not in ('delivered', 'retry_pending', 'not_configured', 'dead')
  then raise exception 'invalid_delivery_status'; end if;
  if p_delivery_type = 'internal_notification' then
    update public.ai_readiness_assessments set
      notification_status = p_status,
      notification_delivered_at = case when p_status = 'delivered' then p_delivered_at else null end
    where id = p_assessment_id;
  elsif p_delivery_type = 'telegram_notification' then
    update public.ai_readiness_assessments set
      telegram_delivery_status = p_status,
      telegram_delivered_at = case when p_status = 'delivered' then p_delivered_at else null end
    where id = p_assessment_id;
  else
    update public.ai_readiness_assessments set
      meta_delivery_status = p_status,
      meta_delivered_at = case when p_status = 'delivered' then p_delivered_at else null end
    where id = p_assessment_id;
  end if;
end;
$$;
revoke all on function private.set_ai_readiness_delivery_status_v1(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function private.set_ai_readiness_delivery_status_v1(uuid, text, text, timestamptz) to service_role;

create or replace function public.authorize_ai_readiness_contact_delivery_v1(
  p_outbox_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_outbox private.ai_readiness_outbox%rowtype;
  v_assessment public.ai_readiness_assessments%rowtype;
  v_consent private.ai_readiness_contact_consents%rowtype;
  v_lease_valid boolean := false;
begin
  select outbox.* into v_outbox
  from private.ai_readiness_outbox as outbox
  where outbox.id = p_outbox_id
    and outbox.delivery_type in ('internal_notification', 'telegram_notification');
  if not found then return pg_catalog.jsonb_build_object('authorized', false, 'lease_valid', false); end if;

  select assessment.* into v_assessment
  from public.ai_readiness_assessments as assessment
  where assessment.id = v_outbox.assessment_id;
  if not found then return pg_catalog.jsonb_build_object('authorized', false, 'lease_valid', false); end if;

  select consent.* into v_consent
  from private.ai_readiness_contact_consents as consent
  where consent.assessment_id = v_assessment.id and consent.consent_type = 'callback';
  if not found then return pg_catalog.jsonb_build_object('authorized', false, 'lease_valid', false); end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_consent.id::text, 73302));
  select consent.* into v_consent
  from private.ai_readiness_contact_consents as consent
  where consent.id = v_consent.id;
  select outbox.* into v_outbox
  from private.ai_readiness_outbox as outbox
  where outbox.id = p_outbox_id;
  select assessment.* into v_assessment
  from public.ai_readiness_assessments as assessment
  where assessment.id = v_outbox.assessment_id;

  v_lease_valid := v_outbox.status = 'processing'
    and v_outbox.lease_token is not distinct from p_lease_token
    and v_outbox.expires_at > pg_catalog.now()
    and v_outbox.locked_at >= pg_catalog.now() - interval '15 minutes';
  return pg_catalog.jsonb_build_object(
    'authorized', v_lease_valid
      and v_consent.revoked_at is null
      and v_assessment.callback_consent_revoked_at is null,
    'lease_valid', v_lease_valid
  );
end;
$$;
revoke all on function public.authorize_ai_readiness_contact_delivery_v1(uuid, uuid) from public, anon, authenticated;
grant execute on function public.authorize_ai_readiness_contact_delivery_v1(uuid, uuid) to service_role;

create or replace function public.revoke_ai_readiness_callback_consent_v1(
  p_assessment_id uuid,
  p_revoked_at timestamptz,
  p_actor_reference text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_consent private.ai_readiness_contact_consents%rowtype;
  v_contact_id uuid;
  v_cancelled record;
  v_already_revoked boolean;
  v_effective_revoked_at timestamptz;
begin
  if p_assessment_id is null or p_revoked_at is null
    or p_revoked_at > pg_catalog.statement_timestamp() + interval '5 minutes'
    or p_revoked_at < pg_catalog.statement_timestamp() - interval '5 minutes'
    or p_actor_reference is null or p_actor_reference not in ('marco', 'phil', 'simon', 'system')
  then raise exception 'invalid_callback_revocation'; end if;

  select consent.* into v_consent
  from private.ai_readiness_contact_consents as consent
  where consent.assessment_id = p_assessment_id and consent.consent_type = 'callback';
  if not found then raise exception 'callback_consent_not_found'; end if;
  if p_revoked_at < v_consent.granted_at then raise exception 'invalid_callback_revocation'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_consent.id::text, 73302));
  select consent.* into v_consent
  from private.ai_readiness_contact_consents as consent
  where consent.id = v_consent.id
  for update;
  v_already_revoked := v_consent.revoked_at is not null;
  v_effective_revoked_at := coalesce(v_consent.revoked_at, pg_catalog.statement_timestamp());

  update private.ai_readiness_contact_consents
  set revoked_at = v_effective_revoked_at
  where id = v_consent.id;
  update public.ai_readiness_assessments
  set callback_consent_revoked_at = v_effective_revoked_at
  where id = p_assessment_id
  returning contact_id into strict v_contact_id;

  for v_cancelled in
    update private.ai_readiness_outbox set
      status = 'dead', delivery_payload = '{}'::jsonb,
      locked_at = null, lease_token = null, last_error_code = 'consent_revoked'
    where assessment_id = p_assessment_id
      and delivery_type in ('internal_notification', 'telegram_notification')
      and status in ('pending', 'processing')
    returning delivery_type
  loop
    perform private.set_ai_readiness_delivery_status_v1(p_assessment_id, v_cancelled.delivery_type, 'dead', null);
  end loop;

  if not v_already_revoked then
    insert into public.crm_contact_events(
      contact_id, event_type, channel, source, summary, details, actor, created_at
    ) values (
      v_contact_id, 'notiz', null, 'ki_readiness_callback',
      'KI-Readiness-Kontakteinwilligung widerrufen',
      pg_catalog.jsonb_build_object('assessment_id', p_assessment_id, 'consent_id', v_consent.id),
      p_actor_reference, v_effective_revoked_at
    );
  end if;
  return pg_catalog.jsonb_build_object(
    'accepted', true,
    'status', case when v_already_revoked then 'idempotent' else 'revoked' end,
    'revoked_at', v_effective_revoked_at
  );
end;
$$;
revoke all on function public.revoke_ai_readiness_callback_consent_v1(uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.revoke_ai_readiness_callback_consent_v1(uuid, timestamptz, text) to service_role;

create or replace function public.revoke_ai_readiness_ai_consent_v1(
  p_assessment_id uuid,
  p_revoked_at timestamptz,
  p_actor_reference text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_consent private.ai_readiness_contact_consents%rowtype;
  v_contact_id uuid;
  v_already_revoked boolean;
  v_effective_revoked_at timestamptz;
begin
  if p_assessment_id is null or p_revoked_at is null
    or p_revoked_at > pg_catalog.statement_timestamp() + interval '5 minutes'
    or p_revoked_at < pg_catalog.statement_timestamp() - interval '5 minutes'
    or p_actor_reference is null or p_actor_reference not in ('marco', 'phil', 'simon', 'system')
  then raise exception 'invalid_ai_consent_revocation'; end if;

  select consent.* into v_consent
  from private.ai_readiness_contact_consents as consent
  where consent.assessment_id = p_assessment_id and consent.consent_type = 'ai_processing';
  if not found then raise exception 'ai_consent_not_found'; end if;
  if p_revoked_at < v_consent.granted_at then raise exception 'invalid_ai_consent_revocation'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_consent.id::text, 73303));
  select consent.* into v_consent
  from private.ai_readiness_contact_consents as consent
  where consent.id = v_consent.id
  for update;
  v_already_revoked := v_consent.revoked_at is not null;
  v_effective_revoked_at := coalesce(v_consent.revoked_at, pg_catalog.statement_timestamp());

  update private.ai_readiness_contact_consents
  set revoked_at = v_effective_revoked_at,
      retention_until = greatest(retention_until, v_effective_revoked_at + interval '24 months')
  where id = v_consent.id;
  update public.ai_readiness_assessments
  set ai_consent_revoked_at = v_effective_revoked_at,
      analysis_status = case when analysis_status = 'completed' then analysis_status else 'failed' end,
      analysis_lease_token = null,
      analysis_locked_at = null
  where id = p_assessment_id
  returning contact_id into strict v_contact_id;

  if not v_already_revoked then
    insert into public.crm_contact_events(
      contact_id, event_type, channel, source, summary, details, actor, created_at
    ) values (
      v_contact_id, 'notiz', null, 'ki_readiness_ai_processing',
      'KI-Readiness-Einwilligung zur KI-Auswertung widerrufen',
      pg_catalog.jsonb_build_object('assessment_id', p_assessment_id, 'consent_id', v_consent.id),
      p_actor_reference, v_effective_revoked_at
    );
  end if;
  return pg_catalog.jsonb_build_object(
    'accepted', true,
    'status', case when v_already_revoked then 'idempotent' else 'revoked' end,
    'revoked_at', v_effective_revoked_at
  );
end;
$$;
revoke all on function public.revoke_ai_readiness_ai_consent_v1(uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.revoke_ai_readiness_ai_consent_v1(uuid, timestamptz, text) to service_role;

create or replace function public.authorize_ai_readiness_meta_delivery_v1(
  p_outbox_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_outbox private.ai_readiness_outbox%rowtype;
  v_assessment public.ai_readiness_assessments%rowtype;
  v_current_marketing boolean := false;
  v_lease_valid boolean := false;
begin
  select outbox.* into v_outbox
  from private.ai_readiness_outbox as outbox
  where outbox.id = p_outbox_id and outbox.delivery_type = 'meta_capi';
  if not found then return pg_catalog.jsonb_build_object('authorized', false, 'lease_valid', false); end if;

  select assessment.* into v_assessment
  from public.ai_readiness_assessments as assessment
  where assessment.id = v_outbox.assessment_id;
  if not found then return pg_catalog.jsonb_build_object('authorized', false, 'lease_valid', false); end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_assessment.tracking_subject_hash, 71192));
  select outbox.* into v_outbox
  from private.ai_readiness_outbox as outbox
  where outbox.id = p_outbox_id;
  select assessment.* into v_assessment
  from public.ai_readiness_assessments as assessment
  where assessment.id = v_outbox.assessment_id;
  v_lease_valid := v_outbox.status = 'processing'
    and v_outbox.lease_token is not distinct from p_lease_token
    and v_outbox.expires_at > pg_catalog.now()
    and v_outbox.locked_at >= pg_catalog.now() - interval '15 minutes';

  select consent.marketing_consent into v_current_marketing
  from private.ai_readiness_tracking_consents as consent
  where consent.tracking_subject_hash = v_assessment.tracking_subject_hash
  order by consent.recorded_seq desc
  limit 1;

  return pg_catalog.jsonb_build_object(
    'authorized', v_lease_valid
      and v_assessment.marketing_tracking_consent
      and v_assessment.marketing_consent_revoked_at is null
      and coalesce(v_current_marketing, false),
    'lease_valid', v_lease_valid
  );
end;
$$;
revoke all on function public.authorize_ai_readiness_meta_delivery_v1(uuid, uuid) from public, anon, authenticated;
grant execute on function public.authorize_ai_readiness_meta_delivery_v1(uuid, uuid) to service_role;

create or replace function public.claim_ai_readiness_deliveries_v1(p_limit integer default 4)
returns table (
  outbox_id uuid,
  lease_token uuid,
  assessment_id uuid,
  contact_id uuid,
  delivery_type text,
  first_name text,
  last_name text,
  company text,
  email text,
  phone text,
  industry text,
  employee_band text,
  respondent_role text,
  score_total smallint,
  readiness_level text,
  attribution jsonb,
  delivery_payload jsonb,
  submitted_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expired record;
begin
  if p_limit < 1 or p_limit > 10 then raise exception 'invalid_claim_limit'; end if;
  for v_expired in
    update private.ai_readiness_outbox as outbox
    set status = 'dead', delivery_payload = '{}'::jsonb, last_error_code = 'expired', locked_at = null, lease_token = null
    where outbox.status in ('pending', 'processing') and outbox.expires_at <= pg_catalog.now()
    returning outbox.assessment_id, outbox.delivery_type
  loop
    perform private.set_ai_readiness_delivery_status_v1(v_expired.assessment_id, v_expired.delivery_type, 'dead', null);
  end loop;

  for v_expired in
    update private.ai_readiness_outbox as outbox set
      status = 'dead', delivery_payload = '{}'::jsonb,
      last_error_code = 'consent_inactive', locked_at = null, lease_token = null
    from public.ai_readiness_assessments as assessment
    where outbox.assessment_id = assessment.id
      and outbox.delivery_type in ('internal_notification', 'telegram_notification')
      and outbox.status in ('pending', 'processing')
      and (
        assessment.callback_consent_revoked_at is not null
        or not exists (
          select 1 from private.ai_readiness_contact_consents as consent
          where consent.assessment_id = assessment.id
            and consent.consent_type = 'callback'
            and consent.revoked_at is null
        )
      )
    returning outbox.assessment_id, outbox.delivery_type
  loop
    perform private.set_ai_readiness_delivery_status_v1(v_expired.assessment_id, v_expired.delivery_type, 'dead', null);
  end loop;

  for v_expired in
    update private.ai_readiness_outbox as outbox set
      status = 'dead', delivery_payload = '{}'::jsonb,
      last_error_code = 'consent_inactive', locked_at = null, lease_token = null
    from public.ai_readiness_assessments as assessment
    where outbox.assessment_id = assessment.id
      and outbox.delivery_type = 'meta_capi'
      and outbox.status in ('pending', 'processing')
      and not coalesce((
        select consent.marketing_consent
        from private.ai_readiness_tracking_consents as consent
        where consent.tracking_subject_hash = assessment.tracking_subject_hash
        order by consent.recorded_seq desc
        limit 1
      ), false)
    returning outbox.assessment_id, outbox.delivery_type
  loop
    perform private.set_ai_readiness_delivery_status_v1(v_expired.assessment_id, v_expired.delivery_type, 'dead', null);
  end loop;

  return query
  with candidates as (
    select outbox.id
    from private.ai_readiness_outbox as outbox
    join public.ai_readiness_assessments as assessment on assessment.id = outbox.assessment_id
    where ((outbox.status = 'pending' and outbox.available_at <= pg_catalog.now())
       or (outbox.status = 'processing' and outbox.locked_at < pg_catalog.now() - interval '15 minutes'))
      and outbox.expires_at > pg_catalog.now()
      and (
        (outbox.delivery_type = 'meta_capi'
          and assessment.marketing_tracking_consent
          and assessment.marketing_consent_revoked_at is null
          and coalesce((
            select consent.marketing_consent
            from private.ai_readiness_tracking_consents as consent
            where consent.tracking_subject_hash = assessment.tracking_subject_hash
            order by consent.recorded_seq desc
            limit 1
          ), false))
        or (outbox.delivery_type <> 'meta_capi'
          and assessment.callback_consent_revoked_at is null
          and exists (
            select 1 from private.ai_readiness_contact_consents as consent
            where consent.assessment_id = assessment.id
              and consent.consent_type = 'callback'
              and consent.revoked_at is null
          ))
      )
    order by outbox.available_at, outbox.created_at
    for update of outbox skip locked
    limit p_limit
  ), claimed as (
    update private.ai_readiness_outbox as outbox
    set status = 'processing', locked_at = pg_catalog.now(), lease_token = extensions.gen_random_uuid()
    from candidates
    where outbox.id = candidates.id
    returning outbox.id, outbox.lease_token, outbox.assessment_id, outbox.delivery_type, outbox.delivery_payload
  )
  select
    claimed.id,
    claimed.lease_token,
    assessment.id,
    case when claimed.delivery_type = 'internal_notification' then contact.id else null end,
    claimed.delivery_type,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    assessment.score_total,
    assessment.readiness_level,
    assessment.attribution,
    claimed.delivery_payload,
    assessment.submitted_at
  from claimed
  join public.ai_readiness_assessments as assessment on assessment.id = claimed.assessment_id
  join public.crm_contacts as contact on contact.id = assessment.contact_id;
end;
$$;
revoke all on function public.claim_ai_readiness_deliveries_v1(integer) from public, anon, authenticated;
grant execute on function public.claim_ai_readiness_deliveries_v1(integer) to service_role;

create or replace function public.complete_ai_readiness_delivery_v1(
  p_outbox_id uuid,
  p_lease_token uuid,
  p_success boolean,
  p_error_code text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_attempts smallint;
  v_assessment_id uuid;
  v_delivery_type text;
  v_status text;
  v_lease_token uuid;
  v_locked_at timestamptz;
  v_expires_at timestamptz;
begin
  select outbox.attempts, outbox.assessment_id, outbox.delivery_type, outbox.status,
    outbox.lease_token, outbox.locked_at, outbox.expires_at
  into v_attempts, v_assessment_id, v_delivery_type, v_status,
    v_lease_token, v_locked_at, v_expires_at
  from private.ai_readiness_outbox as outbox
  where outbox.id = p_outbox_id
  for update;
  if not found or v_status <> 'processing' or v_lease_token is distinct from p_lease_token then
    raise exception 'delivery_lease_invalid';
  end if;

  if v_expires_at <= pg_catalog.now() then
    update private.ai_readiness_outbox set
      status = 'dead', delivery_payload = '{}'::jsonb,
      locked_at = null, lease_token = null, last_error_code = 'expired'
    where id = p_outbox_id;
    perform private.set_ai_readiness_delivery_status_v1(v_assessment_id, v_delivery_type, 'dead', null);
    return;
  end if;

  if v_locked_at is null or v_locked_at < pg_catalog.now() - interval '15 minutes' then
    v_status := case when v_attempts + 1 >= 8 then 'dead' else 'pending' end;
    update private.ai_readiness_outbox set
      attempts = attempts + 1,
      status = v_status,
      available_at = pg_catalog.now() + interval '10 minutes',
      delivery_payload = case when v_status = 'dead' then '{}'::jsonb else delivery_payload end,
      locked_at = null, lease_token = null, last_error_code = 'lease_expired'
    where id = p_outbox_id;
    perform private.set_ai_readiness_delivery_status_v1(
      v_assessment_id, v_delivery_type,
      case when v_status = 'dead' then 'dead' else 'retry_pending' end,
      null
    );
    return;
  end if;

  update private.ai_readiness_outbox as outbox set
    attempts = case when p_success or p_error_code in ('not_configured', 'not_approved', 'consent_revoked') then outbox.attempts else outbox.attempts + 1 end,
    status = case
      when p_success then 'delivered'
      when p_error_code in ('not_configured', 'not_approved') then 'dead'
      when p_error_code = 'consent_revoked' then 'dead'
      when outbox.attempts + 1 >= 8 then 'dead'
      else 'pending'
    end,
    available_at = case
      when p_success then outbox.available_at
      when p_error_code in ('not_configured', 'not_approved') then outbox.available_at
      when p_error_code = 'consent_revoked' then outbox.available_at
      else pg_catalog.now() + pg_catalog.make_interval(
        secs => least(21600, (600 * pg_catalog.power(2::numeric, outbox.attempts))::integer)
      )
    end,
    locked_at = null,
    lease_token = null,
    last_error_code = case when p_success then null else pg_catalog.left(coalesce(p_error_code, 'unknown'), 80) end,
    delivered_at = case when p_success then pg_catalog.now() else null end,
    delivery_payload = case
      when p_success
        or p_error_code in ('not_configured', 'not_approved')
        or p_error_code = 'consent_revoked'
        or outbox.attempts + 1 >= 8
      then '{}'::jsonb
      else outbox.delivery_payload
    end
  where outbox.id = p_outbox_id and outbox.status = 'processing' and outbox.lease_token = p_lease_token
  returning outbox.attempts, outbox.assessment_id, outbox.delivery_type, outbox.status
  into v_attempts, v_assessment_id, v_delivery_type, v_status;

  if not found then raise exception 'delivery_lease_invalid'; end if;

  if v_delivery_type = 'internal_notification' then
    update public.ai_readiness_assessments set
      notification_status = case
        when p_success then 'delivered'
        when p_error_code in ('not_configured', 'not_approved') then 'not_configured'
        when v_status = 'dead' then 'dead'
        else 'retry_pending'
      end,
      notification_delivered_at = case when p_success then pg_catalog.now() else null end
    where id = v_assessment_id;
  elsif v_delivery_type = 'telegram_notification' then
    update public.ai_readiness_assessments set
      telegram_delivery_status = case
        when p_success then 'delivered'
        when p_error_code in ('not_configured', 'not_approved') then 'not_configured'
        when v_status = 'dead' then 'dead'
        else 'retry_pending'
      end,
      telegram_delivered_at = case when p_success then pg_catalog.now() else null end
    where id = v_assessment_id;
  else
    update public.ai_readiness_assessments set
      meta_delivery_status = case
        when p_success then 'delivered'
        when p_error_code in ('not_configured', 'not_approved') then 'not_configured'
        when v_status = 'dead' then 'dead'
        else 'retry_pending'
      end,
      meta_delivered_at = case when p_success then pg_catalog.now() else null end
    where id = v_assessment_id;
  end if;
end;
$$;
revoke all on function public.complete_ai_readiness_delivery_v1(uuid, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.complete_ai_readiness_delivery_v1(uuid, uuid, boolean, text) to service_role;

create or replace function public.record_ai_readiness_callback_use_v1(
  p_use_id uuid,
  p_assessment_id uuid,
  p_channel text,
  p_target text,
  p_used_at timestamptz,
  p_actor_reference text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_consent private.ai_readiness_contact_consents%rowtype;
  v_existing private.ai_readiness_callback_uses%rowtype;
  v_consent_id uuid;
  v_contact_id uuid;
  v_normalized_target text;
begin
  if p_use_id is null or p_assessment_id is null
    or p_channel is null or p_channel not in ('telephone', 'email_follow_up')
    or p_used_at is null
    or coalesce(pg_catalog.btrim(p_target), '') = ''
    or p_actor_reference is null or p_actor_reference not in ('marco', 'phil', 'simon', 'system')
  then raise exception 'invalid_callback_use'; end if;

  select consent.id into v_consent_id
  from private.ai_readiness_contact_consents as consent
  where consent.assessment_id = p_assessment_id and consent.consent_type = 'callback';
  if not found then raise exception 'callback_consent_not_found'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_consent_id::text, 73302));
  select consent.* into v_consent
  from private.ai_readiness_contact_consents as consent
  join public.ai_readiness_assessments as assessment on assessment.id = consent.assessment_id
  where consent.id = v_consent_id
  for update of consent, assessment;
  if not found then raise exception 'callback_consent_not_found'; end if;
  select assessment.contact_id into strict v_contact_id
  from public.ai_readiness_assessments as assessment
  where assessment.id = p_assessment_id;
  v_normalized_target := case
    when p_channel = 'telephone' then pg_catalog.btrim(p_target)
    else pg_catalog.lower(pg_catalog.btrim(p_target))
  end;
  if (p_channel = 'telephone' and (
      v_normalized_target !~ '^\+[1-9][0-9]{7,14}$'
      or v_normalized_target <> v_consent.subject_phone_e164
    )) or (p_channel = 'email_follow_up' and (
      v_normalized_target !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
      or v_normalized_target <> v_consent.subject_email_normalized
    ))
  then raise exception 'callback_target_not_consented'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_use_id::text, 73301));
  select * into v_existing
  from private.ai_readiness_callback_uses
  where use_id = p_use_id;
  if found then
    if v_existing.consent_id <> v_consent.id
      or v_existing.assessment_id is distinct from p_assessment_id
      or v_existing.channel <> p_channel
      or v_existing.used_at <> p_used_at
      or v_existing.actor_reference <> p_actor_reference
    then raise exception 'callback_use_conflict'; end if;
    return pg_catalog.jsonb_build_object('accepted', true, 'status', 'idempotent', 'use_id', v_existing.use_id);
  end if;
  if v_consent.revoked_at is not null
    or p_used_at < v_consent.granted_at
    or p_used_at < pg_catalog.statement_timestamp() - interval '5 minutes'
    or p_used_at > pg_catalog.statement_timestamp() + interval '5 minutes'
  then raise exception 'callback_consent_inactive'; end if;
  if p_channel = 'email_follow_up' and not exists (
    select 1 from private.ai_readiness_callback_uses
    where consent_id = v_consent.id and channel = 'telephone'
  ) then raise exception 'callback_email_requires_telephone_attempt'; end if;
  if exists (
    select 1 from private.ai_readiness_callback_uses
    where consent_id = v_consent.id and channel = p_channel
  ) then raise exception 'callback_channel_already_used'; end if;

  insert into private.ai_readiness_callback_uses(
    use_id, consent_id, assessment_id, channel, used_at, actor_reference
  ) values (
    p_use_id, v_consent.id, p_assessment_id, p_channel, p_used_at, p_actor_reference
  );

  update private.ai_readiness_contact_consents set
    retention_until = greatest(retention_until, p_used_at + interval '5 years')
  where id = v_consent.id;

  insert into public.crm_contact_events(
    contact_id, event_type, channel, source, summary, details, actor, created_at
  ) values (
    v_contact_id,
    case when p_channel = 'telephone' then 'anruf' else 'email' end,
    case when p_channel = 'telephone' then 'telefon' else 'email' end,
    'ki_readiness_callback',
    case when p_channel = 'telephone' then 'Einmaligen KI-Readiness-Rückruf gestartet' else 'Einmaliges KI-Readiness-E-Mail-Nachfassen gestartet' end,
    pg_catalog.jsonb_build_object(
      'assessment_id', p_assessment_id,
      'consent_id', v_consent.id,
      'use_id', p_use_id,
      'target_hash', pg_catalog.encode(extensions.digest(v_normalized_target, 'sha256'), 'hex'),
      'scope', 'one_time_assessment_follow_up'
    ),
    p_actor_reference,
    p_used_at
  );
  update public.crm_contacts set updated_at = greatest(updated_at, p_used_at) where id = v_contact_id;

  return pg_catalog.jsonb_build_object('accepted', true, 'status', 'recorded', 'use_id', p_use_id);
end;
$$;
revoke all on function public.record_ai_readiness_callback_use_v1(uuid, uuid, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.record_ai_readiness_callback_use_v1(uuid, uuid, text, text, timestamptz, text) to service_role;

create or replace function public.purge_ai_readiness_ephemeral_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_events integer;
  v_rate_limits integer;
  v_outbox integer;
  v_consents integer;
  v_tracking_consents integer;
  v_expired record;
begin
  for v_expired in
    update private.ai_readiness_outbox
    set status = 'dead', delivery_payload = '{}'::jsonb, last_error_code = 'expired', locked_at = null, lease_token = null
    where status in ('pending', 'processing') and expires_at <= pg_catalog.now()
    returning assessment_id, delivery_type
  loop
    perform private.set_ai_readiness_delivery_status_v1(v_expired.assessment_id, v_expired.delivery_type, 'dead', null);
  end loop;

  delete from public.ai_readiness_events
  where created_at < pg_catalog.now() - interval '90 days';
  get diagnostics v_events = row_count;

  delete from private.ai_readiness_rate_limits
  where expires_at < pg_catalog.now();
  get diagnostics v_rate_limits = row_count;

  delete from private.ai_readiness_outbox
  where status in ('delivered', 'dead')
    and created_at < pg_catalog.now() - interval '30 days';
  get diagnostics v_outbox = row_count;

  delete from private.ai_readiness_contact_consents
  where retention_until < pg_catalog.now();
  get diagnostics v_consents = row_count;

  delete from private.ai_readiness_tracking_consents
  where retention_until < pg_catalog.now();
  get diagnostics v_tracking_consents = row_count;

  return pg_catalog.jsonb_build_object(
    'events_deleted', v_events,
    'rate_limits_deleted', v_rate_limits,
    'outbox_deleted', v_outbox,
    'consent_evidence_deleted', v_consents,
    'tracking_consent_evidence_deleted', v_tracking_consents
  );
end;
$$;
revoke all on function public.purge_ai_readiness_ephemeral_v1() from public, anon, authenticated;
grant execute on function public.purge_ai_readiness_ephemeral_v1() to service_role;

comment on table public.ai_readiness_assessments is 'Server-only AI-Readiness assessments and scoped callback consent evidence.';
comment on table public.ai_readiness_events is 'Consent-gated product analytics for the AI-Readiness funnel; never stores contact data or raw answers.';
comment on table private.ai_readiness_tracking_consents is 'Append-only, pseudonymous tracking-consent decisions used to gate analytics and Meta delivery server-side.';
comment on table private.ai_readiness_contact_consents is 'Minimal, service-role-only consent evidence retained independently from CRM contact lifecycle.';
comment on table private.ai_readiness_callback_uses is 'Idempotent evidence for the one telephone callback and optional one email follow-up allowed by the scoped consent.';
comment on function public.record_ai_readiness_tracking_consent_v1(uuid, uuid, uuid, text, text, text, boolean, boolean, text, text) is 'Records an append-only compare-and-swap tracking decision and atomically cancels unsent Meta jobs when marketing consent is withdrawn.';
comment on function public.submit_ai_readiness_lead_v1(jsonb) is 'Atomic, service-role-only AI-Readiness lead and CRM integration. Does not create marketing consent.';
comment on function public.claim_ai_readiness_deliveries_v1(integer) is 'Claims a small retry batch with SKIP LOCKED for the private lead-delivery outbox.';
comment on function public.authorize_ai_readiness_meta_delivery_v1(uuid, uuid) is 'Revalidates the current marketing consent and lease immediately before an external Meta delivery.';
comment on function public.record_ai_readiness_callback_use_v1(uuid, uuid, text, text, timestamptz, text) is 'Atomically records a scoped callback use only for the consented phone/email snapshot, mirrors it into CRM history, and extends consent-evidence retention for five years.';
comment on function public.revoke_ai_readiness_callback_consent_v1(uuid, timestamptz, text) is 'Revokes the scoped callback consent atomically in ledger and assessment, cancels pending internal notifications, and records the change in CRM history.';
comment on function public.revoke_ai_readiness_ai_consent_v1(uuid, timestamptz, text) is 'Revokes AI-processing consent atomically, invalidates any active analysis lease, and records the change in CRM history.';
comment on function public.authorize_ai_readiness_contact_delivery_v1(uuid, uuid) is 'Revalidates current callback consent and lease immediately before an internal email or Telegram notification.';
comment on function public.claim_ai_readiness_analysis_v1(uuid, uuid, uuid) is 'Revalidates current AI-processing consent and claims an expiring single-writer lease before an external AI analysis call.';
comment on function public.complete_ai_readiness_analysis_v1(uuid, uuid, jsonb) is 'Revalidates AI-processing consent, persists one leased result idempotently, and prevents parallel replay costs.';
comment on function public.purge_ai_readiness_ephemeral_v1() is 'Deletes consent-gated funnel events after 90 days and old delivery/rate-limit state.';


-- Atomare Finalisierung auf den freigegebenen Micro-Funnel v2.

drop function if exists public.purge_ai_readiness_ephemeral_v1();
drop function if exists public.record_ai_readiness_callback_use_v1(uuid, uuid, text, text, timestamptz, text);
drop function if exists public.complete_ai_readiness_delivery_v1(uuid, uuid, boolean, text);
drop function if exists public.claim_ai_readiness_deliveries_v1(integer);
drop function if exists public.authorize_ai_readiness_meta_delivery_v1(uuid, uuid);
drop function if exists public.revoke_ai_readiness_ai_consent_v1(uuid, timestamptz, text);
drop function if exists public.revoke_ai_readiness_callback_consent_v1(uuid, timestamptz, text);
drop function if exists public.authorize_ai_readiness_contact_delivery_v1(uuid, uuid);
drop function if exists private.set_ai_readiness_delivery_status_v1(uuid, text, text, timestamptz);
drop function if exists public.submit_ai_readiness_lead_v1(jsonb);
drop function if exists public.complete_ai_readiness_analysis_v1(uuid, uuid, jsonb);
drop function if exists public.claim_ai_readiness_analysis_v1(uuid, uuid, uuid);
drop function if exists private.ai_readiness_phone_key(text);

drop table if exists private.ai_readiness_callback_uses;
drop table if exists private.ai_readiness_contact_consents;

drop index if exists public.ai_readiness_assessments_pending_idx;
alter table public.ai_readiness_assessments
  drop column if exists analysis_status,
  drop column if exists analysis_result,
  drop column if exists analysis_lease_token,
  drop column if exists analysis_locked_at,
  drop column if exists analyzed_at,
  drop column if exists callback_consent_version,
  drop column if exists callback_consent_text,
  drop column if exists callback_consent_hash,
  drop column if exists callback_consent_granted_at,
  drop column if exists callback_consent_revoked_at,
  drop column if exists ai_consent_version,
  drop column if exists ai_consent_text,
  drop column if exists ai_consent_hash,
  drop column if exists ai_consent_granted_at,
  drop column if exists ai_consent_revoked_at,
  add column result jsonb not null default '{}'::jsonb
    check (jsonb_typeof(result) = 'object' and pg_column_size(result) <= 131072),
  add column submission_fingerprint text
    check (submission_fingerprint is null or submission_fingerprint ~ '^[0-9a-f]{64}$'),
  add column privacy_notice_acknowledged_at timestamptz not null default now(),
  add column newsletter_status text not null default 'not_requested'
    check (newsletter_status in ('not_requested', 'doi_pending', 'already_active', 'confirmed')),
  add column newsletter_marketing_consent_id uuid references public.crm_marketing_consents(id) on delete restrict,
  add column newsletter_requested_at timestamptz,
  add column newsletter_confirmed_at timestamptz,
  add constraint ai_readiness_newsletter_timeline_check check (
    (newsletter_status = 'not_requested' and newsletter_marketing_consent_id is null and newsletter_requested_at is null and newsletter_confirmed_at is null)
    or (newsletter_status = 'doi_pending' and newsletter_marketing_consent_id is not null and newsletter_requested_at is not null and newsletter_confirmed_at is null)
    or (newsletter_status = 'already_active' and newsletter_marketing_consent_id is not null and newsletter_requested_at is not null)
    or (newsletter_status = 'confirmed' and newsletter_marketing_consent_id is not null and newsletter_requested_at is not null and newsletter_confirmed_at is not null)
  );
alter table public.ai_readiness_assessments alter column result drop default;

alter table private.ai_readiness_rate_limits drop constraint if exists ai_readiness_rate_limits_scope_check;
alter table private.ai_readiness_rate_limits add constraint ai_readiness_rate_limits_scope_check
  check (scope in ('event_session', 'consent_session', 'lead_ip', 'lead_email'));

alter table private.ai_readiness_outbox drop constraint if exists ai_readiness_outbox_delivery_type_check;
alter table private.ai_readiness_outbox add constraint ai_readiness_outbox_delivery_type_check
  check (delivery_type in ('internal_notification', 'telegram_notification', 'telegram_booking', 'newsletter_double_optin', 'meta_capi', 'meta_schedule'));

create table if not exists private.ai_readiness_booking_receipts (
  id uuid primary key default extensions.gen_random_uuid(),
  booking_uid text not null unique check (char_length(booking_uid) between 6 and 160),
  assessment_id uuid not null references public.ai_readiness_assessments(id) on delete restrict,
  event_type_id bigint not null,
  event_type_slug text not null check (char_length(event_type_slug) between 1 and 120),
  body_hash text not null check (body_hash ~ '^[0-9a-f]{64}$'),
  booking_created_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index if not exists ai_readiness_booking_receipts_assessment_idx on private.ai_readiness_booking_receipts(assessment_id, received_at desc);
alter table private.ai_readiness_booking_receipts enable row level security;
revoke all on private.ai_readiness_booking_receipts from public, anon, authenticated;
grant select, insert, update, delete on private.ai_readiness_booking_receipts to service_role;

alter table public.crm_marketing_consents
  add column if not exists double_optin_requested_at timestamptz;
alter table public.crm_marketing_consents drop constraint if exists crm_marketing_consents_doi_timeline_check;
alter table public.crm_marketing_consents add constraint crm_marketing_consents_doi_timeline_check check (
  double_optin_confirmed_at is null
  or double_optin_requested_at is null
  or double_optin_confirmed_at >= double_optin_requested_at
);

create or replace view public.v_email_marketing_list
as
select distinct on (contact.id)
  contact.id as contact_id,
  contact.first_name,
  contact.last_name,
  contact.email,
  contact.company,
  consent.granted_at,
  consent.source,
  consent.double_optin_confirmed_at
from public.crm_marketing_consents as consent
join public.crm_contacts as contact on contact.id = consent.contact_id
where consent.channel = 'email'
  and consent.revoked_at is null
  and (consent.double_optin_requested_at is null or consent.double_optin_confirmed_at is not null)
order by contact.id, consent.granted_at desc;
do $$
begin
  if pg_catalog.current_setting('server_version_num')::integer >= 150000 then
    execute 'alter view public.v_email_marketing_list set (security_invoker = true)';
  end if;
end;
$$;
revoke all on public.v_email_marketing_list from public, anon, authenticated;
grant select on public.v_email_marketing_list to service_role;

create or replace function private.ai_readiness_submission_fingerprint_v1(p_payload jsonb)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.jsonb_build_object(
      'assessment_version', p_payload ->> 'assessment_version',
      'contact', p_payload -> 'contact',
      'profile', p_payload -> 'profile',
      'answers', p_payload -> 'answers',
      'newsletter', pg_catalog.jsonb_build_object(
        'granted', coalesce((p_payload #>> '{consents,newsletter,granted}')::boolean, false),
        'version', p_payload #>> '{consents,newsletter,version}',
        'text', p_payload #>> '{consents,newsletter,text}'
      )
    )::text,
    'UTF8'
  ), 'sha256'), 'hex');
$$;
revoke all on function private.ai_readiness_submission_fingerprint_v1(jsonb) from public, anon, authenticated;
grant execute on function private.ai_readiness_submission_fingerprint_v1(jsonb) to service_role;

create or replace function public.restore_ai_readiness_lead_v1(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_submission_id uuid;
  v_run_id uuid;
  v_fingerprint text;
  v_assessment public.ai_readiness_assessments%rowtype;
begin
  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' or pg_catalog.pg_column_size(p_payload) > 262144
  then raise exception 'invalid_payload'; end if;
  v_submission_id := (p_payload ->> 'submission_id')::uuid;
  v_run_id := (p_payload ->> 'run_id')::uuid;
  v_fingerprint := private.ai_readiness_submission_fingerprint_v1(p_payload);
  select assessment.* into v_assessment
  from public.ai_readiness_assessments as assessment
  where assessment.submission_id = v_submission_id;
  if not found then return pg_catalog.jsonb_build_object('found', false); end if;
  if v_assessment.run_id <> v_run_id
    or v_assessment.session_hash <> p_payload ->> 'session_hash'
    or v_assessment.submission_fingerprint is distinct from v_fingerprint
  then raise exception 'submission_conflict'; end if;
  return pg_catalog.jsonb_build_object(
    'found', true, 'accepted', true, 'status', 'idempotent',
    'assessment_id', v_assessment.id, 'contact_id', v_assessment.contact_id,
    'contact_created', false, 'dedupe_status', 'idempotent',
    'newsletter_status', v_assessment.newsletter_status,
    'meta_lead_eligible', v_assessment.marketing_tracking_consent,
    'result', v_assessment.result
  );
end;
$$;
revoke all on function public.restore_ai_readiness_lead_v1(jsonb) from public, anon, authenticated;
grant execute on function public.restore_ai_readiness_lead_v1(jsonb) to service_role;

create or replace function public.submit_ai_readiness_lead_v2(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c_privacy_version constant text := 'privacy-ai-readiness-v2-2026-07-19';
  c_newsletter_version constant text := 'newsletter-email-v1-2026-07-19';
  c_newsletter_text constant text := 'Ja, ich möchte regelmäßig praxistaugliche KI-Impulse, Einladungen und Angebote von Synclaro per E-Mail erhalten. Die Anmeldung wird per Double-Opt-in bestätigt; eine Abmeldung ist jederzeit möglich.';
  c_cookie_version constant text := 'cookie-v1-2026-07-18';
  c_analytics_text constant text := 'Analyse: Synclaro speichert pseudonyme Funnel-Ereignisse, um Nutzung und Abbrüche des AI Readiness Tests auszuwerten. Testantworten und Kontaktdaten werden dabei nicht als Ereigniseigenschaften gespeichert.';
  c_marketing_text constant text := 'Marketing einschließlich Meta: Synclaro darf Meta Pixel und Conversions API einsetzen, um die Kampagne zu messen und Werbung zu personalisieren. Dabei können Online-Kennungen, Browser- und Gerätedaten sowie gehashte Kontaktdaten an Meta Platforms Ireland Limited übermittelt werden.';
  v_assessment_id uuid;
  v_submission_id uuid;
  v_run_id uuid;
  v_contact_id uuid;
  v_contact_created boolean := false;
  v_dedupe_status text := 'new';
  v_email text;
  v_email_ids uuid[];
  v_allowed boolean;
  v_marketing_tracking boolean;
  v_analytics boolean;
  v_newsletter_requested boolean;
  v_newsletter_status text := 'not_requested';
  v_newsletter_consent_id uuid;
  v_newsletter_requested_at timestamptz;
  v_newsletter_confirmed_at timestamptz;
  v_lead_fit boolean;
  v_submission_fingerprint text;
  v_existing_assessment public.ai_readiness_assessments%rowtype;
  v_tracking_decision private.ai_readiness_tracking_consents%rowtype;
  v_global_tracking_decision private.ai_readiness_tracking_consents%rowtype;
begin
  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' or pg_catalog.pg_column_size(p_payload) > 262144
  then raise exception 'invalid_payload'; end if;
  v_assessment_id := (p_payload ->> 'assessment_id')::uuid;
  v_submission_id := (p_payload ->> 'submission_id')::uuid;
  v_run_id := (p_payload ->> 'run_id')::uuid;
  v_submission_fingerprint := private.ai_readiness_submission_fingerprint_v1(p_payload);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_submission_id::text, 61807));

  select assessment.* into v_existing_assessment
  from public.ai_readiness_assessments as assessment
  where assessment.submission_id = v_submission_id;
  if found then
    if v_existing_assessment.run_id <> v_run_id
      or v_existing_assessment.session_hash <> p_payload ->> 'session_hash'
      or v_existing_assessment.submission_fingerprint is distinct from v_submission_fingerprint
    then raise exception 'submission_conflict'; end if;
    return pg_catalog.jsonb_build_object(
      'accepted', true, 'status', 'idempotent', 'assessment_id', v_existing_assessment.id,
      'contact_id', v_existing_assessment.contact_id, 'contact_created', false, 'dedupe_status', 'idempotent',
      'newsletter_status', v_existing_assessment.newsletter_status,
      'meta_lead_eligible', v_existing_assessment.marketing_tracking_consent,
      'result', v_existing_assessment.result
    );
  end if;
  v_assessment_id := (p_payload ->> 'assessment_id')::uuid;

  if p_payload ->> 'privacy_version' <> c_privacy_version
    or p_payload #>> '{consents,privacyNotice,version}' <> c_privacy_version
    or coalesce((p_payload #>> '{consents,privacyNotice,acknowledged}')::boolean, false) is not true
  then raise exception 'privacy_notice_mismatch'; end if;
  if p_payload #>> '{consents,newsletter,version}' <> c_newsletter_version
    or p_payload #>> '{consents,newsletter,text}' <> c_newsletter_text
  then raise exception 'newsletter_consent_mismatch'; end if;
  v_newsletter_requested := coalesce((p_payload #>> '{consents,newsletter,granted}')::boolean, false);
  if pg_catalog.jsonb_typeof(p_payload -> 'result') <> 'object' or pg_catalog.pg_column_size(p_payload -> 'result') > 131072
  then raise exception 'result_invalid'; end if;
  if p_payload ->> 'tracking_subject_hash' !~ '^[0-9a-f]{64}$' then raise exception 'tracking_subject_invalid'; end if;

  v_marketing_tracking := coalesce((p_payload #>> '{consents,marketing,granted}')::boolean, false);
  v_analytics := coalesce((p_payload #>> '{consents,analytics,granted}')::boolean, false);
  if p_payload #>> '{consents,marketing,version}' <> c_cookie_version
    or p_payload #>> '{consents,analytics,version}' <> c_cookie_version
  then raise exception 'tracking_consent_mismatch'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_payload ->> 'tracking_subject_hash', 71192));
  select * into v_tracking_decision
  from private.ai_readiness_tracking_consents
  where tracking_subject_hash = p_payload ->> 'tracking_subject_hash'
    and session_hash = p_payload ->> 'session_hash'
    and run_id = v_run_id
  order by recorded_seq desc limit 1;
  select * into v_global_tracking_decision
  from private.ai_readiness_tracking_consents
  where tracking_subject_hash = p_payload ->> 'tracking_subject_hash'
  order by recorded_seq desc limit 1;
  if v_tracking_decision.id is null or v_global_tracking_decision.id is null
    or v_tracking_decision.consent_version <> c_cookie_version
    or v_tracking_decision.analytics_consent <> v_analytics
    or v_tracking_decision.marketing_consent <> v_marketing_tracking
    or v_global_tracking_decision.consent_version <> c_cookie_version
    or v_global_tracking_decision.analytics_consent <> v_analytics
    or v_global_tracking_decision.marketing_consent <> v_marketing_tracking
  then raise exception 'tracking_consent_not_current'; end if;

  v_email := pg_catalog.lower(pg_catalog.btrim(p_payload #>> '{contact,email}'));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
    or pg_catalog.btrim(p_payload #>> '{contact,firstName}') = ''
    or pg_catalog.btrim(p_payload #>> '{contact,lastName}') = ''
    or pg_catalog.btrim(p_payload #>> '{contact,company}') = ''
  then raise exception 'invalid_contact'; end if;

  select rate.allowed into v_allowed from public.consume_ai_readiness_rate_limit_v1('lead_ip', p_payload ->> 'rate_ip_hash') as rate;
  if not v_allowed then raise exception 'rate_limited'; end if;
  select rate.allowed into v_allowed from public.consume_ai_readiness_rate_limit_v1('lead_email', p_payload ->> 'rate_email_hash') as rate;
  if not v_allowed then raise exception 'rate_limited'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('email:' || v_email, 61807));

  select coalesce(pg_catalog.array_agg(contact.id order by contact.created_at), '{}'::uuid[]) into v_email_ids
  from public.crm_contacts as contact where pg_catalog.lower(pg_catalog.btrim(contact.email)) = v_email;
  if pg_catalog.cardinality(v_email_ids) = 1 then
    v_contact_id := v_email_ids[1];
    v_dedupe_status := 'email_match';
  end if;
  if v_contact_id is null then
    v_dedupe_status := case when pg_catalog.cardinality(v_email_ids) > 1 then 'dedupe_review' else 'new' end;
    insert into public.crm_contacts(
      first_name, last_name, email, phone, company, contact_type, contact_source,
      lead_source, first_touch_channel, tags, pipeline_stage, created_at, updated_at
    ) values (
      pg_catalog.btrim(p_payload #>> '{contact,firstName}'),
      pg_catalog.btrim(p_payload #>> '{contact,lastName}'),
      v_email, null, pg_catalog.btrim(p_payload #>> '{contact,company}'),
      'lead', 'marketing', 'marketing', 'website_formular',
      case when v_dedupe_status = 'dedupe_review'
        then array['ai-readiness', 'ki-readiness-test', 'dedupe-review']::text[]
        else array['ai-readiness', 'ki-readiness-test']::text[] end,
      'neu', pg_catalog.now(), pg_catalog.now()
    ) returning id into v_contact_id;
    v_contact_created := true;
  else
    update public.crm_contacts as contact set
      company = case when coalesce(pg_catalog.btrim(contact.company), '') = '' then pg_catalog.btrim(p_payload #>> '{contact,company}') else contact.company end,
      tags = (select pg_catalog.array_agg(distinct item.tag) from pg_catalog.unnest(coalesce(contact.tags, '{}'::text[]) || array['ai-readiness', 'ki-readiness-test']::text[]) as item(tag)),
      updated_at = pg_catalog.now()
    where contact.id = v_contact_id;
  end if;

  v_lead_fit := (p_payload #>> '{profile,mitarbeiter}') in ('solo', '1-5', '6-10', '11-20')
    and (p_payload #>> '{profile,rolle}') in ('inhaber', 'geschaeftsfuehrung');
  if v_newsletter_requested then
    v_newsletter_requested_at := pg_catalog.statement_timestamp();
    insert into public.crm_marketing_consents(
      contact_id, channel, granted_at, source, consent_text, evidence,
      double_optin_requested_at, double_optin_confirmed_at
    ) values (
      v_contact_id, 'email', v_newsletter_requested_at, 'ki-readiness-test', c_newsletter_text,
      pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'email', v_email, 'submission_id', v_submission_id, 'assessment_id', v_assessment_id,
        'consent_version', c_newsletter_version,
        'ip_hash', nullif(p_payload #>> '{consents,evidence,ipHash}', '')
      )),
      v_newsletter_requested_at, null
    ) on conflict (contact_id, channel) where revoked_at is null do nothing;
    select consent.id, consent.double_optin_requested_at, consent.double_optin_confirmed_at,
      case when consent.double_optin_requested_at is not null and consent.double_optin_confirmed_at is null
        then 'doi_pending' else 'already_active' end
    into v_newsletter_consent_id, v_newsletter_requested_at, v_newsletter_confirmed_at, v_newsletter_status
    from public.crm_marketing_consents as consent
    where consent.contact_id = v_contact_id and consent.channel = 'email' and consent.revoked_at is null
    order by consent.granted_at desc limit 1;
    if v_newsletter_consent_id is null then raise exception 'newsletter_consent_not_persisted'; end if;
  end if;

  insert into public.ai_readiness_assessments(
    id, submission_id, run_id, session_hash, submission_fingerprint, contact_id, assessment_version, privacy_version,
    industry, employee_band, respondent_role, primary_goal, lead_fit,
    answers, score_total, score_breakdown, readiness_level, result, attribution, tracking_subject_hash,
    privacy_notice_acknowledged_at, newsletter_status, newsletter_marketing_consent_id,
    newsletter_requested_at, newsletter_confirmed_at,
    analytics_consent, analytics_consent_version, analytics_consent_text, analytics_consent_hash, analytics_consent_granted_at,
    marketing_tracking_consent, marketing_consent_version, marketing_consent_text, marketing_consent_hash, marketing_consent_granted_at,
    consent_evidence_ip_hash, consent_evidence_user_agent, meta_delivery_status
  ) values (
    v_assessment_id, v_submission_id, v_run_id, p_payload ->> 'session_hash', v_submission_fingerprint, v_contact_id,
    p_payload ->> 'assessment_version', c_privacy_version,
    p_payload #>> '{profile,branche}', p_payload #>> '{profile,mitarbeiter}', p_payload #>> '{profile,rolle}', p_payload #>> '{profile,hauptziel}', v_lead_fit,
    p_payload -> 'answers', (p_payload #>> '{baseline,scores,total,percent}')::smallint,
    p_payload #> '{baseline,scores}', p_payload #>> '{baseline,level}', p_payload -> 'result', p_payload -> 'attribution', p_payload ->> 'tracking_subject_hash',
    pg_catalog.statement_timestamp(), v_newsletter_status, v_newsletter_consent_id, v_newsletter_requested_at, v_newsletter_confirmed_at,
    v_analytics, c_cookie_version, case when v_analytics then c_analytics_text else null end,
    case when v_analytics then pg_catalog.encode(extensions.digest(c_analytics_text, 'sha256'), 'hex') else null end,
    case when v_analytics then v_tracking_decision.decided_at else null end,
    v_marketing_tracking, c_cookie_version, case when v_marketing_tracking then c_marketing_text else null end,
    case when v_marketing_tracking then pg_catalog.encode(extensions.digest(c_marketing_text, 'sha256'), 'hex') else null end,
    case when v_marketing_tracking then v_tracking_decision.decided_at else null end,
    nullif(p_payload #>> '{consents,evidence,ipHash}', ''), pg_catalog.left(p_payload #>> '{consents,evidence,userAgent}', 500),
    case when v_marketing_tracking then 'pending' else 'not_requested' end
  );

  update private.ai_readiness_tracking_consents set assessment_id = v_assessment_id
  where run_id = v_run_id and session_hash = p_payload ->> 'session_hash'
    and tracking_subject_hash = p_payload ->> 'tracking_subject_hash' and assessment_id is null;

  insert into public.crm_contact_events(contact_id, event_type, channel, source, summary, details, actor, created_at)
  values (
    v_contact_id, case when v_contact_created then 'erstkontakt' else 'folgekontakt' end,
    'website_formular', 'ki_readiness_test', 'KI-Readiness-Auswertung angefordert',
    pg_catalog.jsonb_build_object(
      'assessment_id', v_assessment_id, 'submission_id', v_submission_id,
      'score', (p_payload #>> '{baseline,scores,total,percent}')::smallint,
      'readiness_level', p_payload #>> '{baseline,level}',
      'industry', p_payload #>> '{profile,branche}', 'employee_band', p_payload #>> '{profile,mitarbeiter}',
      'lead_fit', v_lead_fit, 'newsletter_status', v_newsletter_status,
      'privacy_version', c_privacy_version
    ), 'system', pg_catalog.now()
  );

  if v_analytics then
    update public.ai_readiness_events set assessment_id = v_assessment_id
    where session_hash = p_payload ->> 'session_hash' and run_id = v_run_id and assessment_id is null;
  else
    delete from public.ai_readiness_events
    where session_hash = p_payload ->> 'session_hash' and run_id = v_run_id and assessment_id is null;
  end if;

  insert into private.ai_readiness_outbox(assessment_id, delivery_type, available_at)
  values (v_assessment_id, 'internal_notification', pg_catalog.now()) on conflict do nothing;
  if v_newsletter_requested then
    insert into private.ai_readiness_outbox(assessment_id, delivery_type, available_at, delivery_payload)
    values (v_assessment_id, 'telegram_notification', pg_catalog.now(), pg_catalog.jsonb_build_object('newsletterStatus', v_newsletter_status))
    on conflict do nothing;
  end if;
  if v_newsletter_status = 'doi_pending' then
    if coalesce(pg_catalog.btrim(p_payload ->> 'newsletter_confirmation_token'), '') = ''
      or pg_catalog.char_length(p_payload ->> 'newsletter_confirmation_token') > 240
    then raise exception 'newsletter_confirmation_token_invalid'; end if;
    insert into private.ai_readiness_outbox(assessment_id, delivery_type, available_at, expires_at, delivery_payload)
    values (
      v_assessment_id, 'newsletter_double_optin', pg_catalog.now(), pg_catalog.now() + interval '24 hours',
      pg_catalog.jsonb_build_object('confirmationToken', p_payload ->> 'newsletter_confirmation_token')
    ) on conflict do nothing;
  end if;
  if v_marketing_tracking then
    insert into private.ai_readiness_outbox(assessment_id, delivery_type, available_at, expires_at, delivery_payload)
    values (
      v_assessment_id, 'meta_capi', pg_catalog.now(), pg_catalog.now() + interval '7 days',
      pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'clientIpAddress', nullif(pg_catalog.left(p_payload #>> '{delivery_context,clientIpAddress}', 80), ''),
        'emailSha256', pg_catalog.encode(extensions.digest(v_email, 'sha256'), 'hex')
      ))
    ) on conflict do nothing;
  end if;

  delete from private.ai_readiness_rate_limits where ctid in (
    select ctid from private.ai_readiness_rate_limits where expires_at < pg_catalog.now() limit 500
  );
  return pg_catalog.jsonb_build_object(
    'accepted', true, 'status', 'created', 'assessment_id', v_assessment_id,
    'contact_id', v_contact_id, 'contact_created', v_contact_created,
    'dedupe_status', v_dedupe_status, 'newsletter_status', v_newsletter_status
  );
end;
$$;
revoke all on function public.submit_ai_readiness_lead_v2(jsonb) from public, anon, authenticated;
grant execute on function public.submit_ai_readiness_lead_v2(jsonb) to service_role;

create or replace function private.set_ai_readiness_delivery_status_v2(
  p_assessment_id uuid, p_delivery_type text, p_status text, p_delivered_at timestamptz default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_delivery_type not in ('internal_notification', 'telegram_notification', 'telegram_booking', 'newsletter_double_optin', 'meta_capi', 'meta_schedule')
    or p_status not in ('delivered', 'retry_pending', 'not_configured', 'dead')
  then raise exception 'invalid_delivery_status'; end if;
  if p_delivery_type = 'internal_notification' then
    update public.ai_readiness_assessments set notification_status = p_status,
      notification_delivered_at = case when p_status = 'delivered' then p_delivered_at else null end
    where id = p_assessment_id;
  elsif p_delivery_type = 'telegram_notification' then
    update public.ai_readiness_assessments set telegram_delivery_status = p_status,
      telegram_delivered_at = case when p_status = 'delivered' then p_delivered_at else null end
    where id = p_assessment_id;
  elsif p_delivery_type in ('meta_capi', 'meta_schedule') then
    update public.ai_readiness_assessments set meta_delivery_status = p_status,
      meta_delivered_at = case when p_status = 'delivered' then p_delivered_at else null end
    where id = p_assessment_id;
  end if;
end;
$$;
revoke all on function private.set_ai_readiness_delivery_status_v2(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function private.set_ai_readiness_delivery_status_v2(uuid, text, text, timestamptz) to service_role;

create or replace function public.authorize_ai_readiness_delivery_v2(p_outbox_id uuid, p_lease_token uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_outbox private.ai_readiness_outbox%rowtype;
  v_assessment public.ai_readiness_assessments%rowtype;
  v_consent public.crm_marketing_consents%rowtype;
  v_current_marketing boolean := false;
  v_lease_valid boolean := false;
  v_authorized boolean := false;
begin
  select * into v_outbox from private.ai_readiness_outbox where id = p_outbox_id;
  if not found then return pg_catalog.jsonb_build_object('authorized', false, 'lease_valid', false); end if;
  select * into v_assessment from public.ai_readiness_assessments where id = v_outbox.assessment_id;
  if not found then return pg_catalog.jsonb_build_object('authorized', false, 'lease_valid', false); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_outbox.id::text, 71193));
  select * into v_outbox from private.ai_readiness_outbox where id = p_outbox_id;
  v_lease_valid := v_outbox.status = 'processing'
    and v_outbox.lease_token is not distinct from p_lease_token
    and v_outbox.expires_at > pg_catalog.now()
    and v_outbox.locked_at >= pg_catalog.now() - interval '15 minutes';
  if not v_lease_valid then return pg_catalog.jsonb_build_object('authorized', false, 'lease_valid', false); end if;
  if v_outbox.delivery_type in ('internal_notification', 'telegram_booking') then
    v_authorized := true;
  elsif v_outbox.delivery_type = 'telegram_notification' then
    v_authorized := v_assessment.newsletter_status in ('doi_pending', 'already_active', 'confirmed');
  elsif v_outbox.delivery_type = 'newsletter_double_optin' then
    select * into v_consent from public.crm_marketing_consents
    where id = v_assessment.newsletter_marketing_consent_id;
    v_authorized := found and v_consent.revoked_at is null
      and v_consent.double_optin_requested_at is not null
      and v_consent.double_optin_confirmed_at is null;
  elsif v_outbox.delivery_type in ('meta_capi', 'meta_schedule') then
    select consent.marketing_consent into v_current_marketing
    from private.ai_readiness_tracking_consents as consent
    where consent.tracking_subject_hash = v_assessment.tracking_subject_hash
    order by consent.recorded_seq desc limit 1;
    v_authorized := v_assessment.marketing_tracking_consent
      and v_assessment.marketing_consent_revoked_at is null
      and coalesce(v_current_marketing, false);
  end if;
  return pg_catalog.jsonb_build_object('authorized', v_authorized, 'lease_valid', v_lease_valid);
end;
$$;
revoke all on function public.authorize_ai_readiness_delivery_v2(uuid, uuid) from public, anon, authenticated;
grant execute on function public.authorize_ai_readiness_delivery_v2(uuid, uuid) to service_role;

create or replace function public.claim_ai_readiness_deliveries_v2(p_limit integer default 4)
returns table (
  outbox_id uuid, lease_token uuid, assessment_id uuid, submission_id uuid, contact_id uuid,
  delivery_type text, first_name text, last_name text, company text, email text,
  industry text, employee_band text, respondent_role text, score_total smallint,
  readiness_level text, attribution jsonb, delivery_payload jsonb, submitted_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare v_expired record;
begin
  if p_limit < 1 or p_limit > 10 then raise exception 'invalid_claim_limit'; end if;
  for v_expired in
    update private.ai_readiness_outbox as outbox set status = 'dead', delivery_payload = '{}'::jsonb,
      last_error_code = 'expired', locked_at = null, lease_token = null
    where outbox.status in ('pending', 'processing') and outbox.expires_at <= pg_catalog.now()
    returning outbox.assessment_id, outbox.delivery_type
  loop
    perform private.set_ai_readiness_delivery_status_v2(v_expired.assessment_id, v_expired.delivery_type, 'dead', null);
  end loop;

  return query
  with candidates as (
    select outbox.id
    from private.ai_readiness_outbox as outbox
    join public.ai_readiness_assessments as assessment on assessment.id = outbox.assessment_id
    where ((outbox.status = 'pending' and outbox.available_at <= pg_catalog.now())
      or (outbox.status = 'processing' and outbox.locked_at < pg_catalog.now() - interval '15 minutes'))
      and outbox.expires_at > pg_catalog.now()
      and (
        outbox.delivery_type in ('internal_notification', 'telegram_booking')
        or (outbox.delivery_type = 'telegram_notification' and assessment.newsletter_status in ('doi_pending', 'already_active', 'confirmed'))
        or (outbox.delivery_type = 'newsletter_double_optin' and assessment.newsletter_status = 'doi_pending')
        or (outbox.delivery_type in ('meta_capi', 'meta_schedule') and assessment.marketing_tracking_consent)
      )
    order by outbox.available_at, outbox.created_at
    for update of outbox skip locked limit p_limit
  ), claimed as (
    update private.ai_readiness_outbox as outbox
    set status = 'processing', locked_at = pg_catalog.now(), lease_token = extensions.gen_random_uuid()
    from candidates where outbox.id = candidates.id
    returning outbox.id, outbox.lease_token, outbox.assessment_id, outbox.delivery_type, outbox.delivery_payload
  )
  select claimed.id, claimed.lease_token, assessment.id, assessment.submission_id,
    case when claimed.delivery_type = 'internal_notification' then contact.id else null end,
    claimed.delivery_type, null::text, null::text, null::text,
    case when claimed.delivery_type = 'newsletter_double_optin' then contact.email else null end,
    null::text, null::text, null::text, assessment.score_total, assessment.readiness_level,
    assessment.attribution, claimed.delivery_payload, assessment.submitted_at
  from claimed
  join public.ai_readiness_assessments as assessment on assessment.id = claimed.assessment_id
  join public.crm_contacts as contact on contact.id = assessment.contact_id;
end;
$$;
revoke all on function public.claim_ai_readiness_deliveries_v2(integer) from public, anon, authenticated;
grant execute on function public.claim_ai_readiness_deliveries_v2(integer) to service_role;

create or replace function public.complete_ai_readiness_delivery_v2(
  p_outbox_id uuid, p_lease_token uuid, p_success boolean, p_error_code text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_attempts smallint;
  v_assessment_id uuid;
  v_delivery_type text;
  v_status text;
  v_locked_at timestamptz;
  v_expires_at timestamptz;
begin
  select attempts, assessment_id, delivery_type, status, locked_at, expires_at
  into v_attempts, v_assessment_id, v_delivery_type, v_status, v_locked_at, v_expires_at
  from private.ai_readiness_outbox
  where id = p_outbox_id and lease_token = p_lease_token for update;
  if not found or v_status <> 'processing' then raise exception 'delivery_lease_invalid'; end if;
  if v_expires_at <= pg_catalog.now() or v_locked_at < pg_catalog.now() - interval '15 minutes' then
    update private.ai_readiness_outbox set attempts = attempts + 1, status = 'dead',
      delivery_payload = '{}'::jsonb, locked_at = null, lease_token = null, last_error_code = 'expired'
    where id = p_outbox_id;
    perform private.set_ai_readiness_delivery_status_v2(v_assessment_id, v_delivery_type, 'dead', null);
    return;
  end if;
  update private.ai_readiness_outbox as outbox set
    attempts = case when p_success or p_error_code in ('not_configured', 'not_approved', 'consent_revoked') then outbox.attempts else outbox.attempts + 1 end,
    status = case
      when p_success then 'delivered'
      when p_error_code in ('not_configured', 'not_approved', 'consent_revoked') then 'dead'
      when outbox.attempts + 1 >= 8 then 'dead' else 'pending' end,
    available_at = case when p_success or p_error_code in ('not_configured', 'not_approved', 'consent_revoked') then outbox.available_at
      else pg_catalog.now() + pg_catalog.make_interval(secs => least(21600, (600 * pg_catalog.power(2::numeric, outbox.attempts))::integer)) end,
    locked_at = null, lease_token = null,
    last_error_code = case when p_success then null else pg_catalog.left(coalesce(p_error_code, 'unknown'), 80) end,
    delivered_at = case when p_success then pg_catalog.now() else null end,
    delivery_payload = case when p_success or p_error_code in ('not_configured', 'not_approved', 'consent_revoked') or outbox.attempts + 1 >= 8
      then '{}'::jsonb else outbox.delivery_payload end
  where outbox.id = p_outbox_id
  returning outbox.status into v_status;
  perform private.set_ai_readiness_delivery_status_v2(
    v_assessment_id, v_delivery_type,
    case when p_success then 'delivered'
      when p_error_code in ('not_configured', 'not_approved') then 'not_configured'
      when v_status = 'dead' then 'dead' else 'retry_pending' end,
    case when p_success then pg_catalog.now() else null end
  );
end;
$$;
revoke all on function public.complete_ai_readiness_delivery_v2(uuid, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.complete_ai_readiness_delivery_v2(uuid, uuid, boolean, text) to service_role;

create or replace function public.record_ai_readiness_booking_v1(
  p_booking_uid text,
  p_assessment_id uuid,
  p_submission_id uuid,
  p_event_type_id bigint,
  p_event_type_slug text,
  p_body_hash text,
  p_booking_created_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing private.ai_readiness_booking_receipts%rowtype;
  v_assessment public.ai_readiness_assessments%rowtype;
  v_email text;
  v_current_marketing boolean := false;
  v_booking_key text;
  v_meta_event_id text;
begin
  if coalesce(pg_catalog.btrim(p_booking_uid), '') = '' or pg_catalog.char_length(p_booking_uid) > 160
    or p_assessment_id is null or p_submission_id is null or p_event_type_id is null
    or coalesce(pg_catalog.btrim(p_event_type_slug), '') = '' or pg_catalog.char_length(p_event_type_slug) > 120
    or p_body_hash !~ '^[0-9a-f]{64}$'
    or p_booking_created_at is null
    or p_booking_created_at < pg_catalog.statement_timestamp() - interval '7 days'
    or p_booking_created_at > pg_catalog.statement_timestamp() + interval '5 minutes'
  then raise exception 'booking_payload_invalid'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_booking_uid, 71194));
  select * into v_existing from private.ai_readiness_booking_receipts where booking_uid = p_booking_uid;
  if found then
    if v_existing.assessment_id <> p_assessment_id or v_existing.event_type_id <> p_event_type_id
      or v_existing.event_type_slug <> p_event_type_slug or v_existing.body_hash <> p_body_hash
    then raise exception 'booking_receipt_conflict'; end if;
    return pg_catalog.jsonb_build_object('accepted', true, 'status', 'idempotent');
  end if;
  select assessment.* into v_assessment
  from public.ai_readiness_assessments as assessment
  where assessment.id = p_assessment_id and assessment.submission_id = p_submission_id
  for update;
  if not found then raise exception 'booking_reference_invalid'; end if;
  select contact.email into strict v_email from public.crm_contacts as contact where contact.id = v_assessment.contact_id;
  v_booking_key := pg_catalog.encode(extensions.digest(p_booking_uid, 'sha256'), 'hex');
  insert into private.ai_readiness_booking_receipts(
    booking_uid, assessment_id, event_type_id, event_type_slug, body_hash, booking_created_at
  ) values (
    p_booking_uid, p_assessment_id, p_event_type_id, p_event_type_slug, p_body_hash, p_booking_created_at
  );
  insert into public.crm_contact_events(contact_id, event_type, channel, source, summary, details, actor, created_at)
  values (
    v_assessment.contact_id, 'termin', 'portal', 'calcom_ai_readiness',
    'Kostenlose KI-Potenzialanalyse gebucht',
    pg_catalog.jsonb_build_object(
      'assessment_id', p_assessment_id,
      'event_type_id', p_event_type_id,
      'event_type_slug', p_event_type_slug,
      'booking_uid_hash', v_booking_key
    ), 'system', p_booking_created_at
  );
  insert into private.ai_readiness_outbox(assessment_id, delivery_type, dedupe_key, available_at, expires_at, delivery_payload)
  values (
    p_assessment_id, 'telegram_booking', v_booking_key, pg_catalog.now(), pg_catalog.now() + interval '24 hours',
    pg_catalog.jsonb_build_object('bookingStatus', 'created')
  ) on conflict do nothing;

  select consent.marketing_consent into v_current_marketing
  from private.ai_readiness_tracking_consents as consent
  where consent.tracking_subject_hash = v_assessment.tracking_subject_hash
  order by consent.recorded_seq desc limit 1;
  if v_assessment.marketing_tracking_consent
    and v_assessment.marketing_consent_revoked_at is null
    and coalesce(v_current_marketing, false)
  then
    v_meta_event_id := 'schedule-' || pg_catalog.left(v_booking_key, 48);
    insert into private.ai_readiness_outbox(assessment_id, delivery_type, dedupe_key, available_at, expires_at, delivery_payload)
    values (
      p_assessment_id, 'meta_schedule', v_booking_key, pg_catalog.now(), pg_catalog.now() + interval '7 days',
      pg_catalog.jsonb_build_object(
        'eventId', v_meta_event_id,
        'eventTime', pg_catalog.floor(pg_catalog.date_part('epoch', p_booking_created_at))::bigint,
        'emailSha256', pg_catalog.encode(extensions.digest(pg_catalog.lower(pg_catalog.btrim(v_email)), 'sha256'), 'hex')
      )
    ) on conflict do nothing;
  end if;
  return pg_catalog.jsonb_build_object('accepted', true, 'status', 'created');
end;
$$;
revoke all on function public.record_ai_readiness_booking_v1(text, uuid, uuid, bigint, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_ai_readiness_booking_v1(text, uuid, uuid, bigint, text, text, timestamptz) to service_role;

create or replace function public.confirm_ai_readiness_newsletter_v1(p_assessment_id uuid, p_submission_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_assessment public.ai_readiness_assessments%rowtype;
  v_consent public.crm_marketing_consents%rowtype;
  v_new_confirmation boolean := false;
begin
  select * into v_assessment from public.ai_readiness_assessments
  where id = p_assessment_id and submission_id = p_submission_id for update;
  if not found or v_assessment.newsletter_marketing_consent_id is null
  then return pg_catalog.jsonb_build_object('accepted', false, 'status', 'not_found'); end if;
  select * into v_consent from public.crm_marketing_consents
  where id = v_assessment.newsletter_marketing_consent_id for update;
  if not found or v_consent.revoked_at is not null or v_consent.double_optin_requested_at is null
  then return pg_catalog.jsonb_build_object('accepted', false, 'status', 'inactive'); end if;
  if v_consent.double_optin_confirmed_at is null then
    update public.crm_marketing_consents set double_optin_confirmed_at = pg_catalog.statement_timestamp()
    where id = v_consent.id returning * into v_consent;
    v_new_confirmation := true;
  end if;
  update public.ai_readiness_assessments set newsletter_status = 'confirmed',
    newsletter_confirmed_at = v_consent.double_optin_confirmed_at
  where newsletter_marketing_consent_id = v_consent.id and newsletter_status = 'doi_pending';
  if v_new_confirmation then
    insert into public.crm_contact_events(contact_id, event_type, channel, source, summary, details, actor, created_at)
    values (v_assessment.contact_id, 'email', 'email', 'ki_readiness_newsletter',
      'Double-Opt-in für Synclaro KI-Impulse bestätigt',
      pg_catalog.jsonb_build_object('assessment_id', p_assessment_id, 'marketing_consent_id', v_consent.id),
      'system', v_consent.double_optin_confirmed_at);
  end if;
  return pg_catalog.jsonb_build_object('accepted', true,
    'status', case when v_new_confirmation then 'confirmed' else 'idempotent' end,
    'confirmed_at', v_consent.double_optin_confirmed_at);
end;
$$;
revoke all on function public.confirm_ai_readiness_newsletter_v1(uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_ai_readiness_newsletter_v1(uuid, uuid) to service_role;

create or replace function public.purge_ai_readiness_ephemeral_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_events integer;
  v_rate_limits integer;
  v_outbox integer;
  v_tracking_consents integer;
  v_booking_receipts integer;
  v_expired record;
begin
  for v_expired in
    update private.ai_readiness_outbox set status = 'dead', delivery_payload = '{}'::jsonb,
      last_error_code = 'expired', locked_at = null, lease_token = null
    where status in ('pending', 'processing') and expires_at <= pg_catalog.now()
    returning assessment_id, delivery_type
  loop
    perform private.set_ai_readiness_delivery_status_v2(v_expired.assessment_id, v_expired.delivery_type, 'dead', null);
  end loop;
  delete from public.ai_readiness_events where created_at < pg_catalog.now() - interval '90 days';
  get diagnostics v_events = row_count;
  delete from private.ai_readiness_rate_limits where expires_at < pg_catalog.now();
  get diagnostics v_rate_limits = row_count;
  delete from private.ai_readiness_outbox where status in ('delivered', 'dead') and created_at < pg_catalog.now() - interval '30 days';
  get diagnostics v_outbox = row_count;
  delete from private.ai_readiness_tracking_consents where retention_until < pg_catalog.now();
  get diagnostics v_tracking_consents = row_count;
  delete from private.ai_readiness_booking_receipts
  where received_at < pg_catalog.now() - interval '90 days';
  get diagnostics v_booking_receipts = row_count;
  return pg_catalog.jsonb_build_object(
    'events_deleted', v_events, 'rate_limits_deleted', v_rate_limits,
    'outbox_deleted', v_outbox,
    'tracking_consent_evidence_deleted', v_tracking_consents,
    'booking_receipts_deleted', v_booking_receipts
  );
end;
$$;
revoke all on function public.purge_ai_readiness_ephemeral_v1() from public, anon, authenticated;
grant execute on function public.purge_ai_readiness_ephemeral_v1() to service_role;

comment on table public.ai_readiness_assessments is 'Server-only AI-Readiness assessments with a deterministic result and separate newsletter/Meta consent states.';
comment on function public.submit_ai_readiness_lead_v2(jsonb) is 'Atomic, email-only AI-Readiness lead, CRM, DOI-pending consent and outbox integration; no callback and no external AI processing.';
comment on function public.confirm_ai_readiness_newsletter_v1(uuid, uuid) is 'Idempotently confirms a server-authenticated DOI request and activates the existing append-only CRM marketing-consent row.';
comment on function public.authorize_ai_readiness_delivery_v2(uuid, uuid) is 'Revalidates lease and the delivery-specific consent immediately before any external transfer.';
comment on function public.purge_ai_readiness_ephemeral_v1() is 'Deletes pseudonymous funnel events and private booking replay receipts after 90 days, completed delivery state after 30 days, and expired rate-limit/tracking-consent evidence.';

commit;
