export const UUID_RE=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export function validateRecord(table,body,allowed){
 if(!body||typeof body!=='object'||Array.isArray(body))return 'Invalid record';
 const fields=Object.keys(body);
 if(!fields.length||fields.some(k=>!allowed.includes(k)||k==='id'))return 'Unsupported fields';
 if(fields.some(k=>typeof body[k]==='string'&&body[k].length>5000))return 'Field too long';
 const nonempty={clients:['name'],properties:['title'],tasks:['title']};
 if((nonempty[table]||[]).some(k=>k in body&&(!String(body[k]??'').trim())))return 'Required name or title is empty';
 if('email'in body&&body.email!=null&&body.email!==''&&(typeof body.email!=='string'||!/^\S+@\S+\.\S+$/.test(body.email)))return 'Invalid email';
 for(const k of ['asking_price_ils','agreed_price_ils','commission_rate'])if(k in body&&body[k]!=null&&(typeof body[k]!=='number'||!Number.isFinite(body[k])||body[k]<0||(k==='commission_rate'&&body[k]>100)))return `Invalid ${k}`;
 if('assigned_agent_id'in body&&body.assigned_agent_id!=null&&!UUID_RE.test(body.assigned_agent_id))return 'Invalid assigned agent';
 if('status'in body&&typeof body.status!=='string')return 'Invalid status';
 return null;
}
export function normalizeApiError(error){
 if(error?.status&&Number.isInteger(error.status)&&error.status>=400&&error.status<500)return {status:error.status,message:error.message};
 if(['JWTExpired','JWTClaimValidationFailed','JWSSignatureVerificationFailed','JWTInvalid','JWSInvalid','JWKSNoMatchingKey','JOSEAlgNotAllowed'].includes(error?.code))return {status:401,message:'Invalid or expired authentication token'};
 if(error?.code==='22P02'||error?.code==='23514'||error?.code==='23502')return {status:400,message:'Invalid field value'};
 if(error?.code==='23503'||error?.code==='23505')return {status:409,message:'Related record missing or duplicate value'};
 return {status:500,message:'Internal server error'};
}
