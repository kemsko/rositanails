import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import { ApiError, type Appointment, type Day, type Settings, assertBookable, assertCanMove, bookingSchema, initialSettings, occupy, release, settingsSchema, startTime } from './domain';
import { Firestore, type FirebaseEnv } from './firestore';
interface Env extends FirebaseEnv {
  ALLOWED_ORIGIN: string; STAFF_UIDS: string; TELEGRAM_BOT_TOKEN: string; TELEGRAM_CHAT_ID: string;
  CLOUDINARY_CLOUD_NAME: string; CLOUDINARY_API_KEY: string; CLOUDINARY_API_SECRET: string;
  API_RATE_LIMITER?: {limit(input:{key:string}): Promise<{success:boolean}>};
}
type User = {uid:string; email:string; staff:boolean};
type Photo = {id:string; appointmentId:string; uid:string; publicId:string; format:string; kind:'reference'|'result'};
type Event = {id:string; text:string; status:'pending'|'sent'; attempts:number};
const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
async function authenticate(req: Request, env: Env): Promise<User> {
  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new ApiError(401, 'Iniciá sesión para continuar.');
  try {
    const {payload} = await jwtVerify(token, jwks, {
      issuer:`https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`, audience:env.FIREBASE_PROJECT_ID, algorithms:['RS256']
    });
    if (!payload.sub || payload.sub.length > 128 || !payload.email_verified || !payload.iat || !payload.exp || payload.iat > Date.now()/1000 + 30) throw Error('Invalid token');
    return {uid:payload.sub, email:String(payload.email ?? ''), staff:(env.STAFF_UIDS ?? '').split(',').map(x=>x.trim()).filter(Boolean).includes(payload.sub)};
  } catch { throw new ApiError(401, 'Tu sesión venció. Volvé a iniciar sesión.'); }
}
function staffOnly(user: User) { if (!user.staff) throw new ApiError(403, 'Esta acción es solo para el personal.'); }
async function body(req: Request) {
  const data = await limitedBody(req, 20000);
  try { return JSON.parse(new TextDecoder().decode(data)); } catch { throw new ApiError(400, 'La solicitud no es válida.'); }
}
async function limitedBody(req: Request, maximum: number): Promise<Uint8Array> {
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const pieces: Uint8Array[] = []; let length=0;
  while (true) {
    const {done,value} = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > maximum) { await reader.cancel(); throw new ApiError(413, 'El archivo o la solicitud es demasiado grande.'); }
    pieces.push(value);
  }
  const output = new Uint8Array(length); let offset=0;
  for (const piece of pieces) { output.set(piece,offset); offset+=piece.length; }
  return output;
}
const json = (value: unknown, status=200) => Response.json(value, {status});
function checkAccess(appointment: Appointment | null, user:User): asserts appointment is Appointment {
  if (!appointment || (!user.staff && appointment.uid !== user.uid)) throw new ApiError(404, 'No encontramos esa cita.');
}
const eventFor = (db:Firestore, appointment:Appointment, action:string) => {
  const id = crypto.randomUUID();
  const event:Event = {id, status:'pending', attempts:0, text:`${action} · Rosita\n${appointment.name}\n${appointment.serviceName}\n${appointment.date} · ${appointment.slot}\n${appointment.phone}\nCita: ${appointment.id}`};
  return db.write(`events/${id}`, event);
};
async function route(req:Request, env:Env): Promise<Response> {
  const url = new URL(req.url); const path = url.pathname.replace(/\/$/,'') || '/';
  const db = new Firestore(env);
  if (path === '/health' && req.method === 'GET') return json({ok:true, service:'rosita-api'});
  if (path === '/settings' && req.method === 'GET') return json(await db.get<Settings>('settings/public') ?? initialSettings);
  if (path === '/availability' && req.method === 'GET') {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(url.searchParams.get('date'));
    startTime(date,'12:00');
    const [settings, day] = await Promise.all([db.get<Settings>('settings/public'), db.get<Day>(`days/${date}`)]);
    const config = settings ?? initialSettings;
    const duration = config.services.find(x=>x.id===url.searchParams.get('serviceId'))?.duration ?? 60;
    const slots = config.slots.map(slot => {
      try { assertBookable(config,{date,slot},Date.now()); occupy(day ?? {appointments:{}},slot,'availability',duration); return {slot,available:true}; }
      catch { return {slot,available:false}; }
    });
    return json({slots});
  }
  const user = await authenticate(req,env);
  if (path === '/me' && req.method === 'GET') return json(user);
  if (path === '/settings' && req.method === 'PUT') {
    staffOnly(user); const settings = settingsSchema.parse(await body(req));
    await db.put('settings/public',settings); return json(settings);
  }
  if (path === '/appointments' && req.method === 'GET') {
    const rows = await db.query<Appointment>('appointments', user.staff ? undefined : 'uid', user.staff ? undefined : user.uid, 200);
    return json(rows.sort((a,b) => `${b.date}${b.slot}`.localeCompare(`${a.date}${a.slot}`)));
  }
  if (path === '/appointments' && req.method === 'POST') {
    const input = bookingSchema.parse(await body(req));
    const id = crypto.randomUUID(); const now = Date.now();
    const result = await db.transact(async tx => {
      const [settings, day, active] = await Promise.all([
        db.get<Settings>('settings/public',tx), db.get<Day>(`days/${input.date}`,tx), db.get<{ids:string[]}>(`active/${user.uid}`,tx)
      ]);
      const config = settings ?? initialSettings; assertBookable(config,input,now);
      const service = config.services.find(s => s.id===input.serviceId && s.active);
      if (!service) throw new ApiError(400,'Elegí un servicio disponible.');
      if ((active?.ids.length ?? 0) >= 3) throw new ApiError(409,'Podés tener hasta tres citas pendientes o confirmadas.');
      const updatedDay = occupy(day ?? {appointments:{}},input.slot,id,service.duration);
      const appointment:Appointment = {...input,id,uid:user.uid,email:user.email,serviceName:service.name,price:service.price,duration:service.duration,status:'pending',changes:0,createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString()};
      return {result:appointment,writes:[db.write(`appointments/${id}`,appointment),db.write(`days/${input.date}`,updatedDay),db.write(`active/${user.uid}`,{ids:[...(active?.ids ?? []),id]}),eventFor(db,appointment,'Nueva solicitud')]};
    });
    return json(result,201);
  }
  const match = path.match(/^\/appointments\/([\w-]{1,128})(?:\/(move|status|photos))?$/);
  if (match) {
    const [,id,action] = match;
    const appointment = await db.get<Appointment>(`appointments/${id}`); checkAccess(appointment,user);
    if (!action && req.method==='GET') return json(appointment);
    if (action==='move' && req.method==='POST') {
      const change = z.object({date:bookingSchema.shape.date,slot:bookingSchema.shape.slot}).parse(await body(req));
      const result = await db.transact(async tx => {
        const [current,config] = await Promise.all([db.get<Appointment>(`appointments/${id}`,tx),db.get<Settings>('settings/public',tx)]);
        checkAccess(current,user); assertCanMove(current,user.uid,Date.now());
        assertBookable(config ?? initialSettings,change,Date.now());
        if (startTime(change.date,change.slot) - Date.now() < 24*3600000) throw new ApiError(409,'El nuevo horario también debe tener 24 horas de anticipación.');
        if (current.date===change.date && current.slot===change.slot) throw new ApiError(400,'Elegí un horario diferente.');
        const oldDay = await db.get<Day>(`days/${current.date}`,tx) ?? {appointments:{}};
        const target = change.date===current.date ? oldDay : await db.get<Day>(`days/${change.date}`,tx) ?? {appointments:{}};
        const next:Appointment = {...current,...change,changes:current.changes+1,status:'pending',updatedAt:new Date().toISOString()};
        const newDay = occupy(change.date===current.date ? release(target,id) : target,change.slot,id,current.duration);
        return {result:next,writes:[db.write(`appointments/${id}`,next),db.write(`days/${change.date}`,newDay),...(change.date===current.date ? [] : [db.write(`days/${current.date}`,release(oldDay,id))]),eventFor(db,next,'Cambio de cita · requiere confirmación')]};
      });
      return json(result);
    }
    if (action==='status' && req.method==='POST') {
      staffOnly(user); const {status} = z.object({status:z.enum(['confirmed','completed','cancelled'])}).parse(await body(req));
      const result = await db.transact(async tx => {
        const current = await db.get<Appointment>(`appointments/${id}`,tx); checkAccess(current,user);
        if (!['pending','confirmed'].includes(current.status)) throw new ApiError(409,'La cita ya está cerrada.');
        if (status==='completed' && current.status!=='confirmed') throw new ApiError(409,'Primero confirmá la cita.');
        if (status==='confirmed' && startTime(current.date,current.slot)<=Date.now()) throw new ApiError(409,'No se puede confirmar una cita pasada.');
        const day = await db.get<Day>(`days/${current.date}`,tx) ?? {appointments:{}};
        const active = await db.get<{ids:string[]}>(`active/${current.uid}`,tx) ?? {ids:[]};
        const next = {...current,status,updatedAt:new Date().toISOString()};
        return {result:next,writes:[db.write(`appointments/${id}`,next),...(status==='confirmed' ? [] : [db.write(`active/${current.uid}`,{ids:active.ids.filter(x=>x!==id)})]),...(status==='cancelled' ? [db.write(`days/${current.date}`,release(day,id))] : []),eventFor(db,next,`Cita ${status==='confirmed'?'confirmada':status==='completed'?'finalizada':'cancelada'}`)]};
      });
      return json(result);
    }
    if (action==='photos' && req.method==='GET') return json(await db.query<Photo>('photos','appointmentId',id,20));
    if (action==='photos' && req.method==='POST') {
      if (!env.CLOUDINARY_API_SECRET || !env.CLOUDINARY_CLOUD_NAME) throw new ApiError(503,'Todavía falta conectar las fotografías.');
      if (!user.staff && ['cancelled','completed'].includes(appointment.status)) throw new ApiError(409,'Esta cita ya no admite nuevas referencias.');
      const existing = await db.query<Photo>('photos','appointmentId',id,20);
      if (existing.length>=8) throw new ApiError(409,'Esta cita ya tiene ocho fotografías.');
      const buffer = await limitedBody(req,6*1024*1024);
      const form = await new Response(buffer,{headers:{'Content-Type':req.headers.get('Content-Type') ?? ''}}).formData();
      const file = form.get('file');
      if (!(file instanceof File) || file.size>5*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new ApiError(400,'Usá una imagen JPG, PNG o WebP de hasta 5 MB.');
      const kind = form.get('kind')==='result' ? 'result' : 'reference';
      if (kind==='result') staffOnly(user);
      const photoId=crypto.randomUUID(); const publicId=`rosita/${appointment.uid}/${photoId}`;
      const params = {public_id:publicId,timestamp:String(Math.floor(Date.now()/1000)),type:'authenticated',overwrite:'false'};
      const upload = new FormData(); upload.set('file',file); upload.set('api_key',env.CLOUDINARY_API_KEY);
      for (const [k,v] of Object.entries(params)) upload.set(k,v);
      upload.set('signature',await signature(params,env.CLOUDINARY_API_SECRET));
      const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,{method:'POST',body:upload});
      const data:any = await response.json();
      if (!response.ok || !data.public_id) throw new ApiError(502,'No pudimos guardar la fotografía.');
      const photo:Photo={id:photoId,uid:appointment.uid,appointmentId:id,publicId:data.public_id,format:data.format,kind};
      await db.put(`photos/${photoId}`,photo); return json(photo,201);
    }
  }
  const photoMatch = path.match(/^\/photos\/([\w-]{1,128})$/);
  if (photoMatch && req.method==='GET') {
    const photo = await db.get<Photo>(`photos/${photoMatch[1]}`);
    if (!photo || (!user.staff && photo.uid!==user.uid)) throw new ApiError(404,'No encontramos esa fotografía.');
    const params={public_id:photo.publicId,format:photo.format,type:'authenticated',expires_at:String(Math.floor(Date.now()/1000)+60),timestamp:String(Math.floor(Date.now()/1000))};
    const query = new URLSearchParams({...params,api_key:env.CLOUDINARY_API_KEY,signature:await signature(params,env.CLOUDINARY_API_SECRET)});
    const response=await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/download?${query}`);
    if (!response.ok) throw new ApiError(502,'No pudimos abrir la fotografía.');
    return new Response(response.body,{headers:{'Content-Type':response.headers.get('Content-Type') ?? 'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  throw new ApiError(404,'No encontramos esa opción.');
}
export async function signature(params:Record<string,string>, secret:string) {
  const text=Object.entries(params).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('&')+secret;
  const digest=await crypto.subtle.digest('SHA-1',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
async function telegram(env:Env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const db = new Firestore(env); const events=await db.query<Event>('events','status','pending',10);
  for (const event of events) {
    if (event.attempts>=5) continue;
    // Claim by transaction; competing cron invocations cannot send the same event together.
    const claim = await db.transact(async tx => {
      const latest=await db.get<Event & {leaseUntil?:number}>(`events/${event.id}`,tx);
      if (!latest || latest.status!=='pending' || (latest.leaseUntil ?? 0)>Date.now()) return {writes:[],result:false};
      return {writes:[db.write(`events/${event.id}`,{...latest,attempts:latest.attempts+1,leaseUntil:Date.now()+600000})],result:true};
    });
    if (!claim) continue;
    const response=await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text:event.text})
    });
    const sent:any=await response.json();
    if (response.ok && sent.ok) await db.put(`events/${event.id}`,{...event,status:'sent',attempts:event.attempts+1});
  }
}
export default {
  async fetch(req:Request, env:Env) {
    const origin=req.headers.get('Origin');
    const allowed=(env.ALLOWED_ORIGIN ?? '').split(',').map(x=>x.trim()).filter(Boolean);
    if (origin && !allowed.includes(origin)) return json({error:'Origen no permitido.'},403);
    const headers:Record<string,string>={'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PUT, OPTIONS','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
    if (origin) headers['Access-Control-Allow-Origin']=origin;
    if (req.method==='OPTIONS') return new Response(null,{status:204,headers});
    let response:Response;
    try {
      if (env.API_RATE_LIMITER && !(await env.API_RATE_LIMITER.limit({key:req.headers.get('CF-Connecting-IP') ?? 'unknown'})).success) throw new ApiError(429,'Demasiados intentos. Esperá un momento.');
      response=await route(req,env);
    } catch(error) {
      response=error instanceof ApiError ? json({error:error.message},error.status) : error instanceof z.ZodError ? json({error:error.issues[0]?.message ?? 'Revisá los datos.'},400) : json({error:'No pudimos completar la solicitud. Intentá de nuevo.'},500);
    }
    for (const [k,v] of Object.entries(headers)) response.headers.set(k,v);
    return response;
  },
  async scheduled(_event:unknown,env:Env) { await telegram(env); }
};
