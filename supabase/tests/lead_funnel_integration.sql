\set ON_ERROR_STOP on

begin;
set local role service_role;

create temporary table test_payloads(name text primary key, payload jsonb);

insert into test_payloads(name, payload)
values (
  'first',
  jsonb_build_object(
    'submission_id', '11111111-1111-4111-8111-111111111111',
    'run_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'session_hash', repeat('a', 64),
    'rate_ip_hash', repeat('b', 64),
    'rate_email_hash', repeat('c', 64),
    'rate_phone_hash', repeat('d', 64),
    'tracking_subject_hash', repeat('9', 64),
    'contact', jsonb_build_object('firstName', 'Ada', 'lastName', 'Lovelace', 'company', 'Analytical GmbH', 'email', 'ada@example.com', 'phone', '+491701234567'),
    'profile', jsonb_build_object('branche', 'Unternehmensberatung', 'mitarbeiter', '1-5', 'rolle', 'inhaber', 'hauptziel', 'zeit'),
    'answers', jsonb_build_array(
      jsonb_build_object('questionId', 'prozess_standardisierung', 'answer', '2', 'answerLabel', 'Teilweise dokumentiert'),
      jsonb_build_object('questionId', 'daten_zugriff', 'answer', '3', 'answerLabel', 'Meist zentral'),
      jsonb_build_object('questionId', 'system_brueche', 'answer', '2', 'answerLabel', 'Regelmäßig'),
      jsonb_build_object('questionId', 'routineaufgaben', 'answer', '1', 'answerLabel', 'Sehr stark'),
      jsonb_build_object('questionId', 'wissen_verteilung', 'answer', '2', 'answerLabel', 'Viele Rückfragen'),
      jsonb_build_object('questionId', 'team_digital', 'answer', '3', 'answerLabel', 'Mit guter Einführung'),
      jsonb_build_object('questionId', 'ki_nutzung', 'answer', '2', 'answerLabel', 'Punktuell'),
      jsonb_build_object('questionId', 'ki_leitplanken', 'answer', '1', 'answerLabel', 'Keine Regeln'),
      jsonb_build_object('questionId', 'ki_zielbild', 'answer', '3', 'answerLabel', 'Erster Anwendungsfall'),
      jsonb_build_object('questionId', 'verantwortung', 'answer', '2', 'answerLabel', 'Nebenbei'),
      jsonb_build_object('questionId', 'umsetzungstempo', 'answer', '3', 'answerLabel', 'Vier bis acht Wochen'),
      jsonb_build_object('questionId', 'erfolgsmessung', 'answer', '3', 'answerLabel', 'Zeit oder Qualität')
    ),
    'baseline', jsonb_build_object(
      'scores', jsonb_build_object(
        'prozesse_daten', jsonb_build_object('percent', 42),
        'team_wissen', jsonb_build_object('percent', 50),
        'ki_praxis', jsonb_build_object('percent', 44),
        'umsetzungskraft', jsonb_build_object('percent', 56),
        'total', jsonb_build_object('percent', 47)
      ),
      'level', 'KI-Startklar'
    ),
    'attribution', jsonb_build_object(
      'eventId', '11111111-1111-4111-8111-111111111111',
      'landingUrl', 'https://ki-check.synclaro.de/?utm_source=meta',
      'utm_source', 'meta',
      'utm_campaign', 'meta_ai_readiness_de_prospecting_v1'
    ),
    'consents', jsonb_build_object(
      'callback', jsonb_build_object(
        'granted', true,
        'version', 'callback-v1-2026-07-18',
        'text', 'Ich möchte meine vollständige KI-Readiness-Auswertung erhalten und bitte Synclaro IT Dienstleistungen, Inhaber Marco Heer, mich zu diesem Testergebnis einmal per Telefon zu kontaktieren. Falls ich nicht erreichbar bin, darf Synclaro per E-Mail nachfassen. Dabei dürfen mir passende Leistungen rund um KI und Automatisierung vorgestellt werden. Ich kann meine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.'
      ),
      'aiProcessing', jsonb_build_object(
        'granted', true,
        'version', 'ai-processing-v2-2026-07-18',
        'text', 'Ich willige ein, dass meine Unternehmensangaben und Testantworten zur individuellen Auswertung durch OpenAI Ireland Ltd. verarbeitet werden. Dabei kann eine technische Weiterverarbeitung außerhalb des EWR auf Grundlage geeigneter Garantien, zum Beispiel EU-Standardvertragsklauseln, erfolgen. Meine Kontaktdaten werden nicht an OpenAI übermittelt. Ich kann meine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.'
      ),
      'analytics', jsonb_build_object('granted', true, 'version', 'cookie-v1-2026-07-18'),
      'marketing', jsonb_build_object('granted', true, 'version', 'cookie-v1-2026-07-18'),
      'evidence', jsonb_build_object('ipHash', repeat('e', 64), 'userAgent', 'Integration Test')
    ),
    'assessment_version', '2026-07-18.v1',
    'privacy_version', 'privacy-ai-readiness-v1-2026-07-18',
    'delivery_context', jsonb_build_object('clientIpAddress', '203.0.113.10')
  )
);

select public.record_ai_readiness_tracking_consent_v1(
  '99999999-0000-4000-8000-000000000001',
  null,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  repeat('a', 64), repeat('9', 64), 'cookie-v1-2026-07-18',
  true, true, repeat('e', 64), 'Integration Test'
);

do $$
declare
  result jsonb;
  conflict_rejected boolean := false;
begin
  result := public.record_ai_readiness_tracking_consent_v1(
    '99999999-0000-4000-8000-000000000001',
    null,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    repeat('a', 64), repeat('9', 64), 'cookie-v1-2026-07-18',
    true, true, repeat('e', 64), 'Integration Test'
  );
  if result ->> 'status' <> 'idempotent' then
    raise exception 'tracking-consent retry was not idempotent: %', result;
  end if;
  if result ->> 'decision_id' <> '99999999-0000-4000-8000-000000000001' then
    raise exception 'tracking-consent API replaced the client idempotency key: %', result;
  end if;
  if (
    select count(*) from private.ai_readiness_tracking_consents
    where decision_id = '99999999-0000-4000-8000-000000000001'
  ) <> 1 then raise exception 'tracking-consent retry duplicated evidence'; end if;

  begin
    perform public.record_ai_readiness_tracking_consent_v1(
      '99999999-0000-4000-8000-000000000001',
      null,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      repeat('a', 64), repeat('9', 64), 'cookie-v1-2026-07-18',
      false, true, repeat('e', 64), 'Integration Test'
    );
  exception when others then
    conflict_rejected := sqlerrm like '%tracking_consent_conflict%';
  end;
  if not conflict_rejected then raise exception 'conflicting tracking-consent retry was accepted'; end if;
end;
$$;

select public.record_ai_readiness_tracking_consent_v1(
  '99999999-0000-4000-8000-000000000020',
  '99999999-0000-4000-8000-000000000001',
  'abababab-abab-4bab-8bab-abababababab',
  repeat('b', 64), repeat('9', 64), 'cookie-v1-2026-07-18',
  true, true, repeat('e', 64), 'Cross-tab Integration Test'
);

do $$
declare result jsonb;
begin
  result := public.record_ai_readiness_event_v1(
    '20202020-2020-4020-8020-202020202020',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', repeat('a', 64),
    'landing_viewed', 0::smallint, '{"cross_tab":true}'::jsonb, pg_catalog.now(),
    'cookie-v1-2026-07-18', (
      select decided_at from private.ai_readiness_tracking_consents
      where run_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        and session_hash = repeat('a', 64)
      order by recorded_seq desc limit 1
    )
  );
  if result ->> 'status' <> 'accepted'
  then raise exception 'same-choice cross-tab decision blocked the original run: %', result; end if;
end;
$$;

do $$
declare
  stale_mixed jsonb;
  rebased_mixed jsonb;
begin
  perform public.record_ai_readiness_tracking_consent_v1(
    '40404040-4040-4040-8040-404040404040', null,
    'f0f0f0f0-f0f0-40f0-80f0-f0f0f0f0f0f0', repeat('1', 64), repeat('5', 64),
    'cookie-v1-2026-07-18', true, true, repeat('e', 64), 'Mixed CAS base'
  );
  perform public.record_ai_readiness_tracking_consent_v1(
    '41414141-4141-4141-8141-414141414141', '40404040-4040-4040-8040-404040404040',
    'f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1', repeat('2', 64), repeat('5', 64),
    'cookie-v1-2026-07-18', false, true, repeat('e', 64), 'Authoritative analytics revocation'
  );
  stale_mixed := public.record_ai_readiness_tracking_consent_v1(
    '42424242-4242-4242-8242-424242424242', '40404040-4040-4040-8040-404040404040',
    'f2f2f2f2-f2f2-42f2-82f2-f2f2f2f2f2f2', repeat('3', 64), repeat('5', 64),
    'cookie-v1-2026-07-18', true, false, repeat('e', 64), 'Delayed mixed analytics grant'
  );
  if stale_mixed ->> 'status' <> 'stale'
    or (stale_mixed ->> 'current_analytics')::boolean
    or not (stale_mixed ->> 'current_marketing')::boolean
    or exists (
      select 1 from private.ai_readiness_tracking_consents
      where decision_id = '42424242-4242-4242-8242-424242424242'
    )
  then raise exception 'incomparable analytics grant was not rejected as stale: %', stale_mixed; end if;
  rebased_mixed := public.record_ai_readiness_tracking_consent_v1(
    '46464646-4646-4646-8646-464646464646', '41414141-4141-4141-8141-414141414141',
    'f2f2f2f2-f2f2-42f2-82f2-f2f2f2f2f2f2', repeat('3', 64), repeat('5', 64),
    'cookie-v1-2026-07-18', false, false, repeat('e', 64), 'Component-wise safe merge'
  );
  if not exists (
    select 1 from private.ai_readiness_tracking_consents
    where tracking_subject_hash = repeat('5', 64)
      and decision_id = '46464646-4646-4646-8646-464646464646'
      and not analytics_consent and not marketing_consent
  ) or rebased_mixed ->> 'status' <> 'accepted'
  then raise exception 'component-wise analytics merge did not preserve both revocations: %', rebased_mixed; end if;

  perform public.record_ai_readiness_tracking_consent_v1(
    '43434343-4343-4343-8343-434343434343', null,
    'f3f3f3f3-f3f3-43f3-83f3-f3f3f3f3f3f3', repeat('4', 64), repeat('f', 64),
    'cookie-v1-2026-07-18', true, true, repeat('e', 64), 'Mixed CAS base'
  );
  perform public.record_ai_readiness_tracking_consent_v1(
    '44444444-4444-4444-8444-444444444444', '43434343-4343-4343-8343-434343434343',
    'f4f4f4f4-f4f4-44f4-84f4-f4f4f4f4f4f4', repeat('5', 64), repeat('f', 64),
    'cookie-v1-2026-07-18', true, false, repeat('e', 64), 'Authoritative marketing revocation'
  );
  stale_mixed := public.record_ai_readiness_tracking_consent_v1(
    '45454545-4545-4545-8545-454545454545', '43434343-4343-4343-8343-434343434343',
    'f5f5f5f5-f5f5-45f5-85f5-f5f5f5f5f5f5', repeat('6', 64), repeat('f', 64),
    'cookie-v1-2026-07-18', false, true, repeat('e', 64), 'Delayed mixed marketing grant'
  );
  if stale_mixed ->> 'status' <> 'stale'
    or not (stale_mixed ->> 'current_analytics')::boolean
    or (stale_mixed ->> 'current_marketing')::boolean
    or exists (
      select 1 from private.ai_readiness_tracking_consents
      where decision_id = '45454545-4545-4545-8545-454545454545'
    )
  then raise exception 'incomparable marketing grant was not rejected as stale: %', stale_mixed; end if;
  rebased_mixed := public.record_ai_readiness_tracking_consent_v1(
    '47474747-4747-4747-8747-474747474747', '44444444-4444-4444-8444-444444444444',
    'f5f5f5f5-f5f5-45f5-85f5-f5f5f5f5f5f5', repeat('6', 64), repeat('f', 64),
    'cookie-v1-2026-07-18', false, false, repeat('e', 64), 'Component-wise safe merge'
  );
  if not exists (
    select 1 from private.ai_readiness_tracking_consents
    where tracking_subject_hash = repeat('f', 64)
      and decision_id = '47474747-4747-4747-8747-474747474747'
      and not analytics_consent and not marketing_consent
  ) or rebased_mixed ->> 'status' <> 'accepted'
  then raise exception 'component-wise marketing merge did not preserve both revocations: %', rebased_mixed; end if;
end;
$$;

do $$
declare
  first_result jsonb;
  stale_revocation jsonb;
  rebased_revocation jsonb;
begin
  perform public.record_ai_readiness_tracking_consent_v1(
    '30303030-3030-4030-8030-303030303030', null,
    'e0e0e0e0-e0e0-40e0-80e0-e0e0e0e0e0e0', repeat('c', 64), repeat('4', 64),
    'cookie-v1-2026-07-18', true, true, repeat('e', 64), 'CAS base'
  );
  first_result := public.record_ai_readiness_tracking_consent_v1(
    '31313131-3131-4131-8131-313131313131', '30303030-3030-4030-8030-303030303030',
    'e1e1e1e1-e1e1-41e1-81e1-e1e1e1e1e1e1', repeat('d', 64), repeat('4', 64),
    'cookie-v1-2026-07-18', true, true, repeat('e', 64), 'Earlier grant'
  );
  if first_result ->> 'status' <> 'accepted' then raise exception 'first CAS writer failed: %', first_result; end if;

  stale_revocation := public.record_ai_readiness_tracking_consent_v1(
    '32323232-3232-4232-8232-323232323232', '30303030-3030-4030-8030-303030303030',
    'e2e2e2e2-e2e2-42e2-82e2-e2e2e2e2e2e2', repeat('e', 64), repeat('4', 64),
    'cookie-v1-2026-07-18', false, false, repeat('e', 64), 'Later revocation'
  );
  if stale_revocation ->> 'status' <> 'stale'
    or stale_revocation ->> 'current_decision_id' <> '31313131-3131-4131-8131-313131313131'
  then raise exception 'competing later revocation was not given a rebase head: %', stale_revocation; end if;

  rebased_revocation := public.record_ai_readiness_tracking_consent_v1(
    '33333333-3333-4333-8333-333333333333', '31313131-3131-4131-8131-313131313131',
    'e2e2e2e2-e2e2-42e2-82e2-e2e2e2e2e2e2', repeat('e', 64), repeat('4', 64),
    'cookie-v1-2026-07-18', false, false, repeat('e', 64), 'Later revocation rebased'
  );
  if rebased_revocation ->> 'status' <> 'accepted' or not exists (
    select 1 from private.ai_readiness_tracking_consents
    where decision_id = '33333333-3333-4333-8333-333333333333'
      and not analytics_consent and not marketing_consent
  ) then raise exception 'rebased later revocation did not become authoritative: %', rebased_revocation; end if;
end;
$$;

do $$
declare
  result jsonb;
  conflict_rejected boolean := false;
begin
  select public.submit_ai_readiness_lead_v1(payload) into result from test_payloads where name = 'first';
  if result ->> 'status' <> 'created' then raise exception 'first submission not created: %', result; end if;
  if (select count(*) from public.crm_contacts) <> 1 then raise exception 'contact count mismatch'; end if;
  if (select count(*) from public.crm_contact_events) <> 1 then raise exception 'contact event count mismatch'; end if;
  if (select count(*) from public.ai_readiness_assessments) <> 1 then raise exception 'assessment count mismatch'; end if;
  if (select count(*) from private.ai_readiness_outbox) <> 3 then raise exception 'outbox count mismatch'; end if;
  if not exists (
    select 1 from private.ai_readiness_outbox
    where delivery_type = 'meta_capi' and delivery_payload #>> '{clientIpAddress}' = '203.0.113.10'
  ) then raise exception 'short-lived Meta delivery context missing'; end if;
  if exists (
    select 1 from private.ai_readiness_outbox
    where delivery_type <> 'meta_capi' and delivery_payload <> '{}'::jsonb
  ) then raise exception 'Meta delivery context leaked into operational notifications'; end if;
  if (select count(*) from private.ai_readiness_contact_consents) <> 2 then raise exception 'separate consent ledger mismatch'; end if;
  if not exists (
    select 1 from private.ai_readiness_tracking_consents
    where run_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and assessment_id is not null
      and analytics_consent and marketing_consent
  ) then raise exception 'tracking consent was not linked to assessment'; end if;
  if not exists (
    select 1 from public.ai_readiness_assessments
    where callback_consent_hash ~ '^[0-9a-f]{64}$'
      and ai_consent_hash ~ '^[0-9a-f]{64}$'
      and analytics_consent_hash ~ '^[0-9a-f]{64}$'
      and marketing_consent_hash ~ '^[0-9a-f]{64}$'
      and consent_evidence_ip_hash = repeat('e', 64)
      and lead_fit
  ) then raise exception 'consent evidence or lead fit missing'; end if;

  select public.submit_ai_readiness_lead_v1(payload) into result from test_payloads where name = 'first';
  if result ->> 'status' <> 'idempotent' then raise exception 'submission not idempotent: %', result; end if;
  if (select count(*) from public.crm_contacts) <> 1 or (select count(*) from public.crm_contact_events) <> 1 then
    raise exception 'idempotent retry duplicated CRM rows';
  end if;
  begin
    select public.submit_ai_readiness_lead_v1(
      payload || jsonb_build_object('run_id', 'ffffffff-ffff-4fff-8fff-ffffffffffff')
    ) into result from test_payloads where name = 'first';
  exception when others then
    conflict_rejected := sqlerrm like '%submission_conflict%';
  end;
  if not conflict_rejected then raise exception 'cross-run idempotency replay was accepted'; end if;
end;
$$;

do $$
declare
  assessment uuid;
  first_lease uuid := '12121212-1212-4212-8212-121212121212';
  second_lease uuid := '13131313-1313-4313-8313-131313131313';
  result jsonb;
  stale_rejected boolean := false;
begin
  select id into strict assessment
  from public.ai_readiness_assessments
  where submission_id = '11111111-1111-4111-8111-111111111111';
  result := public.claim_ai_readiness_analysis_v1(
    assessment, '11111111-1111-4111-8111-111111111111', first_lease
  );
  if result ->> 'status' <> 'claimed' then raise exception 'analysis was not claimed: %', result; end if;
  result := public.claim_ai_readiness_analysis_v1(
    assessment, '11111111-1111-4111-8111-111111111111', second_lease
  );
  if result ->> 'status' <> 'busy' then raise exception 'parallel analysis replay was not blocked: %', result; end if;

  update public.ai_readiness_assessments
  set analysis_locked_at = pg_catalog.now() - interval '46 seconds'
  where id = assessment;
  result := public.claim_ai_readiness_analysis_v1(
    assessment, '11111111-1111-4111-8111-111111111111', second_lease
  );
  if result ->> 'status' <> 'claimed' then raise exception 'expired analysis lease was not reclaimed: %', result; end if;
  begin
    perform public.complete_ai_readiness_analysis_v1(assessment, first_lease, '{"stale":true}'::jsonb);
  exception when others then
    stale_rejected := sqlerrm like '%analysis_lease_invalid%';
  end;
  if not stale_rejected then raise exception 'stale analysis lease completed the result'; end if;
  result := public.complete_ai_readiness_analysis_v1(assessment, second_lease, '{"test":"completed"}'::jsonb);
  if result ->> 'test' <> 'completed' then raise exception 'leased analysis was not completed: %', result; end if;
  result := public.claim_ai_readiness_analysis_v1(
    assessment, '11111111-1111-4111-8111-111111111111', first_lease
  );
  if result ->> 'status' <> 'completed' or result #>> '{result,test}' <> 'completed'
  then raise exception 'completed analysis was not replayed without a new claim: %', result; end if;
end;
$$;

select public.record_ai_readiness_event_v1(
  '22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  repeat('a', 64), 'report_viewed', 18::smallint, '{"score":47}'::jsonb, now(),
  'cookie-v1-2026-07-18', (
    select decided_at from private.ai_readiness_tracking_consents
    where run_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    order by recorded_seq desc limit 1
  )
);
select public.record_ai_readiness_event_v1(
  '22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  repeat('a', 64), 'report_viewed', 18::smallint, '{"score":47}'::jsonb, now(),
  'cookie-v1-2026-07-18', (
    select decided_at from private.ai_readiness_tracking_consents
    where run_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    order by recorded_seq desc limit 1
  )
);

do $$
declare
  consent_at timestamptz;
  conflict_rejected boolean := false;
begin
  if (select count(*) from public.ai_readiness_events where event_id = '22222222-2222-4222-8222-222222222222') <> 1 then
    raise exception 'event idempotency failed';
  end if;
  select decided_at into consent_at
  from private.ai_readiness_tracking_consents
  where run_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  order by recorded_seq desc limit 1;
  begin
    perform public.record_ai_readiness_event_v1(
      '22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      repeat('a', 64), 'report_viewed', 18::smallint, '{"score":48}'::jsonb, now(),
      'cookie-v1-2026-07-18', consent_at
    );
  exception when others then
    conflict_rejected := sqlerrm like '%event_id_conflict%';
  end;
  if not conflict_rejected then raise exception 'conflicting event-id replay was accepted'; end if;
end;
$$;

do $$
declare
  revoked_at timestamptz;
  stale_result jsonb;
  event_rejected boolean := false;
begin
  perform public.record_ai_readiness_tracking_consent_v1(
    '99999999-0000-4000-8000-000000000010',
    '99999999-0000-4000-8000-000000000020',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    repeat('a', 64), repeat('9', 64), 'cookie-v1-2026-07-18',
    false, true, repeat('e', 64), 'Integration Test'
  );
  select analytics_consent_revoked_at into revoked_at
  from public.ai_readiness_assessments
  where submission_id = '11111111-1111-4111-8111-111111111111'
    and not analytics_consent;
  if revoked_at is null then raise exception 'analytics revocation was not persisted'; end if;

  begin
    perform public.record_ai_readiness_event_v1(
      '22222222-2222-4222-8222-222222222223', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      repeat('a', 64), 'report_viewed', 19::smallint, '{"score":47}'::jsonb, now(),
      'cookie-v1-2026-07-18', revoked_at
    );
  exception when others then
    event_rejected := sqlerrm like '%analytics_consent_not_current%';
  end;
  if not event_rejected then raise exception 'event was accepted after analytics revocation'; end if;

  stale_result := public.record_ai_readiness_tracking_consent_v1(
    '99999999-0000-4000-8000-000000000021',
    '99999999-0000-4000-8000-000000000020',
    'abababab-abab-4bab-8bab-abababababab',
    repeat('b', 64), repeat('9', 64), 'cookie-v1-2026-07-18',
    true, true, repeat('e', 64), 'Delayed cross-tab request'
  );
  if stale_result ->> 'status' <> 'stale'
    or stale_result ->> 'current_decision_id' <> '99999999-0000-4000-8000-000000000010'
    or exists (
      select 1 from private.ai_readiness_tracking_consents
      where decision_id = '99999999-0000-4000-8000-000000000021'
    )
  then raise exception 'delayed pre-revocation grant was not rejected: %', stale_result; end if;
  if not exists (
    select 1 from public.ai_readiness_assessments
    where submission_id = '11111111-1111-4111-8111-111111111111'
      and not analytics_consent and analytics_consent_revoked_at is not null
  ) then raise exception 'stale grant reactivated revoked analytics consent'; end if;

  perform public.record_ai_readiness_tracking_consent_v1(
    '99999999-0000-4000-8000-000000000011',
    '99999999-0000-4000-8000-000000000010',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    repeat('a', 64), repeat('9', 64), 'cookie-v1-2026-07-18',
    true, true, repeat('e', 64), 'Integration Test'
  );
  if not exists (
    select 1 from public.ai_readiness_assessments
    where submission_id = '11111111-1111-4111-8111-111111111111'
      and analytics_consent and analytics_consent_revoked_at is null
  ) then raise exception 'analytics re-consent did not restore current state'; end if;
end;
$$;

update private.ai_readiness_outbox set available_at = now() - interval '1 second';
create temporary table claimed as select * from public.claim_ai_readiness_deliveries_v1(4);

do $$
declare
  assessment uuid;
  delivery record;
  stale_rejected boolean := false;
begin
  if (select count(*) from claimed) <> 3 then raise exception 'claim count mismatch'; end if;
  if exists (
    select 1 from claimed
    where first_name is not null or last_name is not null or company is not null
      or industry is not null or employee_band is not null or respondent_role is not null
      or email is not null or phone is not null
      or (delivery_type = 'meta_capi' and (
        delivery_payload ->> 'emailSha256' !~ '^[0-9a-f]{64}$'
        or delivery_payload ->> 'phoneSha256' !~ '^[0-9a-f]{64}$'
      ))
      or (delivery_type = 'telegram_notification' and contact_id is not null)
      or (delivery_type = 'internal_notification' and contact_id is null)
  ) then raise exception 'delivery claim exposed data beyond channel minimum'; end if;
  select assessment_id into assessment from claimed limit 1;
  for delivery in select * from claimed loop
    perform public.complete_ai_readiness_delivery_v1(
      delivery.outbox_id,
      delivery.lease_token,
      delivery.delivery_type <> 'meta_capi',
      case when delivery.delivery_type = 'meta_capi' then 'timeout' else null end
    );
  end loop;
  if not exists (select 1 from public.ai_readiness_assessments where id = assessment and notification_status = 'delivered' and telegram_delivery_status = 'delivered' and meta_delivery_status = 'retry_pending') then
    raise exception 'delivery status mismatch';
  end if;
  if not exists (select 1 from private.ai_readiness_outbox where assessment_id = assessment and delivery_type = 'meta_capi' and status = 'pending' and attempts = 1) then
    raise exception 'retry state mismatch';
  end if;
  if not exists (
    select 1 from private.ai_readiness_outbox
    where assessment_id = assessment
      and delivery_type = 'meta_capi'
      and delivery_payload #>> '{clientIpAddress}' = '203.0.113.10'
  ) then raise exception 'retry lost short-lived Meta delivery context'; end if;
  select * into delivery from claimed where delivery_type = 'internal_notification';
  begin
    perform public.complete_ai_readiness_delivery_v1(delivery.outbox_id, delivery.lease_token, false, 'late_worker');
  exception when others then
    stale_rejected := sqlerrm like '%delivery_lease_invalid%';
  end;
  if not stale_rejected then raise exception 'stale delivery lease was accepted'; end if;
  if not exists (
    select 1 from private.ai_readiness_outbox where id = delivery.outbox_id and status = 'delivered'
  ) then raise exception 'delivered state was downgraded'; end if;

  update private.ai_readiness_outbox
  set available_at = pg_catalog.now() - interval '1 second'
  where assessment_id = assessment and delivery_type = 'meta_capi';
  select * into delivery
  from public.claim_ai_readiness_deliveries_v1(4)
  where delivery_type = 'meta_capi';
  if delivery.outbox_id is null then raise exception 'Meta retry was not claimable'; end if;
  perform public.complete_ai_readiness_delivery_v1(delivery.outbox_id, delivery.lease_token, false, 'not_configured');
  if not exists (
    select 1 from private.ai_readiness_outbox
    where id = delivery.outbox_id and status = 'dead' and delivery_payload = '{}'::jsonb
  ) then raise exception 'terminal Meta delivery retained raw context'; end if;
end;
$$;

do $$
declare
  assessment uuid;
  callback_consent uuid;
  telephone_at timestamptz := pg_catalog.statement_timestamp();
  email_at timestamptz := pg_catalog.statement_timestamp() + interval '1 minute';
  result jsonb;
  conflict_rejected boolean := false;
  duplicate_channel_rejected boolean := false;
  email_without_call_rejected boolean := false;
  wrong_target_rejected boolean := false;
  null_channel_rejected boolean := false;
  null_actor_rejected boolean := false;
begin
  select id into strict assessment
  from public.ai_readiness_assessments
  where submission_id = '11111111-1111-4111-8111-111111111111';
  select id into strict callback_consent
  from private.ai_readiness_contact_consents
  where assessment_id = assessment and consent_type = 'callback';

  begin
    perform public.record_ai_readiness_callback_use_v1(
      '33333333-3333-4333-8333-333333333327', assessment, null::text, '+491701234567', telephone_at, 'marco'
    );
  exception when others then
    null_channel_rejected := sqlerrm like '%invalid_callback_use%';
  end;
  if not null_channel_rejected then raise exception 'callback use accepted a null channel'; end if;

  begin
    perform public.record_ai_readiness_callback_use_v1(
      '33333333-3333-4333-8333-333333333328', assessment, 'telephone', '+491701234567', telephone_at, null::text
    );
  exception when others then
    null_actor_rejected := sqlerrm like '%invalid_callback_use%';
  end;
  if not null_actor_rejected then raise exception 'callback use accepted a null actor'; end if;

  begin
    perform public.record_ai_readiness_callback_use_v1(
      '33333333-3333-4333-8333-333333333330', assessment, 'email_follow_up', 'ada@example.com', email_at, 'marco'
    );
  exception when others then
    email_without_call_rejected := sqlerrm like '%callback_email_requires_telephone_attempt%';
  end;
  if not email_without_call_rejected then raise exception 'email follow-up was accepted before telephone attempt'; end if;

  begin
    perform public.record_ai_readiness_callback_use_v1(
      '33333333-3333-4333-8333-333333333329', assessment, 'telephone', '+491701234568', telephone_at, 'marco'
    );
  exception when others then
    wrong_target_rejected := sqlerrm like '%callback_target_not_consented%';
  end;
  if not wrong_target_rejected then raise exception 'callback use accepted a changed phone number'; end if;

  result := public.record_ai_readiness_callback_use_v1(
    '33333333-3333-4333-8333-333333333331', assessment, 'telephone', '+491701234567', telephone_at, 'marco'
  );
  if result ->> 'status' <> 'recorded'
    or result ->> 'use_id' <> '33333333-3333-4333-8333-333333333331'
  then raise exception 'callback use was not recorded with client id: %', result; end if;

  result := public.record_ai_readiness_callback_use_v1(
    '33333333-3333-4333-8333-333333333331', assessment, 'telephone', '+491701234567', telephone_at, 'marco'
  );
  if result ->> 'status' <> 'idempotent'
    or result ->> 'use_id' <> '33333333-3333-4333-8333-333333333331'
  then raise exception 'callback-use retry was not idempotent: %', result; end if;

  begin
    perform public.record_ai_readiness_callback_use_v1(
      '33333333-3333-4333-8333-333333333331', assessment, 'telephone', '+491701234567', telephone_at, 'phil'
    );
  exception when others then
    conflict_rejected := sqlerrm like '%callback_use_conflict%';
  end;
  if not conflict_rejected then raise exception 'conflicting callback-use replay was accepted'; end if;

  begin
    perform public.record_ai_readiness_callback_use_v1(
      '33333333-3333-4333-8333-333333333332', assessment, 'telephone', '+491701234567', telephone_at, 'marco'
    );
  exception when others then
    duplicate_channel_rejected := sqlerrm like '%callback_channel_already_used%';
  end;
  if not duplicate_channel_rejected then raise exception 'second telephone use was accepted'; end if;

  result := public.record_ai_readiness_callback_use_v1(
    '33333333-3333-4333-8333-333333333333', assessment, 'email_follow_up', 'ADA@EXAMPLE.COM', email_at, 'marco'
  );
  if result ->> 'status' <> 'recorded' then raise exception 'email follow-up use was not recorded: %', result; end if;
  if (select count(*) from private.ai_readiness_callback_uses where consent_id = callback_consent) <> 2 then
    raise exception 'callback-use channel scope mismatch';
  end if;
  if not exists (
    select 1 from private.ai_readiness_contact_consents
    where id = callback_consent and retention_until >= email_at + interval '5 years'
  ) then raise exception 'callback evidence retention was not extended five years from use'; end if;
  if (
    select count(*) from public.crm_contact_events
    where source = 'ki_readiness_callback'
      and details ->> 'assessment_id' = assessment::text
  ) <> 2 then raise exception 'callback use was not mirrored atomically into CRM history'; end if;

  delete from public.ai_readiness_assessments where id = assessment;
  if exists (select 1 from private.ai_readiness_outbox where assessment_id = assessment)
    or exists (select 1 from public.ai_readiness_events where assessment_id = assessment)
  then raise exception 'assessment-owned transient rows did not cascade'; end if;
  if not exists (
    select 1 from private.ai_readiness_contact_consents
    where id = callback_consent and assessment_id is null
  ) then raise exception 'callback consent evidence did not survive assessment deletion'; end if;
  if (
    select count(*) from private.ai_readiness_callback_uses
    where consent_id = callback_consent and assessment_id is null
  ) <> 2 then raise exception 'callback-use evidence did not survive assessment deletion'; end if;
  if not exists (
    select 1 from private.ai_readiness_tracking_consents
    where run_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and assessment_id is null
  ) then raise exception 'tracking-consent evidence did not detach from deleted assessment'; end if;
end;
$$;

insert into test_payloads(name, payload)
select 'exact_match', payload || jsonb_build_object(
  'submission_id', '66666666-6666-4666-8666-666666666666',
  'run_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'tracking_subject_hash', repeat('8', 64),
  'rate_ip_hash', repeat('f', 64),
  'rate_email_hash', repeat('0', 64),
  'rate_phone_hash', repeat('1', 64)
)
from test_payloads where name = 'first';

insert into test_payloads(name, payload)
select 'collision', jsonb_set(
  payload || jsonb_build_object(
    'submission_id', '77777777-7777-4777-8777-777777777777',
    'run_id', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'tracking_subject_hash', repeat('7', 64),
    'rate_ip_hash', repeat('2', 64),
    'rate_email_hash', repeat('3', 64),
    'rate_phone_hash', repeat('4', 64)
  ),
  '{contact,phone}', '"+491709999999"'::jsonb
)
from test_payloads where name = 'first';

insert into test_payloads(name, payload)
select 'no_marketing', jsonb_set(
  jsonb_set(
    payload || jsonb_build_object(
      'submission_id', '88888888-8888-4888-8888-888888888888',
      'run_id', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'tracking_subject_hash', repeat('6', 64),
      'rate_ip_hash', repeat('5', 64),
      'rate_email_hash', repeat('6', 64),
      'rate_phone_hash', repeat('7', 64),
      'contact', (payload -> 'contact') || jsonb_build_object('email', 'grace@example.com', 'phone', '+491711234567')
    ),
    '{consents,marketing,granted}', 'false'::jsonb
  ),
  '{consents,marketing,grantedAt}', 'null'::jsonb
)
from test_payloads where name = 'first';

do $$
declare
  result jsonb;
  collision_assessment uuid;
  no_marketing_assessment uuid;
begin
  perform public.record_ai_readiness_tracking_consent_v1(
    '99999999-0000-4000-8000-000000000002',
    null,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    repeat('a', 64), repeat('8', 64), 'cookie-v1-2026-07-18',
    true, true, repeat('e', 64), 'Integration Test'
  );
  select public.submit_ai_readiness_lead_v1(payload) into result from test_payloads where name = 'exact_match';
  if result ->> 'dedupe_status' <> 'email_phone_match' or (select count(*) from public.crm_contacts) <> 1 then
    raise exception 'exact match did not reuse contact: %', result;
  end if;

  perform public.record_ai_readiness_tracking_consent_v1(
    '99999999-0000-4000-8000-000000000003',
    null,
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    repeat('a', 64), repeat('7', 64), 'cookie-v1-2026-07-18',
    true, true, repeat('e', 64), 'Integration Test'
  );
  select public.submit_ai_readiness_lead_v1(payload) into result from test_payloads where name = 'collision';
  collision_assessment := (result ->> 'assessment_id')::uuid;
  if result ->> 'dedupe_status' <> 'dedupe_review' or (select count(*) from public.crm_contacts) <> 2 then
    raise exception 'collision did not create review contact: %', result;
  end if;
  if not exists (
    select 1 from public.crm_contacts as contact
    join public.ai_readiness_assessments as assessment on assessment.contact_id = contact.id
    where assessment.id = collision_assessment and 'dedupe-review' = any(contact.tags) and contact.lead_source = 'marketing'
  ) then raise exception 'collision review tag or CRM source missing'; end if;

  perform public.record_ai_readiness_tracking_consent_v1(
    '99999999-0000-4000-8000-000000000004',
    null,
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    repeat('a', 64), repeat('6', 64), 'cookie-v1-2026-07-18',
    true, false, repeat('e', 64), 'Integration Test'
  );
  select public.submit_ai_readiness_lead_v1(payload) into result from test_payloads where name = 'no_marketing';
  no_marketing_assessment := (result ->> 'assessment_id')::uuid;
  if not exists (
    select 1 from public.ai_readiness_assessments
    where id = no_marketing_assessment and not marketing_tracking_consent and meta_delivery_status = 'not_requested'
  ) then raise exception 'marketing refusal not persisted'; end if;
  if exists (
    select 1 from private.ai_readiness_outbox
    where assessment_id = no_marketing_assessment and delivery_type = 'meta_capi'
  ) then raise exception 'Meta delivery queued without consent'; end if;
  if (select count(*) from private.ai_readiness_outbox where assessment_id = no_marketing_assessment) <> 2 then
    raise exception 'operational notifications missing without marketing consent';
  end if;
end;
$$;

insert into test_payloads(name, payload)
select 'split_identity', jsonb_set(
  payload || jsonb_build_object(
    'submission_id', '90909090-9090-4090-8090-909090909090',
    'run_id', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'tracking_subject_hash', repeat('0', 63) || '1',
    'rate_ip_hash', repeat('8', 64),
    'rate_email_hash', repeat('9', 64),
    'rate_phone_hash', repeat('a', 64)
  ),
  '{contact}',
  jsonb_build_object(
    'firstName', 'Split',
    'lastName', 'Identity',
    'company', 'Prüffall GmbH',
    'email', 'split-email@example.com',
    'phone', '+491729876543'
  )
)
from test_payloads where name = 'first';

do $$
declare
  result jsonb;
  email_contact uuid;
  phone_contact uuid;
  resolved_contact uuid;
begin
  insert into public.crm_contacts(
    first_name, last_name, email, phone, company, contact_type, contact_source,
    lead_source, first_touch_channel, tags, pipeline_stage, created_at, updated_at
  ) values (
    'Email', 'Owner', 'split-email@example.com', null, 'E-Mail Bestand GmbH',
    'lead', 'marketing', 'marketing', 'website_formular', '{}'::text[], 'neu', now(), now()
  ) returning id into email_contact;

  insert into public.crm_contacts(
    first_name, last_name, email, phone, company, contact_type, contact_source,
    lead_source, first_touch_channel, tags, pipeline_stage, created_at, updated_at
  ) values (
    'Phone', 'Owner', 'phone-owner@example.com', '+491729876543', 'Telefon Bestand GmbH',
    'lead', 'marketing', 'marketing', 'website_formular', '{}'::text[], 'neu', now(), now()
  ) returning id into phone_contact;

  perform public.record_ai_readiness_tracking_consent_v1(
    '99999999-0000-4000-8000-000000000005',
    null,
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    repeat('a', 64), repeat('0', 63) || '1', 'cookie-v1-2026-07-18',
    true, true, repeat('e', 64), 'Integration Test'
  );
  select public.submit_ai_readiness_lead_v1(payload) into result
  from test_payloads where name = 'split_identity';
  resolved_contact := (result ->> 'contact_id')::uuid;

  if result ->> 'dedupe_status' <> 'dedupe_review'
     or resolved_contact in (email_contact, phone_contact) then
    raise exception 'split identity did not create an isolated review contact: %', result;
  end if;
  if (select phone from public.crm_contacts where id = email_contact) is not null then
    raise exception 'phone was copied onto the unrelated e-mail contact';
  end if;
  if (select email from public.crm_contacts where id = phone_contact) <> 'phone-owner@example.com' then
    raise exception 'e-mail was changed on the unrelated phone contact';
  end if;
  if not exists (
    select 1 from public.crm_contacts
    where id = resolved_contact and 'dedupe-review' = any(tags)
  ) then raise exception 'split identity review contact was not tagged'; end if;
end;
$$;

do $$
declare
  assessment uuid;
  telegram_id uuid;
  telegram_lease uuid := '14141414-1414-4414-8414-141414141414';
  first_analysis_lease uuid := '16161616-1616-4616-8616-161616161616';
  second_analysis_lease uuid := '17171717-1717-4717-8717-171717171717';
  callback_granted_at timestamptz;
  result jsonb;
  auth_result jsonb;
  callback_revocation_events integer;
  ai_revocation_events integer;
  backdated_use_rejected boolean := false;
  backdated_callback_revocation_rejected boolean := false;
  backdated_ai_revocation_rejected boolean := false;
  revoked_completion_rejected boolean := false;
  null_callback_actor_rejected boolean := false;
  null_ai_actor_rejected boolean := false;
begin
  select assessment_row.id, assessment_row.callback_consent_granted_at
  into strict assessment, callback_granted_at
  from public.ai_readiness_assessments as assessment_row
  where assessment_row.submission_id = '88888888-8888-4888-8888-888888888888';

  update private.ai_readiness_outbox set
    status = 'processing', locked_at = pg_catalog.now(), lease_token = telegram_lease
  where assessment_id = assessment and delivery_type = 'telegram_notification'
  returning id into strict telegram_id;
  auth_result := public.authorize_ai_readiness_contact_delivery_v1(telegram_id, telegram_lease);
  if coalesce((auth_result ->> 'authorized')::boolean, false) is not true
  then raise exception 'active callback consent was not authorized: %', auth_result; end if;

  result := public.claim_ai_readiness_analysis_v1(
    assessment, '88888888-8888-4888-8888-888888888888', first_analysis_lease
  );
  if result ->> 'status' <> 'claimed' then raise exception 'active AI consent did not permit a claim: %', result; end if;

  begin
    perform public.revoke_ai_readiness_callback_consent_v1(assessment, pg_catalog.statement_timestamp(), null::text);
  exception when others then
    null_callback_actor_rejected := sqlerrm like '%invalid_callback_revocation%';
  end;
  if not null_callback_actor_rejected then raise exception 'callback revocation accepted a null actor'; end if;
  begin
    perform public.revoke_ai_readiness_ai_consent_v1(assessment, pg_catalog.statement_timestamp(), null::text);
  exception when others then
    null_ai_actor_rejected := sqlerrm like '%invalid_ai_consent_revocation%';
  end;
  if not null_ai_actor_rejected then raise exception 'AI revocation accepted a null actor'; end if;

  begin
    perform public.revoke_ai_readiness_callback_consent_v1(
      assessment, pg_catalog.statement_timestamp() - interval '1 day', 'marco'
    );
  exception when others then
    backdated_callback_revocation_rejected := sqlerrm like '%invalid_callback_revocation%';
  end;
  if not backdated_callback_revocation_rejected then
    raise exception 'callback revocation accepted a backdated audit timestamp';
  end if;
  begin
    perform public.revoke_ai_readiness_ai_consent_v1(
      assessment, pg_catalog.statement_timestamp() - interval '1 day', 'marco'
    );
  exception when others then
    backdated_ai_revocation_rejected := sqlerrm like '%invalid_ai_consent_revocation%';
  end;
  if not backdated_ai_revocation_rejected then
    raise exception 'AI revocation accepted a backdated audit timestamp';
  end if;

  result := public.revoke_ai_readiness_callback_consent_v1(assessment, pg_catalog.statement_timestamp(), 'marco');
  if result ->> 'status' <> 'revoked' then raise exception 'callback consent was not revoked: %', result; end if;
  if not exists (
    select 1 from public.ai_readiness_assessments
    where id = assessment and callback_consent_revoked_at is not null
      and notification_status = 'dead' and telegram_delivery_status = 'dead'
  ) or not exists (
    select 1 from private.ai_readiness_contact_consents
    where assessment_id = assessment and consent_type = 'callback' and revoked_at is not null
  ) or exists (
    select 1 from private.ai_readiness_outbox
    where assessment_id = assessment and delivery_type in ('internal_notification', 'telegram_notification')
      and status <> 'dead'
  ) then raise exception 'callback revocation states or outbox cancellation diverged'; end if;
  auth_result := public.authorize_ai_readiness_contact_delivery_v1(telegram_id, telegram_lease);
  if coalesce((auth_result ->> 'authorized')::boolean, true)
    or coalesce((auth_result ->> 'lease_valid')::boolean, true)
  then raise exception 'revoked callback delivery was still authorized: %', auth_result; end if;

  begin
    perform public.record_ai_readiness_callback_use_v1(
      '15151515-1515-4515-8515-151515151515', assessment, 'telephone',
      '+491711234567', callback_granted_at, 'marco'
    );
  exception when others then
    backdated_use_rejected := sqlerrm like '%callback_consent_inactive%';
  end;
  if not backdated_use_rejected then raise exception 'backdated callback use was accepted after revocation'; end if;

  select count(*) into callback_revocation_events
  from public.crm_contact_events
  where source = 'ki_readiness_callback'
    and summary = 'KI-Readiness-Kontakteinwilligung widerrufen'
    and details ->> 'assessment_id' = assessment::text;
  result := public.revoke_ai_readiness_callback_consent_v1(assessment, pg_catalog.statement_timestamp(), 'marco');
  if result ->> 'status' <> 'idempotent' then raise exception 'callback revocation retry was not idempotent: %', result; end if;
  if (select count(*) from public.crm_contact_events
      where source = 'ki_readiness_callback'
        and summary = 'KI-Readiness-Kontakteinwilligung widerrufen'
        and details ->> 'assessment_id' = assessment::text) <> callback_revocation_events
  then raise exception 'callback revocation retry duplicated CRM history'; end if;

  result := public.revoke_ai_readiness_ai_consent_v1(assessment, pg_catalog.statement_timestamp(), 'marco');
  if result ->> 'status' <> 'revoked' then raise exception 'AI consent was not revoked: %', result; end if;
  if not exists (
    select 1 from public.ai_readiness_assessments
    where id = assessment and ai_consent_revoked_at is not null
      and analysis_status = 'failed' and analysis_lease_token is null and analysis_locked_at is null
  ) or not exists (
    select 1 from private.ai_readiness_contact_consents
    where assessment_id = assessment and consent_type = 'ai_processing' and revoked_at is not null
  ) then raise exception 'AI consent revocation states diverged'; end if;

  result := public.claim_ai_readiness_analysis_v1(
    assessment, '88888888-8888-4888-8888-888888888888', second_analysis_lease
  );
  if result ->> 'status' <> 'consent_revoked' then raise exception 'AI claim was accepted after revocation: %', result; end if;
  begin
    perform public.complete_ai_readiness_analysis_v1(
      assessment, first_analysis_lease, '{"must_not_persist":true}'::jsonb
    );
  exception when others then
    revoked_completion_rejected := sqlerrm like '%analysis_consent_revoked%';
  end;
  if not revoked_completion_rejected then raise exception 'in-flight AI result persisted after revocation'; end if;
  if exists (
    select 1 from public.ai_readiness_assessments
    where id = assessment and analysis_result is not null
  ) then raise exception 'revoked AI result was stored'; end if;

  select count(*) into ai_revocation_events
  from public.crm_contact_events
  where source = 'ki_readiness_ai_processing'
    and details ->> 'assessment_id' = assessment::text;
  result := public.revoke_ai_readiness_ai_consent_v1(assessment, pg_catalog.statement_timestamp(), 'marco');
  if result ->> 'status' <> 'idempotent' then raise exception 'AI consent revocation retry was not idempotent: %', result; end if;
  if (select count(*) from public.crm_contact_events
      where source = 'ki_readiness_ai_processing'
        and details ->> 'assessment_id' = assessment::text) <> ai_revocation_events
  then raise exception 'AI consent revocation retry duplicated CRM history'; end if;
end;
$$;

do $$
declare
  exact_assessment uuid;
  collision_assessment uuid;
  collision_meta uuid;
  collision_lease uuid := '44444444-4444-4444-8444-444444444444';
  auth_result jsonb;
begin
  select id into strict exact_assessment
  from public.ai_readiness_assessments
  where submission_id = '66666666-6666-4666-8666-666666666666';
  select id into strict collision_assessment
  from public.ai_readiness_assessments
  where submission_id = '77777777-7777-4777-8777-777777777777';

  perform public.record_ai_readiness_tracking_consent_v1(
    '99999999-0000-4000-8000-000000000012',
    '99999999-0000-4000-8000-000000000002',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    repeat('a', 64), repeat('8', 64), 'cookie-v1-2026-07-18',
    true, false, repeat('e', 64), 'Integration Test'
  );
  if not exists (
    select 1 from private.ai_readiness_outbox
    where assessment_id = exact_assessment and delivery_type = 'meta_capi'
      and status = 'dead' and last_error_code = 'consent_revoked'
      and delivery_payload = '{}'::jsonb and locked_at is null and lease_token is null
  ) then raise exception 'pending Meta delivery was not cancelled on consent revocation'; end if;
  if not exists (
    select 1 from public.ai_readiness_assessments
    where id = exact_assessment and not marketing_tracking_consent
      and marketing_consent_revoked_at is not null and meta_delivery_status = 'dead'
  ) then raise exception 'assessment Meta state was not synchronized after revocation'; end if;

  update private.ai_readiness_outbox
  set status = 'processing', locked_at = pg_catalog.now(), lease_token = collision_lease
  where assessment_id = collision_assessment and delivery_type = 'meta_capi'
  returning id into collision_meta;
  if collision_meta is null then raise exception 'collision Meta delivery missing'; end if;

  perform public.record_ai_readiness_tracking_consent_v1(
    '99999999-0000-4000-8000-000000000013',
    '99999999-0000-4000-8000-000000000003',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    repeat('a', 64), repeat('7', 64), 'cookie-v1-2026-07-18',
    true, false, repeat('e', 64), 'Integration Test'
  );
  if not exists (
    select 1 from private.ai_readiness_outbox
    where id = collision_meta and status = 'dead'
      and last_error_code = 'consent_revoked' and delivery_payload = '{}'::jsonb
      and locked_at is null and lease_token is null
  ) then raise exception 'in-flight Meta delivery was not cancelled on consent revocation'; end if;
  auth_result := public.authorize_ai_readiness_meta_delivery_v1(collision_meta, collision_lease);
  if coalesce((auth_result ->> 'authorized')::boolean, true)
    or coalesce((auth_result ->> 'lease_valid')::boolean, true)
  then raise exception 'cancelled Meta lease was still authorized: %', auth_result; end if;
end;
$$;

do $$
declare
  exact_assessment uuid;
  notification_id uuid;
  telegram_id uuid;
  telegram_lease uuid := '55555555-5555-4555-8555-555555555555';
begin
  select id into strict exact_assessment
  from public.ai_readiness_assessments
  where submission_id = '66666666-6666-4666-8666-666666666666';

  update private.ai_readiness_outbox
  set expires_at = pg_catalog.now() - interval '1 second', available_at = pg_catalog.now() - interval '1 second'
  where assessment_id = exact_assessment and delivery_type = 'internal_notification'
  returning id into notification_id;
  perform public.claim_ai_readiness_deliveries_v1(1);
  if not exists (
    select 1 from private.ai_readiness_outbox
    where id = notification_id and status = 'dead' and last_error_code = 'expired'
      and delivery_payload = '{}'::jsonb and locked_at is null and lease_token is null
  ) or not exists (
    select 1 from public.ai_readiness_assessments
    where id = exact_assessment and notification_status = 'dead'
  ) then raise exception 'outbox expiry was not synchronized to assessment'; end if;

  update private.ai_readiness_outbox
  set status = 'processing', locked_at = pg_catalog.now() - interval '16 minutes', lease_token = telegram_lease
  where assessment_id = exact_assessment and delivery_type = 'telegram_notification'
  returning id into telegram_id;
  perform public.complete_ai_readiness_delivery_v1(telegram_id, telegram_lease, true, null);
  if not exists (
    select 1 from private.ai_readiness_outbox
    where id = telegram_id and status = 'pending' and attempts = 1
      and last_error_code = 'lease_expired' and locked_at is null and lease_token is null
  ) or not exists (
    select 1 from public.ai_readiness_assessments
    where id = exact_assessment and telegram_delivery_status = 'retry_pending'
  ) then raise exception 'expired lease was not safely requeued and synchronized'; end if;
end;
$$;

do $$
declare
  assessment uuid;
  contact uuid;
begin
  select id, contact_id into assessment, contact
  from public.ai_readiness_assessments
  where submission_id = '88888888-8888-4888-8888-888888888888';
  delete from public.crm_contact_events where contact_id = contact;
  delete from public.ai_readiness_assessments where id = assessment;
  if exists (select 1 from private.ai_readiness_outbox where assessment_id = assessment)
    or exists (select 1 from public.ai_readiness_events where assessment_id = assessment)
  then raise exception 'assessment-owned rows did not cascade'; end if;
  delete from public.crm_contacts where id = contact;
  if (
    select count(*) from private.ai_readiness_contact_consents
    where submission_id = '88888888-8888-4888-8888-888888888888' and assessment_id is null
  ) <> 2 then
    raise exception 'consent ledger was deleted with CRM lifecycle';
  end if;
  if not exists (
    select 1 from private.ai_readiness_tracking_consents
    where run_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' and assessment_id is null
  ) then raise exception 'tracking-consent FK did not null on assessment deletion'; end if;
end;
$$;

insert into private.ai_readiness_tracking_consents(
  decision_id, run_id, session_hash, tracking_subject_hash, consent_version,
  analytics_consent, analytics_consent_text, analytics_consent_hash,
  marketing_consent, marketing_consent_text, marketing_consent_hash,
  decided_at, retention_until
) values (
  '99999999-9999-4999-8999-999999999998', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  repeat('9', 64), repeat('5', 64), 'cookie-v1-2026-07-18',
  true, 'Test analytics consent', repeat('a', 64),
  false, 'Test marketing consent', repeat('b', 64),
  now() - interval '25 months', now() - interval '1 day'
);

insert into public.ai_readiness_events (
  event_id, run_id, session_hash, event_name, properties,
  tracking_consent_id, analytics_consent_version, analytics_consent_granted_at, occurred_at, created_at
) values (
  '99999999-9999-4999-8999-999999999999', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  repeat('9', 64), 'landing_viewed', '{}'::jsonb,
  (select id from private.ai_readiness_tracking_consents where decision_id = '99999999-9999-4999-8999-999999999998'),
  'cookie-v1-2026-07-18',
  now() - interval '91 days', now() - interval '91 days', now() - interval '91 days'
);

do $$
declare result jsonb;
begin
  select public.purge_ai_readiness_ephemeral_v1() into result;
  if (result ->> 'events_deleted')::integer < 1 then raise exception 'event retention purge failed: %', result; end if;
  if exists (select 1 from public.ai_readiness_events where event_id = '99999999-9999-4999-8999-999999999999') then
    raise exception 'expired event still exists';
  end if;
  if exists (
    select 1 from private.ai_readiness_tracking_consents
    where decision_id = '99999999-9999-4999-8999-999999999998'
  ) then raise exception 'expired tracking consent still exists after dependent event purge'; end if;
end;
$$;

rollback;
