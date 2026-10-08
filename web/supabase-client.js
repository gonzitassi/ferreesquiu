(function(){
  const URL='https://krxbuakxmchcvsqlwknl.supabase.co';
  const KEY='sb_publishable_qBLFMqp3BWz24raauoKlQQ_qJkzIUg0';
  const SESSION='esquiu.supabase.session';
  const API=URL+'/functions/v1/esquiu-api';
  const read=()=>{try{return JSON.parse(localStorage.getItem(SESSION)||'null')}catch{return null}};
  const save=value=>localStorage.setItem(SESSION,JSON.stringify(value));
  async function auth(path,payload){const response=await fetch(URL+'/auth/v1/'+path,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.msg||data.message||data.error_description||'No se pudo iniciar sesión. Revisá email y contraseña.');return data}
  async function session(){let s=read();if(!s)return null;if(s.expires_at*1000<Date.now()+60000){try{s=await auth('token?grant_type=refresh_token',{refresh_token:s.refresh_token});s.expires_at=Math.floor(Date.now()/1000)+s.expires_in;save(s)}catch{localStorage.removeItem(SESSION);return null}}return s}
  async function request(path,options={}){const headers=new Headers(options.headers||{});headers.set('apikey',KEY);const s=await session();if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+(s?.access_token||KEY));return fetch(API+path,{...options,headers})}
  window.EsquiuApi={fetch:request,async signIn(email,password){const s=await auth('token?grant_type=password',{email,password});s.expires_at=Math.floor(Date.now()/1000)+s.expires_in;save(s);return s},async signUp(email,password){const d=await auth('signup',{email,password,options:{emailRedirectTo:'https://gonzitassi.github.io/ferreesquiu/web/admin/'}});const s=d.session||d;if(s.access_token){s.expires_at=Math.floor(Date.now()/1000)+(s.expires_in||3600);save(s)}return d},async signOut(){const s=read();try{if(s)await fetch(URL+'/auth/v1/logout',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+s.access_token}})}finally{localStorage.removeItem(SESSION)}}};
})();
