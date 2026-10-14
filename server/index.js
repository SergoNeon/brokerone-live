import {validateRecord,normalizeApiError} from './api-validation.js';
import {validatePublicationInput,publicationReadiness,isManager} from './publication-validation.js';
import http from 'node:http';
import {Pool} from 'pg';
import {createRemoteJWKSet,jwtVerify} from 'jose';

const required=['DATABASE_URL','OIDC_ISSUER','OIDC_AUDIENCE','OIDC_JWKS_URL','ALLOWED_ORIGIN'];
for(const key of required)if(!process.env[key])throw Error(`Missing ${key}`);
if(!process.env.OIDC_ISSUER.startsWith("https://")||!process.env.OIDC_JWKS_URL.startsWith("https://"))throw Error("OIDC endpoints require HTTPS");
if(!process.env.ALLOWED_ORIGIN.startsWith("https://"))throw Error("Allowed origin requires HTTPS");
if(/REPLACE|example\.com/i.test(process.env.DATABASE_URL+process.env.OIDC_ISSUER+process.env.OIDC_JWKS_URL))throw Error("Placeholder configuration refused");
const origin=new URL(process.env.ALLOWED_ORIGIN).origin;
if(origin!==process.env.ALLOWED_ORIGIN)throw Error('ALLOWED_ORIGIN must be a single origin');
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:5000,statement_timeout:10000,query_timeout:12000});
const jwks=createRemoteJWKSet(new URL(process.env.OIDC_JWKS_URL));
async function verifyDatabaseIdentity(){const result=await pool.query("SELECT current_user AS role, r.rolbypassrls AS bypass, r.rolsuper AS superuser, r.rolcanlogin AS login FROM pg_roles r WHERE r.rolname=current_user");const role=result.rows[0];if(!role||role.bypass||role.superuser||!role.login||role.role==="neondb_owner")throw Error("Unsafe database runtime role: refusing API startup");const access=await pool.query("SELECT pg_has_role(current_user,'brokerone_api','member') AS permitted");if(!access.rows[0]?.permitted)throw Error("Runtime role lacks brokerone_api membership");const rls=await pool.query("SELECT count(*)::int AS secured FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY(ARRAY['offices','agents','clients','properties','deals','tasks']) AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity");if(rls.rows[0]?.secured!==6)throw Error("RLS missing on CRM tables: refusing API startup");}

const resources={clients:['id','name','phone','email','notes','assigned_agent_id'],properties:['id','title','address','asking_price_ils','status','assigned_agent_id'],deals:['id','status','agreed_price_ils','commission_rate','assigned_agent_id'],tasks:['id','title','due_at','completed','assigned_agent_id']};
function respond(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':origin,'vary':'Origin','x-content-type-options':'nosniff'});res.end(JSON.stringify(data))}
async function authenticate(req){const match=/^Bearer (\S+)$/.exec(req.headers.authorization||'');if(!match)throw Object.assign(Error('Authentication required'),{status:401});const {payload}=await jwtVerify(match[1],jwks,{issuer:process.env.OIDC_ISSUER,audience:process.env.OIDC_AUDIENCE,algorithms:['RS256']});if(!payload.sub)throw Object.assign(Error('Invalid subject'),{status:401});return payload.sub}
async function jsonBody(req){let body='';for await(const part of req){body+=part;if(body.length>100000)throw Object.assign(Error('Request too large'),{status:413})}try{return JSON.parse(body)}catch{throw Object.assign(Error('Invalid JSON'),{status:400})}}
async function handle(req,res){if(req.headers.origin&&req.headers.origin!==origin)return respond(res,403,{error:'Origin not allowed'});if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,PATCH','access-control-allow-headers':'authorization,content-type','vary':'Origin'});return res.end()}
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/health'&&req.method==='GET')return respond(res,200,{status:'ok'});
 if(url.pathname==='/public/properties'&&req.method==='GET'){const result=await pool.query("SELECT id,COALESCE(NULLIF(public_title,''),title) AS title,public_city AS city,public_rooms AS rooms,asking_price_ils AS price,public_image_url AS image,listing_type FROM properties WHERE is_published=true AND status='available' ORDER BY published_at DESC NULLS LAST LIMIT 100");return respond(res,200,{items:result.rows})}
 const subject=await authenticate(req);
 if(url.pathname==="/v1/me"&&req.method==="GET"){const db=await pool.connect();try{await db.query("BEGIN");const membership=await db.query("SELECT agent_id AS id,office_id,agent_role AS role FROM public.crm_membership($1)",[subject]);if(membership.rowCount!==1)throw Object.assign(Error("No active office membership"),{status:403});await db.query("COMMIT");return respond(res,200,{user:membership.rows[0]})}catch(error){await db.query("ROLLBACK");throw error}finally{db.release()}}
 const publishRoute=/^\/v1\/properties\/([0-9a-fA-F-]{36})\/publication$/.exec(url.pathname);
 if(publishRoute){
  if(req.method!=='POST')return respond(res,405,{error:'Method not allowed'});
  const input=await jsonBody(req);
  const inputError=validatePublicationInput(input);if(inputError)return respond(res,400,{error:inputError});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const membership=await client.query('SELECT agent_id AS id,office_id,agent_role AS role FROM public.crm_membership($1)',[subject]);
   if(membership.rowCount!==1)throw Object.assign(Error('No active office membership'),{status:403});
   const actor=membership.rows[0];
   if(!isManager(actor.role))throw Object.assign(Error('Manager approval required'),{status:403});
   await client.query("SELECT set_config('app.office_id',$1,true),set_config('app.agent_id',$2,true)",[actor.office_id,actor.id]);
   const current=await client.query('SELECT id,title,public_title,public_city,public_rooms,asking_price_ils,public_image_url,listing_type,status FROM public.properties WHERE id=$1 AND office_id=$2 FOR UPDATE',[publishRoute[1],actor.office_id]);
   if(current.rowCount!==1)throw Object.assign(Error('Property not found'),{status:404});
   if(input.publish){const missing=publicationReadiness(current.rows[0]);if(missing.length)throw Object.assign(Error(`Cannot publish; missing or invalid: ${missing.join(', ')}`),{status:422})}
   const result=await client.query('UPDATE public.properties SET is_published=$1,published_at=CASE WHEN $1 THEN now() ELSE NULL END,publication_reviewed_by=$2,publication_reviewed_at=now() WHERE id=$3 AND office_id=$4 RETURNING id,is_published,published_at',[input.publish,actor.id,publishRoute[1],actor.office_id]);
   await client.query('COMMIT');return respond(res,200,{item:result.rows[0]});
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
 }
 const parts=url.pathname.split('/').filter(Boolean);if(parts[0]!=='v1'||!resources[parts[1]]||(parts.length!==2&&!(parts.length===3&&/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(parts[2]))))return respond(res,404,{error:'Not found'});const table=parts[1],allowed=resources[table];const client=await pool.connect();try{await client.query('BEGIN');const user=await client.query('SELECT agent_id AS id,office_id,agent_role AS role FROM public.crm_membership($1)',[subject]);if(user.rowCount!==1)throw Object.assign(Error('No active office membership'),{status:403});const actor=user.rows[0];await client.query("SELECT set_config('app.office_id',$1,true),set_config('app.agent_id',$2,true)",[actor.office_id,actor.id]);let output,status=200;
 if(req.method==='GET'){const result=await client.query(`SELECT ${allowed.join(',')} FROM ${table} ORDER BY id DESC LIMIT 200`);output={items:result.rows}}
 else if(req.method==='PATCH'&&parts.length===3){
  const body=await jsonBody(req);
  const validation=validateRecord(table,body,allowed);if(validation)throw Object.assign(Error(validation),{status:400});
  const fields=Object.keys(body);
  if(fields.includes('assigned_agent_id')){
   if(!body.assigned_agent_id)throw Object.assign(Error('Assigned agent is required'),{status:400});
   if(actor.role==='agent'&&body.assigned_agent_id!==actor.id)throw Object.assign(Error('Cannot reassign records'),{status:403});
   const assigned=await client.query('SELECT 1 FROM agents WHERE office_id=$1 AND id=$2 AND active=true',[actor.office_id,body.assigned_agent_id]);
   if(assigned.rowCount!==1)throw Object.assign(Error('Assigned agent must be active in this office'),{status:400});
  }
  const assignments=fields.map((field,i)=>`${field}=$${i+1}`).join(',');
  const result=await client.query(`UPDATE ${table} SET ${assignments} WHERE id=$${fields.length+1} AND office_id=$${fields.length+2} RETURNING ${allowed.join(',')}`,[...fields.map(k=>body[k]),parts[2],actor.office_id]);
  if(result.rowCount!==1)throw Object.assign(Error('Record not found or access denied'),{status:404});
  output={item:result.rows[0]};
 }
 else if(req.method==='POST'){const body=await jsonBody(req);const validation=validateRecord(table,body,allowed);if(validation)throw Object.assign(Error(validation),{status:400});const fields=Object.keys(body);if(!fields.includes('assigned_agent_id')){body.assigned_agent_id=actor.id;fields.push('assigned_agent_id')}if(body.assigned_agent_id===null||body.assigned_agent_id==='')throw Object.assign(Error('Assigned agent is required'),{status:400});if(actor.role==='agent'&&body.assigned_agent_id!==actor.id)throw Object.assign(Error('Cannot assign records to another agent'),{status:403});const assigned=await client.query('SELECT 1 FROM agents WHERE office_id=$1 AND id=$2 AND active=true',[actor.office_id,body.assigned_agent_id]);if(assigned.rowCount!==1)throw Object.assign(Error('Assigned agent must be active in this office'),{status:400});const columns=['office_id',...fields];const values=[actor.office_id,...fields.map(k=>body[k])];const placeholders=columns.map((_,i)=>`$${i+1}`).join(',');const result=await client.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) RETURNING ${allowed.join(',')}`,values);output={item:result.rows[0]};status=201}
 else throw Object.assign(Error('Method not allowed'),{status:405});await client.query('COMMIT');return respond(res,status,output)}catch(err){await client.query('ROLLBACK');throw err}finally{client.release()}}
const server=http.createServer((req,res)=>handle(req,res).catch(err=>{const {status,message}=normalizeApiError(err);if(status>=500)console.error('API error',err);respond(res,status,{error:message})}));server.requestTimeout=15000;server.headersTimeout=10000;verifyDatabaseIdentity().then(()=>server.listen(Number(process.env.PORT)||8080,process.env.HOST||'127.0.0.1',()=>console.log('BrokerOne API listening'))).catch(error=>{console.error('API startup blocked:',error.message);pool.end().finally(()=>process.exit(1))});process.on('SIGTERM',()=>server.close(()=>pool.end()));
