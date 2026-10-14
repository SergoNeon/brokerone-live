/** BrokerOne API client. Requires an authenticated OIDC access token.
 * Never stores credentials or silently falls back to localStorage.
 */
export class BrokerOneApiError extends Error {
 constructor(message,status){super(message);this.name='BrokerOneApiError';this.status=status}
}
const resources=new Set(['clients','properties','deals','tasks']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createBrokerOneClient({baseUrl='/api',getAccessToken,fetchImpl=fetch}={}){
 if(typeof getAccessToken!=='function')throw Error('A verified authentication session is required');
 const base=new URL(baseUrl,globalThis.location?.origin||'https://brokerone.invalid');
 if(base.protocol!=='https:'&&base.hostname!=='localhost'&&base.hostname!=='127.0.0.1')throw Error('CRM API requires HTTPS');
 if(globalThis.location?.protocol==='https:'&&base.protocol!=='https:')throw Error('Mixed-content API is forbidden');
 async function request(path,{method='GET',body}={}){
  const token=await getAccessToken();
  if(typeof token!=='string'||!token.trim())throw new BrokerOneApiError('Sign in before accessing office records',401);
  const headers={Authorization:`Bearer ${token.trim()}`,Accept:'application/json'};
  if(body!==undefined)headers['Content-Type']='application/json';
  let response;
  try{response=await fetchImpl(new URL(path,base.href.replace(/\/?$/,'/')),{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'omit'})}
  catch{throw new BrokerOneApiError('Server connection failed; changes were not saved',0)}
  let result;
  try{result=await response.json()}catch{throw new BrokerOneApiError('Invalid server response',response.status)}
  if(!response.ok)throw new BrokerOneApiError(typeof result?.error==='string'?result.error:'Request failed',response.status);
  return result;
 }
 function check(resource){if(!resources.has(resource))throw Error('Unsupported resource')}
 return Object.freeze({
  list(resource){check(resource);return request(`v1/${resource}`)},
  create(resource,data){check(resource);return request(`v1/${resource}`,{method:'POST',body:data})},
  update(resource,id,data){check(resource);if(!uuid.test(id))throw Error('Invalid record ID');return request(`v1/${resource}/${id}`,{method:'PATCH',body:data})},
  publish(id,publish){if(!uuid.test(id)||typeof publish!=='boolean')throw Error('Invalid publication request');return request(`v1/properties/${id}/publication`,{method:'POST',body:{publish}})}
 });
}
