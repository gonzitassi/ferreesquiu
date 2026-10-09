(function(){
  const URL='https://krxbuakxmchcvsqlwknl.supabase.co';
  const KEY='sb_publishable_qBLFMqp3BWz24raauoKlQQ_qJkzIUg0';
  const SESSION='esquiu.supabase.session';
  const API=URL+'/functions/v1/esquiu-api';
  const CUSTOMER_REDIRECT='https://gonzitassi.github.io/ferreesquiu/web/';
  const read=()=>{try{return JSON.parse(localStorage.getItem(SESSION)||'null')}catch{return null}};
  const save=value=>localStorage.setItem(SESSION,JSON.stringify(value));
  const auth=async(path,payload,method='POST')=>{const response=await fetch(URL+'/auth/v1/'+path,{method,headers:{apikey:KEY,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.msg||data.message||data.error_description||'No se pudo completar el acceso. Revisá los datos e intentá de nuevo.');return data};
  async function session(){let s=read();if(!s)return null;if(s.expires_at*1000<Date.now()+60000){try{s=await auth('token?grant_type=refresh_token',{refresh_token:s.refresh_token});s.expires_at=Math.floor(Date.now()/1000)+s.expires_in;save(s)}catch{localStorage.removeItem(SESSION);return null}}return s}
  async function request(path,options={}){const headers=new Headers(options.headers||{});headers.set('apikey',KEY);const s=await session();if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+(s?.access_token||KEY));return fetch(API+path,{...options,headers})}
  async function parseAuthCallback(){const raw=location.hash.slice(1);if(!raw.includes('access_token=')||!raw.includes('refresh_token='))return;const p=new URLSearchParams(raw);const s={access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),token_type:p.get('token_type')||'bearer',expires_in:Number(p.get('expires_in')||3600),expires_at:Math.floor(Date.now()/1000)+Number(p.get('expires_in')||3600)};save(s);const recovery=p.get('type')==='recovery';if(recovery)sessionStorage.setItem('esquiu.password-recovery','1');history.replaceState({},document.title,location.pathname+location.search+'#/cuenta'+(recovery?'?recovery=1':''))}
  parseAuthCallback();
  window.EsquiuApi={
    fetch:request,
    async getSession(){return session()},
    async getUser(){const s=await session();if(!s)return null;return auth('user',null,'GET').catch(()=>null)},
    async signIn(email,password){const s=await auth('token?grant_type=password',{email,password});s.expires_at=Math.floor(Date.now()/1000)+s.expires_in;save(s);return s},
    async signUp(email,password){return auth('signup',{email,password,options:{emailRedirectTo:CUSTOMER_REDIRECT}})},
    async sendPasswordRecovery(email){return auth('recover',{email,gotrue_meta_security:{},redirect_to:CUSTOMER_REDIRECT})},
    async updatePassword(password){const s=await session();if(!s)throw Error('La sesión venció. Volvé a ingresar desde el enlace de recuperación.');return auth('user',{password},'PUT')},
    async signOut(){const s=read();try{if(s)await fetch(URL+'/auth/v1/logout',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+s.access_token}})}finally{localStorage.removeItem(SESSION);sessionStorage.removeItem('esquiu.password-recovery')}}
  };
})();
