import { getSqlClient } from "@/lib/db/client";

export async function initDatabase() {
  const sql = getSqlClient();
  if (!sql) {
    return { mode: "memory" as const };
  }

  const statements = [
    `create schema if not exists bronze`,
    `create schema if not exists silver`,
    `create schema if not exists gold`,
    `create table if not exists bronze.raw_records (
      id bigserial primary key,
      dataset text not null,
      source_file text not null,
      row_number integer not null,
      row_hash text not null,
      payload jsonb not null,
      is_valid boolean not null default true,
      invalid_reason text null,
      ingested_at timestamptz not null default now(),
      transformed_at timestamptz null
    )`,
    `alter table bronze.raw_records add column if not exists is_valid boolean not null default true`,
    `alter table bronze.raw_records add column if not exists invalid_reason text null`,
    `create table if not exists bronze.ingestion_runs (
      id bigserial primary key,
      dataset text not null,
      source_file text not null,
      total_rows integer not null,
      valid_rows integer not null,
      dropped_rows integer not null,
      ingested_at timestamptz not null default now()
    )`,
    `create table if not exists silver.patient (
      patient_id text primary key,
      sex text null,
      age_years integer null,
      updated_at timestamptz not null default now()
    )`,
    `create table if not exists silver.case_encounter (
      case_id integer not null,
      patient_id text not null,
      ward text null,
      admission_datetime timestamptz null,
      discharge_datetime timestamptz null,
      primary key (case_id, patient_id)
    )`,
    `create table if not exists silver.assessment_epa (
      id bigserial primary key,
      iid text null,
      sid text null,
      case_id integer null,
      patient_id text null,
      assessment_date date null,
      payload jsonb not null
    )`,
    `create table if not exists silver.lab_observation (
      id bigserial primary key,
      case_id integer null,
      patient_id text null,
      specimen_datetime timestamptz null,
      test_name text not null,
      test_value numeric null,
      flag text null,
      ref_low numeric null,
      ref_high numeric null,
      source_file text not null
    )`,
    `create table if not exists silver.med_order (
      id bigserial primary key,
      case_id integer null,
      patient_id text null,
      order_id text null,
      medication_name text null,
      route text null,
      dose text null,
      order_start_datetime timestamptz null,
      order_stop_datetime timestamptz null,
      payload jsonb not null
    )`,
    `create table if not exists silver.med_admin (
      id bigserial primary key,
      case_id integer null,
      patient_id text null,
      order_id text null,
      administration_datetime timestamptz null,
      administration_status text null,
      administered_dose text null,
      payload jsonb not null
    )`,
    `create table if not exists silver.nursing_note (
      id bigserial primary key,
      case_id integer null,
      patient_id text null,
      report_date date null,
      shift text null,
      note_text text null,
      extracted_json jsonb null,
      source_file text not null
    )`,
    `create table if not exists silver.device_hourly (
      id bigserial primary key,
      case_id integer null,
      patient_id text null,
      timestamp_utc timestamptz not null,
      movement_index numeric null,
      bed_exit_detected boolean null,
      fall_event boolean null,
      payload jsonb not null
    )`,
    `create table if not exists silver.device_1hz (
      id bigserial primary key,
      case_id integer null,
      patient_id text null,
      timestamp_utc timestamptz not null,
      accel_magnitude_g numeric null,
      bed_exit_event boolean null,
      fall_event boolean null,
      payload jsonb not null
    )`,
    `create table if not exists silver.diagnosis_icd10 (
      id bigserial primary key,
      case_id integer null,
      patient_id text null,
      code text not null,
      description text null,
      is_primary boolean not null default false
    )`,
    `create table if not exists silver.procedure_ops (
      id bigserial primary key,
      case_id integer null,
      patient_id text null,
      code text not null,
      description text null
    )`,
    `create table if not exists silver.mapping_decision (
      id bigserial primary key,
      dataset text not null,
      source_column text not null,
      target_field text not null,
      confidence numeric not null,
      rationale text not null,
      status text not null default 'suggested',
      decided_at timestamptz null
    )`,
    `create table if not exists silver.data_quality_issue (
      id bigserial primary key,
      dataset text not null,
      issue_type text not null,
      severity text not null,
      case_id integer null,
      patient_id text null,
      message text not null,
      source_file text not null,
      row_hash text null,
      created_at timestamptz not null default now()
    )`,
    `create table if not exists gold.alert_event (
      id bigserial primary key,
      alert_type text not null,
      severity text not null,
      case_id integer null,
      patient_id text null,
      title text not null,
      detail text not null,
      score numeric not null,
      created_at timestamptz not null default now()
    )`,
    `create table if not exists gold.case_timeline (
      id bigserial primary key,
      case_id integer null,
      patient_id text null,
      event_ts timestamptz not null,
      event_type text not null,
      event_value text not null,
      unit text null,
      detail text null
    )`,
    `create table if not exists gold.quality_kpis (
      id bigserial primary key,
      dataset text not null,
      completeness numeric not null,
      validity numeric not null,
      consistency numeric not null,
      issue_count integer not null,
      calculated_at timestamptz not null default now()
    )`,
    `create table if not exists gold.mapping_kpis (
      id bigserial primary key,
      dataset text not null,
      accepted_count integer not null,
      rejected_count integer not null,
      suggested_count integer not null,
      avg_confidence numeric not null,
      calculated_at timestamptz not null default now()
    )`,
    `create table if not exists gold.risk_trends (
      id bigserial primary key,
      case_id integer null,
      patient_id text null,
      ts timestamptz not null,
      risk_score numeric not null,
      risk_reason text null
    )`,
  ];

  for (const statement of statements) {
    await sql.query(statement);
  }

  return { mode: "database" as const };
}
