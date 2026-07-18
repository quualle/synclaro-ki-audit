\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema extensions;
create extension pgcrypto with schema extensions;

create table public.crm_contacts (
  id uuid primary key default extensions.gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  company text,
  contact_type text not null default 'sonstige' check (contact_type in ('bestandskunde', 'lead', 'webinar_lead', 'ansprechpartner', 'multiplikator', 'netzwerk_partner', 'sonstige')),
  contact_source text check (contact_source in ('einzelcoaching', 'gruppencoaching_portal', 'networking_org', 'webinar', 'multiplikator', 'messe', 'website', 'empfehlung', 'marketing', 'academy_portal')),
  lead_source text check (lead_source in ('messe', 'hwk_veranstaltung', 'website', 'tiktok', 'instagram', 'empfehlung', 'kaltakquise', 'marketing', 'werkbank_format', 'linkedin', 'youtube', 'google', 'sonstiges')),
  first_touch_channel text check (first_touch_channel in ('telefon', 'email', 'website_formular', 'social_dm', 'persoenlich')),
  tags text[],
  pipeline_stage text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_contact_events (
  id uuid primary key default extensions.gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  event_type text not null check (event_type in ('erstkontakt', 'folgekontakt', 'termin', 'angebot', 'zahlung', 'notiz', 'statusaenderung', 'email', 'anruf')),
  channel text check (channel in ('telefon', 'email', 'website_formular', 'social_dm', 'persoenlich', 'portal')),
  source text,
  summary text,
  details jsonb not null default '{}'::jsonb,
  actor text check (actor in ('marco', 'phil', 'simon', 'system')),
  created_at timestamptz not null default now()
);

grant usage on schema public, extensions to service_role;
grant select, insert, update, delete on public.crm_contacts, public.crm_contact_events to service_role;
grant execute on all functions in schema extensions to service_role;
