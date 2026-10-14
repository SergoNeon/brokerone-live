import assert from 'node:assert/strict';
import pg from 'pg';
const url=process.env.DATABASE_URL;
if(!url) { console.error('BLOCKED: DATABASE_URL missing'); process.exit(2); }
const client=new pg.Client({connectionString:url,connectionTimeoutMillis:5000,query_timeout:10000});
try {
 await client.connect();
 const {rows:[role]}=await client.query("SELECT current_user AS role, r.rolcanlogin AS login, r.rolbypassrls AS bypass, r.rolsuper AS superuser FROM pg_roles r WHERE r.rolname=current_user");
 assert.equal(role.role,'brokerone_api');assert.equal(role.login,true);assert.equal(role.bypass,false);assert.equal(role.superuser,false);
 const {rows:tables}=await client.query("SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY(ARRAY['offices','agents','clients','properties','deals','tasks']) AND c.relkind='r'");
 assert.equal(tables.length,6);for(const t of tables){assert.equal(t.relrowsecurity,true);assert.equal(t.relforcerowsecurity,true);}
 await client.query('BEGIN READ ONLY');
 try {
  const result=await client.query('SELECT id FROM public.clients LIMIT 1');
  assert.equal(result.rowCount,0,'Unscoped client query must not expose rows');
  const properties=await client.query('SELECT id FROM public.properties LIMIT 1');
  assert.equal(properties.rowCount,0,'Unscoped property query must not expose rows');
  const otherTables=['offices','agents','deals','tasks'];
  for(const table of otherTables){const rows=await client.query(`SELECT id FROM public.${table} LIMIT 1`);assert.equal(rows.rowCount,0,`Unscoped ${table} query must not expose rows`);}
 }finally{await client.query('ROLLBACK');}
 console.log('PASS live Neon least-privilege identity, six forced-RLS tables, unscoped tenant isolation');
} catch(error){console.error('FAIL live Neon integration:',error.message);process.exitCode=1;}
finally{await client.end().catch(()=>{});}
