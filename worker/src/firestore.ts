import { importPKCS8, SignJWT } from 'jose';
import { ApiError } from './domain';
export interface FirebaseEnv {
  FIREBASE_PROJECT_ID: string; FIREBASE_CLIENT_EMAIL: string; FIREBASE_PRIVATE_KEY: string;
}
type Field = { nullValue?: null; stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; arrayValue?: {values?: Field[]}; mapValue?: {fields?: Record<string, Field>} };
export const encode = (value: unknown): Field => {
  if (value == null) return {nullValue: null};
  if (typeof value === 'string') return {stringValue: value};
  if (typeof value === 'boolean') return {booleanValue: value};
  if (typeof value === 'number') return Number.isInteger(value) ? {integerValue: String(value)} : {doubleValue: value};
  if (Array.isArray(value)) return {arrayValue: {values: value.map(encode)}};
  return {mapValue: {fields: Object.fromEntries(Object.entries(value as object).map(([k,v]) => [k, encode(v)]))}};
};
export const decode = (value: Field): any => {
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('arrayValue' in value) return (value.arrayValue?.values ?? []).map(decode);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue?.fields ?? {}).map(([k,v]) => [k,decode(v)]));
  return null;
};
let cached: {email: string; key: string; token: string; expires: number} | undefined;
async function accessToken(env: FirebaseEnv) {
  if (cached && cached.email === env.FIREBASE_CLIENT_EMAIL && cached.key === env.FIREBASE_PRIVATE_KEY && cached.expires > Date.now()) return cached.token;
  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) throw new ApiError(503, 'Falta conectar la base de datos.');
  const key = await importPKCS8(env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), 'RS256');
  const assertion = await new SignJWT({scope: 'https://www.googleapis.com/auth/datastore'})
    .setProtectedHeader({alg:'RS256'}).setIssuer(env.FIREBASE_CLIENT_EMAIL)
    .setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('1h').sign(key);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion})
  });
  const data = await response.json() as {access_token?: string};
  if (!response.ok || !data.access_token) throw new ApiError(503, 'No se pudo conectar la base de datos.');
  cached = {email: env.FIREBASE_CLIENT_EMAIL, key: env.FIREBASE_PRIVATE_KEY, token: data.access_token, expires: Date.now()+3000000};
  return cached.token;
}
export class Firestore {
  readonly root: string;
  constructor(readonly env: FirebaseEnv) { this.root = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`; }
  async call(path: string, method = 'GET', body?: unknown): Promise<any> {
    const response = await fetch(`https://firestore.googleapis.com/v1/${this.root}${path}`, {
      method, headers: {Authorization:`Bearer ${await accessToken(this.env)}`, 'Content-Type':'application/json'},
      ...(body === undefined ? {} : {body: JSON.stringify(body)})
    });
    if (response.status === 404) return null;
    const data: any = await response.json();
    if (!response.ok) {
      if (response.status === 409 || data.error?.status === 'ABORTED') throw new ApiError(409, 'La agenda cambió; volvé a intentar.');
      throw new ApiError(503, 'La base de datos no está disponible.');
    }
    return data;
  }
  async get<T>(path: string, transaction?: string): Promise<T | null> {
    const result = await this.call(`/${path}${transaction ? `?transaction=${encodeURIComponent(transaction)}` : ''}`);
    return result ? decode({mapValue:{fields:result.fields}}) as T : null;
  }
  write(path: string, data: unknown) { return {update:{name:`${this.root}/${path}`, fields: encode(data).mapValue?.fields ?? {}}}; }
  async put(path: string, data: unknown) { await this.call(':commit','POST',{writes:[this.write(path,data)]}); }
  async query<T>(collection: string, field?: string, value?: string, limit = 100): Promise<T[]> {
    const structuredQuery = {from:[{collectionId:collection}], limit,
      ...(field ? {where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:encode(value)}}} : {})};
    const rows = await this.call(':runQuery', 'POST', {structuredQuery});
    return (rows ?? []).filter((r: any) => r.document).map((r: any) => decode({mapValue:{fields:r.document.fields}}));
  }
  async transact<T>(run: (tx: string) => Promise<{writes: any[]; result:T}>): Promise<T> {
    for (let attempt=0; attempt<4; attempt++) {
      const {transaction} = await this.call(':beginTransaction','POST', {options:{readWrite:{}}});
      try {
        const {writes,result} = await run(transaction);
        await this.call(':commit','POST',{transaction,writes});
        return result;
      } catch (error) {
        await this.call(':rollback','POST',{transaction}).catch(() => undefined);
        if (!(error instanceof ApiError) || error.status !== 409 || error.message !== 'La agenda cambió; volvé a intentar.' || attempt === 3) throw error;
      }
    }
    throw new ApiError(409, 'La agenda cambió; volvé a intentar.');
  }
}
