import {describe,it,expect} from 'vitest';
import worker from '../worker/src/index';
const env:any={FIREBASE_PROJECT_ID:'rositanails',ALLOWED_ORIGIN:'https://rositanails.web.app'};
describe('API access boundary',()=>{
  it('rejects unauthenticated bookings',async()=>{
    const response=await worker.fetch(new Request('https://api.invalid/appointments',{method:'POST',body:'{}'}),env);
    expect(response.status).toBe(401);
  });
  it('rejects an untrusted browser origin before any database operation',async()=>{
    const response=await worker.fetch(new Request('https://api.invalid/settings',{headers:{Origin:'https://malicious.invalid'}}),env);
    expect(response.status).toBe(403);
  });
  it('supports preflight only for an allowed origin',async()=>{
    const response=await worker.fetch(new Request('https://api.invalid/appointments',{method:'OPTIONS',headers:{Origin:'https://rositanails.web.app'}}),env);
    expect(response.status).toBe(204);expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://rositanails.web.app');
  });
  it('does not accept a forged session',async()=>{
    const response=await worker.fetch(new Request('https://api.invalid/me',{headers:{Authorization:'Bearer forged'}}),env);
    expect(response.status).toBe(401);
  });
});
