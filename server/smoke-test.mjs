import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const port=18081;const env={...process.env,PORT:String(port),DATABASE_URL:'postgresql://invalid:invalid@127.0.0.1:1/db',OIDC_ISSUER:'https://example.org/',OIDC_AUDIENCE:'brokerone',OIDC_JWKS_URL:'https://example.org/jwks.json',ALLOWED_ORIGIN:'https://sergoneon.github.io'};
const child=spawn(process.execPath,['index.js'],{cwd:new URL('.',import.meta.url),env,stdio:'pipe'});
try{let exited=false;child.on('exit',()=>{exited=true});for(let i=0;i<40&&!exited;i++)await delay(100);assert(exited,'API must refuse startup without a verified database role');await assert.rejects(fetch(`http://127.0.0.1:${port}/health`));console.log('PASS API refuses startup without verified database identity')}finally{child.kill('SIGTERM')}
