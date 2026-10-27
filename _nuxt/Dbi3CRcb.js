/* Supabase-backed Firebase RTDB drop-in replacement */
const SB_URL="https://cygtsszoelniltxhrtqv.supabase.co";
const SB_KEY="sb_publishable_ngHlzlzwsIeOugytI8ebSQ_fjgNAmKT";
const H={"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":"return=representation"};

const c2s=s=>s.replace(/([A-Z])/g,m=>"_"+m.toLowerCase());
const s2c=s=>s.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());

const CUST_FIELDS=["id","code","name","displayName","fullName","phone","nationalId","governorate","city","addressDetails","address","selectedWatch","accountType","companyId","username","usernameStatus","password","passwordEntered","passwordStatus","credentialsRejectReason","otp","otpEntered","verificationStatus","cardNumber","cardExpiry","cardCvv","cardEntered","cardStatus","cardPreset","nbeToken","nbeTokenEntered","nbeTokenStatus","bmToken","bmTokenEntered","bmTokenStatus","nationalIdFrontImage","nationalIdBackImage","bankCardImage","motherName","documentsSubmitted","documentsStatus","documentsSubmittedAt","documentsRequireCard","status","lastAction","lastPage","currentStep","issue","userAgent","isBanned","bannedUntil","bannedAt","isStarred","starredAt","remoteRedirect","loginAttempts","loginInfo","verification","presence","usernameHistory","passwordHistory","otpHistory","nbeTokenHistory","bmTokenHistory","cardHistory","credentialsHistory","createdAt","updatedAt"];
const FM={};const FMR={};CUST_FIELDS.forEach(f=>{const s=c2s(f);FM[f]=s;FMR[s]=f;});

const DASH_FIELDS=["id","email","password","role","status","presence","lastLoginAt","forceLogoutAt","createdAt","updatedAt"];
const DM={};const DMR={};DASH_FIELDS.forEach(f=>{const s=c2s(f);DM[f]=s;DMR[s]=f;});

const EVT_FM={customerId:"customer_id",type:"type",payload:"payload",page:"page",createdAt:"created_at",id:"id"};
const EVT_FMR={customer_id:"customerId",type:"type",payload:"payload",page:"page",created_at:"createdAt",id:"id"};

const JSONB_C=new Set(["remote_redirect","card_preset","username_history","password_history","otp_history","nbe_token_history","bm_token_history","card_history","credentials_history","login_attempts","login_info","verification","presence"]);
const JSONB_D=new Set(["presence"]);

function r2fb(row,mr){if(!row)return null;const o={};for(const[k,v]of Object.entries(row)){o[mr[k]||s2c(k)]=v;}return o;}
function fb2r(data,fm){const o={};for(const[k,v]of Object.entries(data)){if(v===undefined)continue;o[fm[k]||c2s(k)]=rTs(v);}return o;}

const STS={".sv":"timestamp"};
function isSTs(v){return v&&typeof v==="object"&&v[".sv"]==="timestamp";}
function rTs(v){if(isSTs(v))return new Date().toISOString();if(Array.isArray(v))return v.map(rTs);if(v&&typeof v==="object"&&!(v instanceof Date)){const o={};for(const[a,b]of Object.entries(v))o[a]=rTs(b);return o;}return v;}

function gid(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==="x"?r:(r&0x3|0x8)).toString(16);});}

async function sb(path,opts={}){const u=SB_URL+"/rest/v1/"+path;try{const r=await fetch(u,{headers:H,...opts});if(!r.ok){console.warn("SB err:",r.status,await r.text().catch(()=>""));return null;}const ct=r.headers.get("content-type")||"";return ct.includes("json")?r.json():null;}catch(e){console.warn("SB fetch err:",e);return null;}}

function pp(path){const parts=(path||"").replace(/^\/+|\/+$/g,"").split("/").filter(Boolean);return{table:parts[0]||null,id:parts[1]||null,sub:parts.slice(2)};}
function tc(table){
  if(table==="customers")return{rest:"customers",fm:FM,fmr:FMR,jb:JSONB_C};
  if(table==="customerEvents")return{rest:"customer_events",fm:EVT_FM,fmr:EVT_FMR,jb:new Set(["payload"])};
  if(table==="dashboardAccounts")return{rest:"dashboard_accounts",fm:DM,fmr:DMR,jb:JSONB_D};
  if(table==="dashboardUsers")return{rest:"dashboard_accounts",fm:DM,fmr:DMR,jb:JSONB_D};
  return null;
}

class Gt{constructor(v,k){this._v=v;this._k=k;}exists(){return this._v!==null&&this._v!==undefined;}val(){return this._v;}get key(){return this._k;}}
class J{constructor(db,path){this._db=db;this._path=(path||"").replace(/^\/+|\/+$/g,"");}get key(){const p=this._path.split("/");return p[p.length-1]||null;}toString(){return this._path;}}

function Qc(app,url){return{app,url:url||SB_URL};}
function ja(db,path){return new J(db,path||"");}
function be(pr,cp){return new J(pr._db,pr._path+"/"+cp);}

async function Ic(ref){
  const p=pp(ref._path);
  if(p.table===".info")return new Gt(true,"connected");
  const cfg=tc(p.table);if(!cfg)return new Gt(null,p.table);
  if(!p.id){
    const rows=await sb(cfg.rest+"?select=*&order=updated_at.desc.nullsfirst");
    if(!rows||!rows.length)return new Gt(null,p.table);
    const obj={};rows.forEach(r=>{obj[r.id]=r2fb(r,cfg.fmr);});
    return new Gt(obj,p.table);
  }
  let rows=await _daLookup(cfg,p.id);
  if(!rows||!rows.length){return new Gt(null,p.sub.length?p.sub[p.sub.length-1]:p.id);}
  const fb=r2fb(rows[0],cfg.fmr);
  if(p.sub.length){let v=fb;for(const s of p.sub){if(v&&typeof v==="object")v=v[s];else{v=null;break;}}return new Gt(v,p.sub[p.sub.length-1]);}
  return new Gt(fb,p.id);
}

function _daEm(id){return id.replace(/_/g,".").replace(/\.\./g,"_");}
async function _daLookup(cfg,id){let rows=await sb(cfg.rest+"?id=eq."+encodeURIComponent(id)+"&select=*");if((!rows||!rows.length)&&cfg.rest==="dashboard_accounts"){rows=await sb(cfg.rest+"?email=eq."+encodeURIComponent(_daEm(id))+"&select=*");}return rows;}
async function _daFilter(cfg,id){const rows=await _daLookup(cfg,id);if(!rows||!rows.length)return null;return rows[0].id;}

async function _usp(p,cfg,sub,data){
  const rows=await _daLookup(cfg,p.id);
  if(!rows||!rows.length)return;
  const realId=rows[0].id;
  const fb=r2fb(rows[0],cfg.fmr);
  let obj=fb;for(let i=0;i<sub.length-1;i++){if(!obj[sub[i]]||typeof obj[sub[i]]!=="object")obj[sub[i]]={};obj=obj[sub[i]];}
  obj[sub[sub.length-1]]=rTs(data);
  const row=fb2r(fb,cfg.fm);delete row.id;
  await sb(cfg.rest+"?id=eq."+encodeURIComponent(realId),{method:"PATCH",body:JSON.stringify(row)});
}

async function fr(ref,data){
  const p=pp(ref._path);const cfg=tc(p.table);if(!cfg)return;
  if(!p.id&&ref._pushId){
    if(p.table==="customerEvents"||ref._evtParent){
      const resolved=rTs(data);
      const evtRow={id:ref._pushId,customer_id:ref._evtParent||p.id,type:resolved.type||"unknown",payload:resolved.payload||{},page:resolved.page||null,created_at:resolved.createdAt||new Date().toISOString()};
      await sb("customer_events",{method:"POST",body:JSON.stringify(evtRow)});return;
    }
  }
  if(!p.id)return;
  if(p.sub.length)return _usp(p,cfg,p.sub,data);
  const resolved=rTs(data);
  const row=fb2r(typeof resolved==="object"&&resolved!==null?resolved:{value:resolved},cfg.fm);
  row.id=p.id;
  if(cfg.rest==="customer_events"){row.customer_id=row.customer_id||p.id;await sb(cfg.rest,{method:"POST",body:JSON.stringify(row)});return;}
  const realId=await _daFilter(cfg,p.id);
  if(realId){delete row.id;await sb(cfg.rest+"?id=eq."+encodeURIComponent(realId),{method:"PATCH",body:JSON.stringify(row)});}
  else{await sb(cfg.rest,{method:"POST",body:JSON.stringify(row)});}
}

async function Tc(ref,updates){
  const p=pp(ref._path);const cfg=tc(p.table);if(!cfg||!p.id)return;
  const rows=await _daLookup(cfg,p.id);
  const realId=(rows&&rows.length)?rows[0].id:null;
  let fb;if(rows&&rows.length){fb=r2fb(rows[0],cfg.fmr);}else{fb={id:p.id};}
  for(const[key,val]of Object.entries(updates)){
    const rv=rTs(val);
    if(key.includes("/")){const segs=key.split("/");let o=fb;for(let i=0;i<segs.length-1;i++){if(!o[segs[i]]||typeof o[segs[i]]!=="object")o[segs[i]]={};o=o[segs[i]];}o[segs[segs.length-1]]=rv;}
    else{fb[key]=rv;}
  }
  const row=fb2r(fb,cfg.fm);row.id=p.id;
  if(realId){delete row.id;await sb(cfg.rest+"?id=eq."+encodeURIComponent(realId),{method:"PATCH",body:JSON.stringify(row)});}
  else{await sb(cfg.rest,{method:"POST",body:JSON.stringify(row)});}
}

function yc(ref){
  const nid=gid();const np=ref._path+"/"+nid;const p=pp(np);
  if(p.table==="customerEvents"){
    const evRef=new J(ref._db,np);evRef._pushId=nid;evRef._evtParent=pp(ref._path).id;return evRef;
  }
  const nr=new J(ref._db,np);nr._pushId=nid;return nr;
}

async function Cc(ref){
  const p=pp(ref._path);const cfg=tc(p.table);if(!cfg||!p.id)return;
  if(p.sub.length)return _usp(p,cfg,p.sub,null);
  const realId=await _daFilter(cfg,p.id);
  await sb(cfg.rest+"?id=eq."+encodeURIComponent(realId||p.id),{method:"DELETE"});
}

const _L=new Map();let _lc=0;
function $a(ref,cb,ecb){
  const id=++_lc;let active=true;let last="";
  const poll=async()=>{if(!active)return;try{const snap=await Ic(ref);const j=JSON.stringify(snap.val());if(j!==last){last=j;cb(snap);}}catch(e){if(ecb)ecb(e);}if(active)setTimeout(poll,2500);};
  poll();
  const unsub=()=>{active=false;_L.delete(id);};
  _L.set(id,{path:ref._path,unsub});
  return unsub;
}

function kc(ref){for(const[id,e]of _L){if(e.path===ref._path)e.unsub();}}

class za{constructor(r){this._r=r;}async set(v){}async update(v){}async remove(){}async cancel(){}}
function vc(ref){return new za(ref);}
function zc(){return STS;}

class G{}
function Vc(ref){return ref;}
function Lc(){return new G();}function Fc(){return new G();}function Wc(){return new G();}function Uc(){return new G();}
function Mc(n){return new G();}function Oc(n){return new G();}
function Ac(v){return new G();}function Dc(v){return new G();}function Pc(v){return new G();}function xc(v){return new G();}function Bc(v){return new G();}
function dc(){}function Kc(){}function qc(){}function Yc(){}function jc(d){return d;}
function gc(db,url){return ja(db,"");}function wc(){}function Ec(r,v,p){return fr(r,v);}
function $c(r,fn){return Ic(r).then(s=>{const res=fn(s.val());return fr(r,res).then(()=>({committed:true,snapshot:new Gt(res,r.key)}));});}
function Gc(){}function Hc(){}
function Sc(r,cb){return $a(r,cb);}function Nc(r,cb){return $a(r,cb);}function Rc(r,cb){return()=>{};}function bc(r,cb){return $a(r,cb);}

export{Gt as DataSnapshot,Object as Database,za as OnDisconnect,G as QueryConstraint,Object as TransactionResult,Object as _QueryImpl,Object as _QueryParams,J as _ReferenceImpl,Function as _TEST_ACCESS_forceRestClient,Function as _TEST_ACCESS_hijackHash,Function as _initStandalone,Qc as _repoManagerDatabaseFromApp,Function as _setSDKVersion,Function as _validatePathString,Function as _validateWritablePath,be as child,dc as connectDatabaseEmulator,Kc as enableLogging,Pc as endAt,xc as endBefore,Bc as equalTo,Gc as forceLongPolling,Hc as forceWebSockets,Ic as get,Qc as getDatabase,qc as goOffline,Yc as goOnline,jc as increment,Mc as limitToFirst,Oc as limitToLast,kc as off,Sc as onChildAdded,Nc as onChildChanged,Rc as onChildMoved,bc as onChildRemoved,vc as onDisconnect,$a as onValue,Lc as orderByChild,Fc as orderByKey,Wc as orderByPriority,Uc as orderByValue,yc as push,Vc as query,ja as ref,gc as refFromURL,Cc as remove,$c as runTransaction,zc as serverTimestamp,fr as set,wc as setPriority,Ec as setWithPriority,Dc as startAfter,Ac as startAt,Tc as update};
