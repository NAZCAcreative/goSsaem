const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs");
const path = require("node:path");

async function createTestDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage; create schema extensions; create schema cron;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}',created_at timestamptz default now(),last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'anon')$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
    create table cron.job(jobid bigserial primary key,jobname text,active boolean default true);
    create table cron.job_run_details(jobid bigint,status text,start_time timestamptz,end_time timestamptz,return_message text);
    create function cron.schedule(text,text,text) returns bigint language sql as $$insert into cron.job(jobname) values($1) returning jobid$$;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    grant execute on function auth.uid(),auth.role(),auth.jwt() to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
  `);
  for (const name of fs
    .readdirSync("supabase/migrations")
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    let sql = fs.readFileSync(path.join("supabase/migrations", name), "utf8");
    // Supabase infrastructure is mocked; application SQL is executed unmodified.
    sql = sql
      .replace(/^create extension[^;]+;/gm, "")
      .replace(/^alter publication[^;]+;/gm, "");
    try {
      await db.exec(sql);
    } catch (error) {
      await db.close();
      throw new Error(`${name}: ${error.message}`, { cause: error });
    }
  }
  return db;
}
async function asUser(db, id, role = "authenticated") {
  await db.query(
    `select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)`,
    [id || "", role],
  );
}
module.exports = { createTestDb, asUser };
