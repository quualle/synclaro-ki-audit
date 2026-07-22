-- AI Readiness first-party telemetry v1 (Production migration 20260722080059)
-- Adds privacy-preserving step telemetry, protected reporting views and a 24h Meta outbox cap.

begin;

alter table public.ai_readiness_events
  drop constraint ai_readiness_events_event_name_check;

alter table public.ai_readiness_events
  add constraint ai_readiness_events_event_name_check check (event_name in (
    'landing_viewed', 'test_started', 'profile_completed', 'phase_started', 'phase_completed',
    'result_preview_viewed', 'lead_form_viewed', 'lead_form_validation_error',
    'lead_submitted', 'report_viewed', 'contact_handoff_clicked', 'consent_updated',
    'scroll_depth', 'session_duration',
    'profile_step_viewed', 'profile_step_completed',
    'question_viewed', 'question_answered', 'question_load_failed', 'question_retry',
    'contact_step_viewed'
  ));

create or replace function public.record_ai_readiness_event_v2(
  p_event_id uuid,
  p_run_id uuid,
  p_session_hash text,
  p_event_name text,
  p_step smallint,
  p_properties jsonb,
  p_occurred_at timestamptz,
  p_analytics_consent_version text,
  p_analytics_consent_granted_at timestamptz,
  p_marketing_consent_granted_at timestamptz default null
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
  v_properties jsonb;
  v_tracking_consent private.ai_readiness_tracking_consents%rowtype;
  v_run_consent private.ai_readiness_tracking_consents%rowtype;
  v_existing_event public.ai_readiness_events%rowtype;
begin
  if p_event_id is null or p_run_id is null or p_session_hash !~ '^[0-9a-f]{64}$'
    or p_event_name not in (
      'landing_viewed', 'test_started', 'profile_completed', 'phase_started', 'phase_completed',
      'result_preview_viewed', 'lead_form_viewed', 'lead_form_validation_error',
      'lead_submitted', 'report_viewed', 'contact_handoff_clicked', 'consent_updated',
      'scroll_depth', 'session_duration',
      'profile_step_viewed', 'profile_step_completed',
      'question_viewed', 'question_answered', 'question_load_failed', 'question_retry',
      'contact_step_viewed'
    )
    or p_properties is null or pg_catalog.jsonb_typeof(p_properties) <> 'object'
    or pg_catalog.pg_column_size(p_properties) > 4096
    or p_analytics_consent_version <> 'cookie-v1-2026-07-18'
    or p_analytics_consent_granted_at is null
    or p_analytics_consent_granted_at < pg_catalog.statement_timestamp() - interval '180 days'
    or p_analytics_consent_granted_at > pg_catalog.statement_timestamp() + interval '5 minutes'
  then raise exception 'invalid_event'; end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(p_properties) as property_name
    where property_name not in (
      'assessment_version', 'phase', 'question_count', 'employee_band', 'respondent_role',
      'score', 'level', 'field', 'error_code', 'depth', 'duration_bucket', 'preview',
      'utm_campaign', 'campaign_id', 'adset_id', 'ad_id', 'placement',
      'profile_step', 'question_id', 'position', 'dimension', 'selection_mode',
      'generation_latency_bucket', 'response_time_bucket', 'changed_after_back', 'reason_bucket'
    )
  ) then raise exception 'invalid_event_properties'; end if;

  if p_event_name in ('profile_step_viewed', 'profile_step_completed') and not coalesce((
    p_properties ->> 'profile_step' in ('mitarbeiter', 'rolle', 'hauptziel', 'branche')
    and pg_catalog.jsonb_typeof(p_properties -> 'position') = 'number'
    and (p_properties ->> 'position') ~ '^[1-4]$'
    and (p_properties ->> 'position')::integer between 1 and 4
    and (
      p_event_name = 'profile_step_viewed'
      or p_properties ->> 'response_time_bucket' in ('under_5s', '5_15s', '15_30s', '30_60s', 'over_60s')
    )
    and (
      (p_event_name = 'profile_step_viewed'
        and p_properties - 'profile_step' - 'position' = '{}'::jsonb)
      or
      (p_event_name = 'profile_step_completed'
        and p_properties - 'profile_step' - 'position' - 'response_time_bucket' = '{}'::jsonb)
    )
  ), false) then raise exception 'invalid_profile_step_event'; end if;

  if p_event_name in ('question_viewed', 'question_answered') and not coalesce((
    p_properties ->> 'question_id' in (
      'prozess_standardisierung', 'daten_zugriff', 'system_brueche', 'routineaufgaben',
      'wissen_verteilung', 'team_digital', 'ki_nutzung', 'ki_leitplanken',
      'ki_zielbild', 'verantwortung', 'umsetzungstempo', 'erfolgsmessung', 'haupthebel'
    )
    and pg_catalog.jsonb_typeof(p_properties -> 'position') = 'number'
    and (p_properties ->> 'position') ~ '^[1-9]$'
    and (p_properties ->> 'position')::integer between 1 and 9
    and p_properties ->> 'dimension' in ('prozesse_daten', 'team_wissen', 'ki_praxis', 'umsetzungskraft', 'optional_context')
    and (
      (p_properties ->> 'question_id' = 'haupthebel'
        and p_properties ->> 'selection_mode' = 'static_optional'
        and p_properties ->> 'dimension' = 'optional_context')
      or
      (p_properties ->> 'question_id' <> 'haupthebel'
        and p_properties ->> 'selection_mode' in ('frontier_adaptive', 'deterministic_fallback')
        and p_properties ->> 'dimension' <> 'optional_context')
    )
    and (
      p_event_name = 'question_answered'
      or p_properties ->> 'generation_latency_bucket' in ('cached', 'under_2s', '2_5s', '5_10s', 'over_10s')
    )
    and (
      p_event_name = 'question_viewed'
      or (
        p_properties ->> 'response_time_bucket' in ('under_5s', '5_15s', '15_30s', '30_60s', 'over_60s')
        and pg_catalog.jsonb_typeof(p_properties -> 'changed_after_back') = 'boolean'
      )
    )
    and (
      (p_event_name = 'question_viewed'
        and p_properties - 'question_id' - 'position' - 'dimension' - 'selection_mode' - 'generation_latency_bucket' = '{}'::jsonb)
      or
      (p_event_name = 'question_answered'
        and p_properties - 'question_id' - 'position' - 'dimension' - 'selection_mode' - 'response_time_bucket' - 'changed_after_back' = '{}'::jsonb)
    )
  ), false) then raise exception 'invalid_question_event'; end if;

  if p_event_name in ('question_load_failed', 'question_retry') and not coalesce((
    p_properties ->> 'question_id' = 'adaptive_pending'
    and pg_catalog.jsonb_typeof(p_properties -> 'position') = 'number'
    and (p_properties ->> 'position') ~ '^[1-8]$'
    and (p_properties ->> 'position')::integer between 1 and 8
    and p_properties ->> 'reason_bucket' in ('network', 'server', 'invalid_response', 'other')
    and p_properties - 'question_id' - 'position' - 'reason_bucket' = '{}'::jsonb
  ), false) then raise exception 'invalid_question_failure_event'; end if;

  if p_event_name = 'contact_step_viewed' and not coalesce((
    p_properties ->> 'field' in ('firstName', 'lastName', 'company', 'email')
    and pg_catalog.jsonb_typeof(p_properties -> 'position') = 'number'
    and (p_properties ->> 'position') ~ '^[1-4]$'
    and (p_properties ->> 'position')::integer between 1 and 4
    and p_properties - 'field' - 'position' = '{}'::jsonb
  ), false) then raise exception 'invalid_contact_step_event'; end if;

  if p_event_name not in ('landing_viewed', 'test_started')
    and p_properties ?| array['campaign_id', 'adset_id', 'ad_id', 'placement']
  then raise exception 'event_attribution_scope_invalid'; end if;

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

  v_properties := p_properties;
  if v_properties ?| array['campaign_id', 'adset_id', 'ad_id', 'placement'] and (
    p_marketing_consent_granted_at is null
    or not v_run_consent.marketing_consent
    or not v_tracking_consent.marketing_consent
    or pg_catalog.abs(extract(epoch from (v_run_consent.decided_at - p_marketing_consent_granted_at))) > 1
    or pg_catalog.abs(extract(epoch from (v_tracking_consent.decided_at - p_marketing_consent_granted_at))) > 1
  ) then
    v_properties := v_properties - 'campaign_id' - 'adset_id' - 'ad_id' - 'placement';
  end if;

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
      or v_existing_event.properties is distinct from v_properties
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
  ) values (
    p_event_id, p_run_id, p_session_hash, v_assessment_id, p_event_name, p_step, v_properties,
    v_run_consent.id, p_analytics_consent_version, p_analytics_consent_granted_at, v_occurred_at
  );
  return pg_catalog.jsonb_build_object('accepted', true, 'status', 'accepted');
end;
$$;

revoke all on function public.record_ai_readiness_event_v2(uuid, uuid, text, text, smallint, jsonb, timestamptz, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.record_ai_readiness_event_v2(uuid, uuid, text, text, smallint, jsonb, timestamptz, text, timestamptz, timestamptz) to service_role;

create or replace function public.authorize_ai_readiness_marketing_event_v1(
  p_run_id uuid,
  p_session_hash text,
  p_consent_version text,
  p_marketing_consent_granted_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allowed boolean;
  v_run_consent private.ai_readiness_tracking_consents%rowtype;
  v_current_consent private.ai_readiness_tracking_consents%rowtype;
begin
  if p_run_id is null or p_session_hash !~ '^[0-9a-f]{64}$'
    or p_consent_version <> 'cookie-v1-2026-07-18'
    or p_marketing_consent_granted_at is null
    or p_marketing_consent_granted_at < pg_catalog.statement_timestamp() - interval '180 days'
    or p_marketing_consent_granted_at > pg_catalog.statement_timestamp() + interval '5 minutes'
  then return pg_catalog.jsonb_build_object('authorized', false); end if;

  select * into v_run_consent
  from private.ai_readiness_tracking_consents
  where run_id = p_run_id and session_hash = p_session_hash
  order by recorded_seq desc limit 1;
  if not found then return pg_catalog.jsonb_build_object('authorized', false); end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_run_consent.tracking_subject_hash, 71192));
  select * into v_current_consent
  from private.ai_readiness_tracking_consents
  where tracking_subject_hash = v_run_consent.tracking_subject_hash
  order by recorded_seq desc limit 1;

  if not found
    or not v_run_consent.marketing_consent
    or not v_current_consent.marketing_consent
    or v_run_consent.consent_version <> p_consent_version
    or v_current_consent.consent_version <> p_consent_version
    or pg_catalog.abs(extract(epoch from (v_run_consent.decided_at - p_marketing_consent_granted_at))) > 1
    or pg_catalog.abs(extract(epoch from (v_current_consent.decided_at - p_marketing_consent_granted_at))) > 1
  then return pg_catalog.jsonb_build_object('authorized', false); end if;

  select rate.allowed into v_allowed
  from public.consume_ai_readiness_rate_limit_v1('event_session', p_session_hash) as rate;
  return pg_catalog.jsonb_build_object('authorized', coalesce(v_allowed, false));
end;
$$;

revoke all on function public.authorize_ai_readiness_marketing_event_v1(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.authorize_ai_readiness_marketing_event_v1(uuid, text, text, timestamptz) to service_role;

create or replace function private.cap_ai_readiness_meta_outbox_ttl_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.delivery_type in ('meta_capi', 'meta_schedule') then
    new.expires_at := least(
      new.expires_at,
      coalesce(new.created_at, pg_catalog.statement_timestamp()) + interval '24 hours'
    );
  end if;
  return new;
end;
$$;

revoke all on function private.cap_ai_readiness_meta_outbox_ttl_v1() from public, anon, authenticated;
grant execute on function private.cap_ai_readiness_meta_outbox_ttl_v1() to service_role;

drop trigger if exists cap_ai_readiness_meta_outbox_ttl_v1 on private.ai_readiness_outbox;
create trigger cap_ai_readiness_meta_outbox_ttl_v1
before insert or update of delivery_type, expires_at, created_at
on private.ai_readiness_outbox
for each row execute function private.cap_ai_readiness_meta_outbox_ttl_v1();

update private.ai_readiness_outbox
set expires_at = least(expires_at, created_at + interval '24 hours')
where delivery_type in ('meta_capi', 'meta_schedule')
  and status in ('pending', 'processing')
  and expires_at > created_at + interval '24 hours';

create or replace view private.ai_readiness_step_funnel_daily_v1 as
with current_consent as (
  select distinct on (tracking_subject_hash)
    tracking_subject_hash,
    marketing_consent
  from private.ai_readiness_tracking_consents
  order by tracking_subject_hash, recorded_seq desc
), attribution as (
  select distinct on (event.run_id)
    event.run_id,
    event.properties ->> 'utm_campaign' as utm_campaign,
    case when current_consent.marketing_consent then event.properties ->> 'campaign_id' end as campaign_id,
    case when current_consent.marketing_consent then event.properties ->> 'adset_id' end as adset_id,
    case when current_consent.marketing_consent then event.properties ->> 'ad_id' end as ad_id,
    case when current_consent.marketing_consent then event.properties ->> 'placement' end as placement
  from public.ai_readiness_events as event
  join private.ai_readiness_tracking_consents as event_consent
    on event_consent.id = event.tracking_consent_id
  join current_consent
    on current_consent.tracking_subject_hash = event_consent.tracking_subject_hash
  where event.event_name in ('landing_viewed', 'test_started')
  order by event.run_id, (event.properties ?| array['campaign_id', 'adset_id', 'ad_id', 'placement']) desc, event.occurred_at
)
select
  pg_catalog.date_trunc('day', event.occurred_at)::date as event_date,
  coalesce(attribution.utm_campaign, 'other') as utm_campaign,
  attribution.campaign_id,
  attribution.adset_id,
  attribution.ad_id,
  attribution.placement,
  event.event_name,
  coalesce(
    event.properties ->> 'question_id',
    event.properties ->> 'profile_step',
    event.properties ->> 'field'
  ) as step_key,
  nullif(event.properties ->> 'position', '')::smallint as position,
  event.properties ->> 'dimension' as dimension,
  event.properties ->> 'selection_mode' as selection_mode,
  event.properties ->> 'generation_latency_bucket' as generation_latency_bucket,
  event.properties ->> 'response_time_bucket' as response_time_bucket,
  nullif(event.properties ->> 'changed_after_back', '')::boolean as changed_after_back,
  event.properties ->> 'reason_bucket' as reason_bucket,
  pg_catalog.count(distinct event.run_id)::bigint as runs
from public.ai_readiness_events as event
left join attribution on attribution.run_id = event.run_id
where event.event_name in (
  'profile_step_viewed', 'profile_step_completed',
  'question_viewed', 'question_answered', 'question_load_failed', 'question_retry',
  'contact_step_viewed'
)
group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15;

create or replace view private.ai_readiness_run_last_event_v1 as
with current_consent as (
  select distinct on (tracking_subject_hash)
    tracking_subject_hash,
    marketing_consent
  from private.ai_readiness_tracking_consents
  order by tracking_subject_hash, recorded_seq desc
), attribution as (
  select distinct on (event.run_id)
    event.run_id,
    event.properties ->> 'utm_campaign' as utm_campaign,
    case when current_consent.marketing_consent then event.properties ->> 'campaign_id' end as campaign_id,
    case when current_consent.marketing_consent then event.properties ->> 'adset_id' end as adset_id,
    case when current_consent.marketing_consent then event.properties ->> 'ad_id' end as ad_id,
    case when current_consent.marketing_consent then event.properties ->> 'placement' end as placement
  from public.ai_readiness_events as event
  join private.ai_readiness_tracking_consents as event_consent
    on event_consent.id = event.tracking_consent_id
  join current_consent
    on current_consent.tracking_subject_hash = event_consent.tracking_subject_hash
  where event.event_name in ('landing_viewed', 'test_started')
  order by event.run_id, (event.properties ?| array['campaign_id', 'adset_id', 'ad_id', 'placement']) desc, event.occurred_at
), ranked as (
  select
    event.run_id,
    event.assessment_id,
    event.event_name,
    event.step,
    event.occurred_at,
    event.properties,
    pg_catalog.row_number() over (
      partition by event.run_id order by event.occurred_at desc, event.created_at desc, event.id desc
    ) as event_rank
  from public.ai_readiness_events as event
  where event.event_name not in ('consent_updated', 'scroll_depth', 'session_duration')
)
select
  ranked.run_id,
  ranked.assessment_id,
  ranked.occurred_at as last_event_at,
  ranked.event_name as last_event_name,
  ranked.step as last_step,
  coalesce(
    ranked.properties ->> 'question_id',
    ranked.properties ->> 'profile_step',
    ranked.properties ->> 'field'
  ) as last_step_key,
  nullif(ranked.properties ->> 'position', '')::smallint as last_position,
  ranked.properties ->> 'dimension' as last_dimension,
  coalesce(attribution.utm_campaign, 'other') as utm_campaign,
  attribution.campaign_id,
  attribution.adset_id,
  attribution.ad_id,
  attribution.placement
from ranked
left join attribution on attribution.run_id = ranked.run_id
where ranked.event_rank = 1;

do $$
begin
  if pg_catalog.current_setting('server_version_num')::integer >= 150000 then
    execute 'alter view private.ai_readiness_step_funnel_daily_v1 set (security_invoker = true)';
    execute 'alter view private.ai_readiness_run_last_event_v1 set (security_invoker = true)';
  end if;
end;
$$;

revoke all on private.ai_readiness_step_funnel_daily_v1 from public, anon, authenticated;
revoke all on private.ai_readiness_run_last_event_v1 from public, anon, authenticated;
grant select on private.ai_readiness_step_funnel_daily_v1 to service_role;
grant select on private.ai_readiness_run_last_event_v1 to service_role;

comment on function public.record_ai_readiness_event_v2(uuid, uuid, text, text, smallint, jsonb, timestamptz, text, timestamptz, timestamptz)
  is 'Records consent-bound, privacy-preserving AI Readiness funnel telemetry; exact Meta attribution is stripped unless current marketing consent is re-authorized server-side.';
comment on view private.ai_readiness_step_funnel_daily_v1
  is 'Daily distinct-run counts per privacy-safe step/property bucket and currently consented campaign attribution; bucket rows are not additive when one run revisits a step.';
comment on view private.ai_readiness_run_last_event_v1
  is 'Latest meaningful first-party funnel event per run for drop-off analysis.';

commit;
