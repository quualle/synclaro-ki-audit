\set ON_ERROR_STOP on

begin;
set local role service_role;

create or replace function pg_temp.make_payload(
  p_assessment uuid,
  p_submission uuid,
  p_run uuid,
  p_session_char text,
  p_tracking_char text,
  p_email text,
  p_newsletter boolean,
  p_marketing boolean
)
returns jsonb
language sql
as $$
  select pg_catalog.jsonb_build_object(
    'assessment_id', p_assessment,
    'submission_id', p_submission,
    'run_id', p_run,
    'session_hash', pg_catalog.repeat(p_session_char, 64),
    'rate_ip_hash', pg_catalog.repeat('a', 64),
    'rate_email_hash', pg_catalog.encode(extensions.digest(p_email, 'sha256'), 'hex'),
    'tracking_subject_hash', pg_catalog.repeat(p_tracking_char, 64),
    'contact', pg_catalog.jsonb_build_object(
      'firstName', 'Ada', 'lastName', 'Lovelace', 'company', 'Analytical GmbH', 'email', p_email
    ),
    'profile', pg_catalog.jsonb_build_object(
      'branche', 'Unternehmensberatung', 'mitarbeiter', '1-5', 'rolle', 'inhaber', 'hauptziel', 'zeit'
    ),
    'answers', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('questionId', 'prozess_standardisierung', 'answer', '2', 'answerLabel', 'Teilweise dokumentiert'),
      pg_catalog.jsonb_build_object('questionId', 'daten_zugriff', 'answer', '3', 'answerLabel', 'Meist zentral'),
      pg_catalog.jsonb_build_object('questionId', 'system_brueche', 'answer', '2', 'answerLabel', 'Regelmäßig'),
      pg_catalog.jsonb_build_object('questionId', 'routineaufgaben', 'answer', '1', 'answerLabel', 'Sehr stark'),
      pg_catalog.jsonb_build_object('questionId', 'wissen_verteilung', 'answer', '2', 'answerLabel', 'Viele Rückfragen'),
      pg_catalog.jsonb_build_object('questionId', 'team_digital', 'answer', '3', 'answerLabel', 'Mit guter Einführung'),
      pg_catalog.jsonb_build_object('questionId', 'ki_nutzung', 'answer', '2', 'answerLabel', 'Punktuell'),
      pg_catalog.jsonb_build_object('questionId', 'ki_leitplanken', 'answer', '1', 'answerLabel', 'Keine Regeln'),
      pg_catalog.jsonb_build_object('questionId', 'ki_zielbild', 'answer', '3', 'answerLabel', 'Erster Anwendungsfall'),
      pg_catalog.jsonb_build_object('questionId', 'verantwortung', 'answer', '2', 'answerLabel', 'Nebenbei'),
      pg_catalog.jsonb_build_object('questionId', 'umsetzungstempo', 'answer', '3', 'answerLabel', 'Vier bis acht Wochen'),
      pg_catalog.jsonb_build_object('questionId', 'erfolgsmessung', 'answer', '3', 'answerLabel', 'Zeit oder Qualität')
    ),
    'baseline', pg_catalog.jsonb_build_object(
      'scores', pg_catalog.jsonb_build_object(
        'prozesse_daten', pg_catalog.jsonb_build_object('percent', 42),
        'team_wissen', pg_catalog.jsonb_build_object('percent', 50),
        'ki_praxis', pg_catalog.jsonb_build_object('percent', 44),
        'umsetzungskraft', pg_catalog.jsonb_build_object('percent', 56),
        'total', pg_catalog.jsonb_build_object('percent', 47)
      ),
      'level', 'KI-Startklar'
    ),
    'result', pg_catalog.jsonb_build_object(
      'scores', pg_catalog.jsonb_build_object('total', pg_catalog.jsonb_build_object('percent', 47)),
      'level', 'KI-Startklar', 'gesamteinschaetzung', 'Deterministische Testauswertung',
      'empfehlungen', pg_catalog.jsonb_build_array('A', 'B', 'C')
    ),
    'attribution', pg_catalog.jsonb_build_object(
      'eventId', p_submission, 'landingUrl', 'https://ki-check.synclaro.de/',
      'utm_source', case when p_marketing then 'meta' else '' end,
      'utm_campaign', case when p_marketing then 'ai_readiness_de_prospecting_v1' else '' end
    ),
    'consents', pg_catalog.jsonb_build_object(
      'privacyNotice', pg_catalog.jsonb_build_object(
        'acknowledged', true, 'version', 'privacy-ai-readiness-v2-2026-07-19'
      ),
      'newsletter', pg_catalog.jsonb_build_object(
        'granted', p_newsletter,
        'version', 'newsletter-email-v1-2026-07-19',
        'text', 'Ja, ich möchte regelmäßig praxistaugliche KI-Impulse, Einladungen und Angebote von Synclaro per E-Mail erhalten. Die Anmeldung wird per Double-Opt-in bestätigt; eine Abmeldung ist jederzeit möglich.'
      ),
      'analytics', pg_catalog.jsonb_build_object('granted', false, 'version', 'cookie-v1-2026-07-18'),
      'marketing', pg_catalog.jsonb_build_object('granted', p_marketing, 'version', 'cookie-v1-2026-07-18'),
      'evidence', pg_catalog.jsonb_build_object('ipHash', pg_catalog.repeat('e', 64), 'userAgent', 'Integration Test')
    ),
    'assessment_version', '2026-07-19.v3',
    'privacy_version', 'privacy-ai-readiness-v2-2026-07-19',
    'newsletter_confirmation_token', case when p_newsletter then '2000000000.testsignature' else null end,
    'delivery_context', case when p_marketing then pg_catalog.jsonb_build_object('clientIpAddress', '203.0.113.10') else '{}'::jsonb end
  );
$$;

do $$
declare
  v_result jsonb;
  v_retry jsonb;
  v_restore_after_tracking_change jsonb;
  v_conflict boolean := false;
  v_newsletter_conflict boolean := false;
begin
  perform public.record_ai_readiness_tracking_consent_v1(
    '11111111-1111-4111-8111-111111111111', null,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_catalog.repeat('1', 64), pg_catalog.repeat('1', 64),
    'cookie-v1-2026-07-18', false, false, pg_catalog.repeat('e', 64), 'Integration Test'
  );
  v_result := public.submit_ai_readiness_lead_v2(pg_temp.make_payload(
    '10101010-1010-4010-8010-101010101010', '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '1', '1', 'ada@example.com', false, false
  ));
  if v_result ->> 'status' <> 'created' or v_result ->> 'newsletter_status' <> 'not_requested'
  then raise exception 'plain lead failed: %', v_result; end if;
  v_retry := public.submit_ai_readiness_lead_v2(pg_temp.make_payload(
    '10101010-1010-4010-8010-101010101010', '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '1', '1', 'ada@example.com', false, false
  ));
  if v_retry ->> 'status' <> 'idempotent'
    or v_retry #>> '{result,gesamteinschaetzung}' <> 'Deterministische Testauswertung'
  then raise exception 'lead retry not idempotent or not SSOT-backed: %', v_retry; end if;
  v_restore_after_tracking_change := public.restore_ai_readiness_lead_v1(pg_temp.make_payload(
    '99999999-9999-4999-8999-999999999999', '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '1', '1', 'ada@example.com', false, true
  ));
  if v_restore_after_tracking_change ->> 'found' <> 'true'
    or v_restore_after_tracking_change ->> 'status' <> 'idempotent'
    or v_restore_after_tracking_change #>> '{result,gesamteinschaetzung}' <> 'Deterministische Testauswertung'
  then raise exception 'stored lead could not be restored after tracking change: %', v_restore_after_tracking_change; end if;
  begin
    perform public.submit_ai_readiness_lead_v2(pg_catalog.jsonb_set(
      pg_temp.make_payload(
        '10101010-1010-4010-8010-101010101010', '11111111-1111-4111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '1', '1', 'ada@example.com', false, false
      ),
      '{contact,company}', '"Manipulierte Retry GmbH"'::jsonb
    ));
  exception when others then
    v_conflict := sqlerrm like '%submission_conflict%';
  end;
  if not v_conflict then raise exception 'changed lead retry was accepted'; end if;
  begin
    perform public.submit_ai_readiness_lead_v2(pg_temp.make_payload(
      '10101010-1010-4010-8010-101010101010', '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '1', '1', 'ada@example.com', true, false
    ));
  exception when others then
    v_newsletter_conflict := sqlerrm like '%submission_conflict%';
  end;
  if not v_newsletter_conflict then raise exception 'changed newsletter choice on retry was accepted'; end if;
end;
$$;

do $$
begin
  if (select count(*) from public.crm_contacts where email = 'ada@example.com') <> 1
    or (select phone from public.crm_contacts where email = 'ada@example.com') is not null
  then raise exception 'email-only CRM contact was not persisted safely'; end if;
  if exists (select 1 from public.crm_marketing_consents consent join public.crm_contacts contact on contact.id = consent.contact_id where contact.email = 'ada@example.com')
  then raise exception 'newsletter consent was created without opt-in'; end if;
  if (select count(*) from private.ai_readiness_outbox outbox join public.ai_readiness_assessments assessment on assessment.id = outbox.assessment_id where assessment.submission_id = '11111111-1111-4111-8111-111111111111') <> 1
    or not exists (select 1 from private.ai_readiness_outbox outbox join public.ai_readiness_assessments assessment on assessment.id = outbox.assessment_id where assessment.submission_id = '11111111-1111-4111-8111-111111111111' and outbox.delivery_type = 'internal_notification')
  then raise exception 'plain lead outbox is not internal-only'; end if;
  if not exists (select 1 from public.ai_readiness_assessments where submission_id = '11111111-1111-4111-8111-111111111111' and result ->> 'gesamteinschaetzung' = 'Deterministische Testauswertung' and submission_fingerprint ~ '^[0-9a-f]{64}$')
  then raise exception 'deterministic result missing'; end if;
end;
$$;

do $$
declare v_result jsonb;
begin
  perform public.record_ai_readiness_tracking_consent_v1(
    '22222222-2222-4222-8222-222222222222', null,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', pg_catalog.repeat('2', 64), pg_catalog.repeat('2', 64),
    'cookie-v1-2026-07-18', false, false, pg_catalog.repeat('e', 64), 'Integration Test'
  );
  v_result := public.submit_ai_readiness_lead_v2(pg_temp.make_payload(
    '20202020-2020-4020-8020-202020202020', '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2', '2', 'newsletter@example.com', true, false
  ));
  if v_result ->> 'newsletter_status' <> 'doi_pending' then raise exception 'DOI was not pending: %', v_result; end if;
end;
$$;

do $$
declare
  v_contact uuid;
  v_consent public.crm_marketing_consents%rowtype;
  v_confirm jsonb;
  v_retry jsonb;
  v_claim record;
  v_doi_checked boolean := false;
  v_welcome_checked boolean := false;
begin
  select id into v_contact from public.crm_contacts where email = 'newsletter@example.com';
  select * into v_consent from public.crm_marketing_consents where contact_id = v_contact and channel = 'email' and revoked_at is null;
  if v_consent.id is null or v_consent.double_optin_requested_at is null or v_consent.double_optin_confirmed_at is not null
  then raise exception 'pending DOI evidence invalid'; end if;
  if exists (select 1 from public.v_email_marketing_list where contact_id = v_contact)
  then raise exception 'pending DOI leaked into active email list'; end if;
  if (select pg_catalog.array_agg(delivery_type order by delivery_type) from private.ai_readiness_outbox where assessment_id = '20202020-2020-4020-8020-202020202020')
    <> array['internal_notification', 'newsletter_double_optin', 'telegram_notification']::text[]
  then raise exception 'newsletter outbox set invalid'; end if;
  update public.crm_contacts set email = 'crm-changed-before-doi@example.com' where id = v_contact;
  for v_claim in select * from public.claim_ai_readiness_deliveries_v2(10)
  loop
    if v_claim.assessment_id = '20202020-2020-4020-8020-202020202020'
      and v_claim.delivery_type = 'newsletter_double_optin'
    then
      v_doi_checked := true;
      if v_claim.email <> 'newsletter@example.com'
      then raise exception 'DOI recipient drifted with CRM email: %', v_claim.email; end if;
    end if;
    perform public.complete_ai_readiness_delivery_v2(v_claim.outbox_id, v_claim.lease_token, true, null);
  end loop;
  if not v_doi_checked then raise exception 'DOI recipient immutability was not exercised'; end if;
  update public.crm_contacts set email = 'newsletter@example.com' where id = v_contact;
  v_confirm := public.confirm_ai_readiness_newsletter_v1(
    '20202020-2020-4020-8020-202020202020', '22222222-2222-4222-8222-222222222222',
    'unsubscribe-test-token', 'bookingpayload.bookingsignature'
  );
  v_retry := public.confirm_ai_readiness_newsletter_v1(
    '20202020-2020-4020-8020-202020202020', '22222222-2222-4222-8222-222222222222',
    'unsubscribe-test-token', 'unusedretry.unusedsignature'
  );
  if v_confirm ->> 'status' <> 'confirmed' or v_retry ->> 'status' <> 'idempotent'
  then raise exception 'DOI confirmation is not idempotent: %, %', v_confirm, v_retry; end if;
  if not exists (select 1 from public.v_email_marketing_list where contact_id = v_contact)
  then raise exception 'confirmed DOI missing from active email list'; end if;
  if (select count(*) from private.ai_readiness_outbox
      where assessment_id = '20202020-2020-4020-8020-202020202020'
        and delivery_type = 'newsletter_welcome'
        and delivery_payload ->> 'unsubscribeToken' = 'unsubscribe-test-token'
        and delivery_payload ->> 'bookingReference' = 'bookingpayload.bookingsignature') <> 1
  then raise exception 'confirmed DOI did not queue exactly one welcome email'; end if;
  update public.crm_contacts set email = 'crm-changed-before-welcome@example.com' where id = v_contact;
  if (select email from public.v_email_marketing_list where contact_id = v_contact) <> 'newsletter@example.com'
  then raise exception 'active Readiness list drifted with CRM email'; end if;
  for v_claim in select * from public.claim_ai_readiness_deliveries_v2(10)
  loop
    if v_claim.assessment_id = '20202020-2020-4020-8020-202020202020'
      and v_claim.delivery_type = 'newsletter_welcome'
    then
      v_welcome_checked := true;
      if v_claim.email <> 'newsletter@example.com'
        or v_claim.delivery_payload ->> 'bookingReference' <> 'bookingpayload.bookingsignature'
      then raise exception 'welcome recipient or booking reference drifted: %', v_claim; end if;
    end if;
    perform public.complete_ai_readiness_delivery_v2(v_claim.outbox_id, v_claim.lease_token, true, null);
  end loop;
  if not v_welcome_checked then raise exception 'welcome recipient immutability was not exercised'; end if;
  update public.crm_contacts set email = 'newsletter@example.com' where id = v_contact;
end;
$$;

do $$
declare
  v_historical_contact uuid;
  v_result jsonb;
begin
  insert into public.crm_contacts(first_name, last_name, email, company, contact_type, contact_source, lead_source, first_touch_channel)
  values ('Historisch', 'Optin', 'historical@example.com', 'Historisch GmbH', 'lead', 'marketing', 'marketing', 'website_formular')
  returning id into v_historical_contact;
  insert into public.crm_marketing_consents(contact_id, channel, granted_at, source, consent_text, evidence)
  values (v_historical_contact, 'email', pg_catalog.now(), 'herocon-2026-optin', 'Historischer Bestand', '{"email":"historical@example.com"}'::jsonb);
  if not exists (select 1 from public.v_email_marketing_list where contact_id = v_historical_contact)
  then raise exception 'historical consent was removed by DOI hardening'; end if;
  perform public.record_ai_readiness_tracking_consent_v1(
    '26262626-2626-4262-8262-262626262626', null,
    '27272727-2727-4272-8272-272727272727', pg_catalog.repeat('5', 64), pg_catalog.repeat('5', 64),
    'cookie-v1-2026-07-18', false, false, pg_catalog.repeat('e', 64), 'Integration Test'
  );
  v_result := public.submit_ai_readiness_lead_v2(pg_temp.make_payload(
    '25252525-2525-4252-8252-252525252525', '26262626-2626-4262-8262-262626262626',
    '27272727-2727-4272-8272-272727272727', '5', '5', 'historical@example.com', true, false
  ));
  if v_result ->> 'status' <> 'created'
    or v_result ->> 'newsletter_status' <> 'already_active'
    or not exists (
      select 1 from public.ai_readiness_assessments
      where id = '25252525-2525-4252-8252-252525252525'
        and newsletter_status = 'already_active'
        and newsletter_marketing_consent_id is not null
        and newsletter_requested_at is not null
        and newsletter_confirmed_at is null
    )
    or (select count(*) from public.crm_marketing_consents where contact_id = v_historical_contact and channel = 'email' and revoked_at is null) <> 1
    or exists (
      select 1 from private.ai_readiness_outbox
      where assessment_id = '25252525-2525-4252-8252-252525252525'
        and delivery_type = 'newsletter_double_optin'
    )
  then raise exception 'historical active consent could not be reused safely: %', v_result; end if;
end;
$$;

do $$
declare v_result jsonb;
begin
  perform public.record_ai_readiness_tracking_consent_v1(
    '33333333-3333-4333-8333-333333333333', null,
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc', pg_catalog.repeat('3', 64), pg_catalog.repeat('3', 64),
    'cookie-v1-2026-07-18', false, true, pg_catalog.repeat('e', 64), 'Integration Test'
  );
  v_result := public.submit_ai_readiness_lead_v2(pg_temp.make_payload(
    '30303030-3030-4030-8030-303030303030', '33333333-3333-4333-8333-333333333333',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '3', '3', 'meta@example.com', false, true
  ));
  if v_result ->> 'newsletter_status' <> 'not_requested'
    or not exists (select 1 from private.ai_readiness_outbox where assessment_id = '30303030-3030-4030-8030-303030303030' and delivery_type = 'meta_capi')
    or exists (select 1 from private.ai_readiness_outbox where assessment_id = '30303030-3030-4030-8030-303030303030' and delivery_type in ('telegram_notification', 'newsletter_double_optin'))
    or exists (select 1 from public.crm_marketing_consents consent join public.crm_contacts contact on contact.id = consent.contact_id where contact.email = 'meta@example.com')
  then raise exception 'Meta tracking and newsletter consent were conflated'; end if;
end;
$$;

do $$
declare
  v_payload jsonb;
  v_result jsonb;
begin
  perform public.record_ai_readiness_tracking_consent_v1(
    '44444444-4444-4444-8444-444444444444', null,
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd', pg_catalog.repeat('4', 64), pg_catalog.repeat('4', 64),
    'cookie-v1-2026-07-18', false, true, pg_catalog.repeat('e', 64), 'Integration Test'
  );
  v_payload := pg_temp.make_payload(
    '40404040-4040-4040-8040-404040404040', '44444444-4444-4444-8444-444444444444',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd', '4', '4', 'nonfit@example.com', false, true
  );
  v_payload := pg_catalog.jsonb_set(v_payload, '{profile,mitarbeiter}', '"21-50"'::jsonb);
  v_payload := pg_catalog.jsonb_set(v_payload, '{profile,rolle}', '"mitarbeit"'::jsonb);
  v_result := public.submit_ai_readiness_lead_v2(v_payload);
  if v_result ->> 'meta_lead_eligible' <> 'false'
    or not exists (
      select 1 from public.ai_readiness_assessments
      where id = '40404040-4040-4040-8040-404040404040'
        and not lead_fit and meta_delivery_status = 'not_requested'
    )
    or exists (
      select 1 from private.ai_readiness_outbox
      where assessment_id = '40404040-4040-4040-8040-404040404040'
        and delivery_type = 'meta_capi'
    )
  then raise exception 'non-ICP completion was emitted as Meta Lead: %', v_result; end if;
end;
$$;

do $$
declare
  v_result jsonb;
  v_retry jsonb;
  v_second jsonb;
  v_conflict boolean := false;
begin
  v_result := public.record_ai_readiness_booking_v1(
    'booking-readiness-001', '30303030-3030-4030-8030-303030303030',
    '33333333-3333-4333-8333-333333333333', 12345, 'ki-erstgespraech',
    pg_catalog.repeat('a', 64), pg_catalog.now()
  );
  v_retry := public.record_ai_readiness_booking_v1(
    'booking-readiness-001', '30303030-3030-4030-8030-303030303030',
    '33333333-3333-4333-8333-333333333333', 12345, 'ki-erstgespraech',
    pg_catalog.repeat('a', 64), pg_catalog.now()
  );
  if v_result ->> 'status' <> 'created' or v_retry ->> 'status' <> 'idempotent'
  then raise exception 'booking receipt not idempotent: %, %', v_result, v_retry; end if;
  begin
    perform public.record_ai_readiness_booking_v1(
      'booking-readiness-001', '30303030-3030-4030-8030-303030303030',
      '33333333-3333-4333-8333-333333333333', 12345, 'ki-erstgespraech',
      pg_catalog.repeat('b', 64), pg_catalog.now()
    );
  exception when others then
    v_conflict := sqlerrm like '%booking_receipt_conflict%';
  end;
  if not v_conflict then raise exception 'conflicting booking replay was accepted'; end if;
  if not exists (select 1 from private.ai_readiness_booking_receipts where booking_uid = 'booking-readiness-001')
    or not exists (select 1 from public.crm_contact_events where source = 'calcom_ai_readiness' and summary = 'Kostenlose KI-Potenzialanalyse gebucht')
    or not exists (select 1 from private.ai_readiness_outbox where assessment_id = '30303030-3030-4030-8030-303030303030' and delivery_type = 'telegram_booking')
    or not exists (select 1 from private.ai_readiness_outbox where assessment_id = '30303030-3030-4030-8030-303030303030' and delivery_type = 'meta_schedule' and delivery_payload ->> 'emailSha256' ~ '^[0-9a-f]{64}$')
  then raise exception 'booking side effects incomplete'; end if;
  v_second := public.record_ai_readiness_booking_v1(
    'booking-readiness-002', '30303030-3030-4030-8030-303030303030',
    '33333333-3333-4333-8333-333333333333', 12345, 'ki-erstgespraech',
    pg_catalog.repeat('c', 64), pg_catalog.now()
  );
  if v_second ->> 'status' <> 'created'
    or (select count(*) from private.ai_readiness_booking_receipts where assessment_id = '30303030-3030-4030-8030-303030303030') <> 2
    or (select count(*) from public.crm_contact_events where source = 'calcom_ai_readiness' and contact_id = (
      select contact_id from public.ai_readiness_assessments where id = '30303030-3030-4030-8030-303030303030'
    )) <> 2
    or (select count(*) from private.ai_readiness_outbox where assessment_id = '30303030-3030-4030-8030-303030303030' and delivery_type = 'telegram_booking') <> 2
    or (select count(distinct dedupe_key) from private.ai_readiness_outbox where assessment_id = '30303030-3030-4030-8030-303030303030' and delivery_type = 'telegram_booking') <> 2
    or (select count(*) from private.ai_readiness_outbox where assessment_id = '30303030-3030-4030-8030-303030303030' and delivery_type = 'meta_schedule') <> 2
    or (select count(distinct delivery_payload ->> 'eventId') from private.ai_readiness_outbox where assessment_id = '30303030-3030-4030-8030-303030303030' and delivery_type = 'meta_schedule') <> 2
  then raise exception 'second legitimate booking was not delivered independently: %', v_second; end if;
end;
$$;

do $$
declare
  v_claim record;
  v_authorization jsonb;
  v_batch_count integer;
  v_total_count integer := 0;
begin
  loop
    v_batch_count := 0;
    for v_claim in select * from public.claim_ai_readiness_deliveries_v2(10)
    loop
      v_batch_count := v_batch_count + 1;
      v_total_count := v_total_count + 1;
      v_authorization := public.authorize_ai_readiness_delivery_v2(v_claim.outbox_id, v_claim.lease_token);
      if v_authorization ->> 'lease_valid' <> 'true' or v_authorization ->> 'authorized' <> 'true'
      then raise exception 'claimed delivery was not authorized: %, %', v_claim, v_authorization; end if;
      perform public.complete_ai_readiness_delivery_v2(v_claim.outbox_id, v_claim.lease_token, true, null);
    end loop;
    exit when v_batch_count = 0;
    if v_total_count > 50 then raise exception 'delivery claim loop did not converge'; end if;
  end loop;
  if v_total_count = 0 then raise exception 'claim returned no deliveries'; end if;
  if exists (select 1 from private.ai_readiness_outbox where status = 'processing')
  then raise exception 'complete left a delivery lease active'; end if;
  if exists (
    select 1
    from private.ai_readiness_outbox as outbox
    join public.ai_readiness_assessments as assessment on assessment.id = outbox.assessment_id
    where outbox.status = 'pending'
      and not (outbox.delivery_type = 'newsletter_double_optin' and assessment.newsletter_status <> 'doi_pending')
  ) then raise exception 'claim left an eligible delivery pending'; end if;
  if exists (select 1 from private.ai_readiness_outbox where status = 'delivered' and delivery_payload <> '{}'::jsonb)
  then raise exception 'complete retained delivered payloads'; end if;
end;
$$;

do $$
declare
  v_outbox_id uuid := '60606060-6060-4060-8060-606060606060';
  v_valid_lease uuid := '61616161-6161-4161-8161-616161616161';
  v_wrong_lease uuid := '62626262-6262-4262-8262-626262626262';
  v_authorization jsonb;
  v_invalid_rejected boolean := false;
begin
  insert into private.ai_readiness_outbox(
    id, assessment_id, delivery_type, dedupe_key, status, attempts,
    available_at, locked_at, lease_token, delivery_payload, expires_at
  ) values (
    v_outbox_id, '10101010-1010-4010-8010-101010101010', 'internal_notification',
    'negative-invalid-lease', 'processing', 0, pg_catalog.now(), pg_catalog.now(),
    v_valid_lease, '{"probe":"invalid-lease"}'::jsonb, pg_catalog.now() + interval '1 day'
  );
  v_authorization := public.authorize_ai_readiness_delivery_v2(v_outbox_id, v_wrong_lease);
  if v_authorization ->> 'lease_valid' <> 'false' or v_authorization ->> 'authorized' <> 'false'
  then raise exception 'wrong lease was authorized: %', v_authorization; end if;
  begin
    perform public.complete_ai_readiness_delivery_v2(v_outbox_id, v_wrong_lease, true, null);
  exception when others then
    v_invalid_rejected := sqlerrm like '%delivery_lease_invalid%';
  end;
  if not v_invalid_rejected then raise exception 'wrong lease completed delivery'; end if;
  perform public.complete_ai_readiness_delivery_v2(v_outbox_id, v_valid_lease, true, null);
  if not exists (
    select 1 from private.ai_readiness_outbox
    where id = v_outbox_id and status = 'delivered' and delivery_payload = '{}'::jsonb
  ) then raise exception 'valid lease did not complete after rejected replay'; end if;
end;
$$;

do $$
declare
  v_outbox_id uuid := '63636363-6363-4363-8363-636363636363';
  v_lease uuid := '64646464-6464-4464-8464-646464646464';
  v_authorization jsonb;
begin
  insert into private.ai_readiness_outbox(
    id, assessment_id, delivery_type, dedupe_key, status, attempts,
    available_at, locked_at, lease_token, delivery_payload, expires_at
  ) values (
    v_outbox_id, '10101010-1010-4010-8010-101010101010', 'internal_notification',
    'negative-expired-lease', 'processing', 0, pg_catalog.now(),
    pg_catalog.now() - interval '16 minutes', v_lease,
    '{"probe":"expired-lease"}'::jsonb, pg_catalog.now() + interval '1 day'
  );
  v_authorization := public.authorize_ai_readiness_delivery_v2(v_outbox_id, v_lease);
  if v_authorization ->> 'lease_valid' <> 'false' then raise exception 'expired lease remained valid: %', v_authorization; end if;
  perform public.complete_ai_readiness_delivery_v2(v_outbox_id, v_lease, true, null);
  if not exists (
    select 1 from private.ai_readiness_outbox
    where id = v_outbox_id and status = 'dead' and attempts = 1
      and last_error_code = 'expired' and delivery_payload = '{}'::jsonb
  ) then raise exception 'expired lease did not fail closed'; end if;
end;
$$;

do $$
declare
  v_outbox_id uuid := '65656565-6565-4565-8565-656565656565';
  v_first_lease uuid := '66666666-6666-4666-8666-666666666666';
  v_final_lease uuid := '67676767-6767-4767-8767-676767676767';
begin
  insert into private.ai_readiness_outbox(
    id, assessment_id, delivery_type, dedupe_key, status, attempts,
    available_at, locked_at, lease_token, delivery_payload, expires_at
  ) values (
    v_outbox_id, '10101010-1010-4010-8010-101010101010', 'internal_notification',
    'negative-backoff', 'processing', 0, pg_catalog.now(), pg_catalog.now(),
    v_first_lease, '{"probe":"retry"}'::jsonb, pg_catalog.now() + interval '1 day'
  );
  perform public.complete_ai_readiness_delivery_v2(v_outbox_id, v_first_lease, false, 'timeout');
  if not exists (
    select 1 from private.ai_readiness_outbox
    where id = v_outbox_id and status = 'pending' and attempts = 1
      and last_error_code = 'timeout'
      and available_at >= pg_catalog.now() + interval '9 minutes'
      and delivery_payload = '{"probe":"retry"}'::jsonb
  ) then raise exception 'retry did not retain payload with backoff'; end if;
  update private.ai_readiness_outbox set
    status = 'processing', attempts = 7, available_at = pg_catalog.now(),
    locked_at = pg_catalog.now(), lease_token = v_final_lease
  where id = v_outbox_id;
  perform public.complete_ai_readiness_delivery_v2(v_outbox_id, v_final_lease, false, 'timeout');
  if not exists (
    select 1 from private.ai_readiness_outbox
    where id = v_outbox_id and status = 'dead' and attempts = 8
      and last_error_code = 'timeout' and delivery_payload = '{}'::jsonb
  ) then raise exception 'retry cap did not terminate delivery safely'; end if;
end;
$$;

do $$
declare
  v_cancelled_id uuid := '70707070-7070-4070-8070-707070707070';
  v_outbox_id uuid := '68686868-6868-4868-8868-686868686868';
  v_lease uuid := '69696969-6969-4969-8969-696969696969';
  v_authorization jsonb;
begin
  insert into private.ai_readiness_outbox(
    id, assessment_id, delivery_type, dedupe_key, status, attempts,
    available_at, delivery_payload, expires_at
  ) values (
    v_cancelled_id, '30303030-3030-4030-8030-303030303030', 'meta_schedule',
    'negative-consent-pending', 'pending', 0, pg_catalog.now(),
    '{"eventId":"pending-revocation-probe","eventTime":1700000000}'::jsonb,
    pg_catalog.now() + interval '1 day'
  );
  perform public.record_ai_readiness_tracking_consent_v1(
    '77777777-7777-4777-8777-777777777777',
    '33333333-3333-4333-8333-333333333333',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc', pg_catalog.repeat('3', 64), pg_catalog.repeat('3', 64),
    'cookie-v1-2026-07-18', false, false, pg_catalog.repeat('e', 64), 'Integration Test'
  );
  if not exists (
    select 1 from private.ai_readiness_outbox
    where id = v_cancelled_id and status = 'dead'
      and last_error_code = 'consent_revoked' and delivery_payload = '{}'::jsonb
  ) then raise exception 'pending Meta Schedule survived consent revocation'; end if;
  insert into private.ai_readiness_outbox(
    id, assessment_id, delivery_type, dedupe_key, status, attempts,
    available_at, locked_at, lease_token, delivery_payload, expires_at
  ) values (
    v_outbox_id, '30303030-3030-4030-8030-303030303030', 'meta_schedule',
    'negative-consent-revoked', 'processing', 0, pg_catalog.now(), pg_catalog.now(),
    v_lease, '{"eventId":"revoked-probe","eventTime":1700000000}'::jsonb,
    pg_catalog.now() + interval '1 day'
  );
  v_authorization := public.authorize_ai_readiness_delivery_v2(v_outbox_id, v_lease);
  if v_authorization ->> 'lease_valid' <> 'true' or v_authorization ->> 'authorized' <> 'false'
  then raise exception 'revoked Meta consent remained authorized: %', v_authorization; end if;
  perform public.complete_ai_readiness_delivery_v2(v_outbox_id, v_lease, false, 'consent_revoked');
  if not exists (
    select 1 from private.ai_readiness_outbox
    where id = v_outbox_id and status = 'dead'
      and last_error_code = 'consent_revoked' and delivery_payload = '{}'::jsonb
  ) then raise exception 'revoked Meta delivery did not fail closed'; end if;
end;
$$;

do $$
declare
  v_revoke jsonb;
  v_retry jsonb;
  v_contact_id uuid;
begin
  insert into private.ai_readiness_outbox(
    assessment_id, delivery_type, dedupe_key, status, available_at, expires_at, delivery_payload
  ) values
    ('20202020-2020-4020-8020-202020202020', 'newsletter_welcome', 'revoke-probe', 'pending',
      pg_catalog.now(), pg_catalog.now() + interval '1 day', '{"unsubscribeToken":"revoke-probe"}'::jsonb),
    ('20202020-2020-4020-8020-202020202020', 'telegram_notification', 'revoke-probe', 'pending',
      pg_catalog.now(), pg_catalog.now() + interval '1 day', '{"newsletterStatus":"confirmed"}'::jsonb);
  v_revoke := public.revoke_ai_readiness_newsletter_v1(
    '20202020-2020-4020-8020-202020202020', '22222222-2222-4222-8222-222222222222'
  );
  v_retry := public.revoke_ai_readiness_newsletter_v1(
    '20202020-2020-4020-8020-202020202020', '22222222-2222-4222-8222-222222222222'
  );
  select contact_id into v_contact_id from public.ai_readiness_assessments
  where id = '20202020-2020-4020-8020-202020202020';
  if v_revoke ->> 'status' <> 'revoked' or v_retry ->> 'status' <> 'idempotent'
    or not exists (
      select 1 from public.ai_readiness_assessments
      where id = '20202020-2020-4020-8020-202020202020' and newsletter_status = 'revoked'
    )
    or not exists (
      select 1 from public.crm_marketing_consents
      where contact_id = v_contact_id and channel = 'email'
        and revoked_at is not null and revoke_source = 'ki-readiness-email-link'
    )
    or exists (select 1 from public.v_email_marketing_list where contact_id = v_contact_id)
    or exists (
      select 1 from private.ai_readiness_outbox
      where assessment_id = '20202020-2020-4020-8020-202020202020'
        and delivery_type in ('telegram_notification', 'newsletter_double_optin', 'newsletter_welcome')
        and status in ('pending', 'processing')
    )
    or exists (
      select 1 from private.ai_readiness_outbox
      where assessment_id = '20202020-2020-4020-8020-202020202020'
        and delivery_type in ('telegram_notification', 'newsletter_double_optin', 'newsletter_welcome')
        and status = 'dead' and delivery_payload <> '{}'::jsonb
    )
    or (select count(*) from public.crm_contact_events
        where contact_id = v_contact_id and summary = 'Newsletter-Einwilligung widerrufen') <> 1
  then raise exception 'newsletter revocation was not idempotent and fail-closed: %, %', v_revoke, v_retry; end if;
end;
$$;

do $$
declare
  v_consent_decided_at timestamptz;
  v_event_result jsonb;
  v_purge jsonb;
begin
  perform public.record_ai_readiness_tracking_consent_v1(
    '88888888-8888-4888-8888-888888888888',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pg_catalog.repeat('1', 64), pg_catalog.repeat('1', 64),
    'cookie-v1-2026-07-18', true, false, pg_catalog.repeat('e', 64), 'Integration Test'
  );
  select decided_at into v_consent_decided_at
  from private.ai_readiness_tracking_consents
  where decision_id = '88888888-8888-4888-8888-888888888888';
  v_event_result := public.record_ai_readiness_event_v1(
    '89898989-8989-4989-8989-898989898989'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, pg_catalog.repeat('1', 64),
    'report_viewed', 100::smallint, '{"campaign":"purge-probe"}'::jsonb,
    pg_catalog.now(), 'cookie-v1-2026-07-18', v_consent_decided_at
  );
  if v_event_result ->> 'accepted' <> 'true' then raise exception 'purge event fixture failed: %', v_event_result; end if;
  update public.ai_readiness_events set created_at = pg_catalog.now() - interval '91 days'
  where event_id = '89898989-8989-4989-8989-898989898989';
  update private.ai_readiness_tracking_consents set retention_until = pg_catalog.now() - interval '1 day'
  where decision_id = '88888888-8888-4888-8888-888888888888';
  update private.ai_readiness_outbox set created_at = pg_catalog.now() - interval '31 days'
  where id = '60606060-6060-4060-8060-606060606060';
  update private.ai_readiness_booking_receipts
  set received_at = pg_catalog.now() - interval '91 days'
  where booking_uid = 'booking-readiness-001';
  v_purge := public.purge_ai_readiness_ephemeral_v1();
  if exists (select 1 from public.ai_readiness_events where event_id = '89898989-8989-4989-8989-898989898989')
    or exists (select 1 from private.ai_readiness_tracking_consents where decision_id = '88888888-8888-4888-8888-888888888888')
    or exists (select 1 from private.ai_readiness_outbox where id = '60606060-6060-4060-8060-606060606060')
    or exists (select 1 from private.ai_readiness_booking_receipts where booking_uid = 'booking-readiness-001')
    or coalesce((v_purge ->> 'events_deleted')::integer, 0) < 1
    or coalesce((v_purge ->> 'outbox_deleted')::integer, 0) < 1
    or coalesce((v_purge ->> 'tracking_consent_evidence_deleted')::integer, 0) < 1
    or coalesce((v_purge ->> 'booking_receipts_deleted')::integer, 0) < 1
  then raise exception 'ephemeral purge did not cover every retention class: %', v_purge; end if;
end;
$$;

do $$
begin
  if has_schema_privilege('anon', 'private', 'usage')
    or has_schema_privilege('authenticated', 'private', 'usage')
    or has_table_privilege('anon', 'public.ai_readiness_assessments', 'select')
    or has_table_privilege('authenticated', 'public.ai_readiness_assessments', 'select')
    or has_table_privilege('anon', 'public.ai_readiness_events', 'select')
    or has_table_privilege('authenticated', 'public.ai_readiness_events', 'select')
    or has_table_privilege('anon', 'public.v_email_marketing_list', 'select')
    or has_table_privilege('authenticated', 'public.v_email_marketing_list', 'select')
    or has_function_privilege('anon', 'public.submit_ai_readiness_lead_v2(jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.submit_ai_readiness_lead_v2(jsonb)', 'execute')
    or has_function_privilege('anon', 'public.claim_ai_readiness_deliveries_v2(integer)', 'execute')
    or has_function_privilege('authenticated', 'public.claim_ai_readiness_deliveries_v2(integer)', 'execute')
    or has_function_privilege('anon', 'public.confirm_ai_readiness_newsletter_v1(uuid,uuid,text,text)', 'execute')
    or has_function_privilege('authenticated', 'public.confirm_ai_readiness_newsletter_v1(uuid,uuid,text,text)', 'execute')
    or has_function_privilege('anon', 'public.revoke_ai_readiness_newsletter_v1(uuid,uuid)', 'execute')
    or has_function_privilege('authenticated', 'public.revoke_ai_readiness_newsletter_v1(uuid,uuid)', 'execute')
  then raise exception 'anon/authenticated retained Readiness privileges'; end if;
  if not has_table_privilege('service_role', 'public.ai_readiness_assessments', 'select,insert,update,delete')
    or not has_table_privilege('service_role', 'public.ai_readiness_events', 'select,insert,update,delete')
    or not has_function_privilege('service_role', 'public.submit_ai_readiness_lead_v2(jsonb)', 'execute')
    or not has_function_privilege('service_role', 'public.claim_ai_readiness_deliveries_v2(integer)', 'execute')
    or not has_function_privilege('service_role', 'public.confirm_ai_readiness_newsletter_v1(uuid,uuid,text,text)', 'execute')
    or not has_function_privilege('service_role', 'public.revoke_ai_readiness_newsletter_v1(uuid,uuid)', 'execute')
    or not exists (
      select 1 from pg_catalog.pg_class
      where oid = 'public.ai_readiness_assessments'::regclass and relrowsecurity
    )
    or not exists (
      select 1 from pg_catalog.pg_class
      where oid = 'public.ai_readiness_events'::regclass and relrowsecurity
    )
  then raise exception 'service-role grants or Readiness RLS are incomplete'; end if;
end;
$$;

do $$
begin
  if to_regclass('private.ai_readiness_contact_consents') is not null
    or to_regclass('private.ai_readiness_callback_uses') is not null
    or exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_readiness_assessments' and column_name in ('callback_consent_version', 'ai_consent_version', 'analysis_status'))
    or to_regprocedure('public.claim_ai_readiness_analysis_v1(uuid,uuid,uuid)') is not null
  then raise exception 'legacy callback/OpenAI schema still present'; end if;
end;
$$;

rollback;
