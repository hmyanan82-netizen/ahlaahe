/* Supabase-backed Firebase Auth drop-in replacement */
const SB_URL="https://cygtsszoelniltxhrtqv.supabase.co";
const SB_KEY="sb_publishable_ngHlzlzwsIeOugytI8ebSQ_fjgNAmKT";
const HDR={"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":"return=representation"};

async function sbq(path,opts={}){const u=SB_URL+"/rest/v1/"+path;try{console.log("[SB-AUTH] fetch:",u);const r=await fetch(u,{headers:HDR,...opts});console.log("[SB-AUTH] status:",r.status,r.statusText);if(!r.ok){const t=await r.text().catch(()=>"");console.warn("[SB-AUTH] err body:",t);return null;}const ct=r.headers.get("content-type")||"";const data=ct.includes("json")?await r.json():null;console.log("[SB-AUTH] data:",JSON.stringify(data));return data;}catch(e){console.error("[SB-AUTH] fetch error:",e);return null;}}

function mkUser(row){
  if(!row)return null;
  return{uid:row.id,email:row.email,displayName:row.email,emailVerified:true,isAnonymous:false,metadata:{creationTime:row.created_at,lastSignInTime:new Date().toISOString()},providerData:[{providerId:"password",uid:row.email,displayName:row.email,email:row.email}],providerId:"firebase",refreshToken:"sb-token-"+row.id,tenantId:null,delete:async()=>{},getIdToken:async()=>"sb-id-token-"+row.id,getIdTokenResult:async()=>({token:"sb-id-token-"+row.id,claims:{role:row.role||"viewer",email:row.email,sub:row.id},expirationTime:new Date(Date.now()+3600000).toISOString(),issuedAtTime:new Date().toISOString(),signInProvider:"password",signInSecondFactor:null}),reload:async()=>{},toJSON:()=>({uid:row.id,email:row.email})};
}

const _authInstances=new Map();
const _stateListeners=new Map();
let _slc=0;

class AuthImpl{
  constructor(app){this.app=app;this.currentUser=null;this._ready=false;this._readyR=null;this._readyP=new Promise(r=>{this._readyR=r;});this.config={apiKey:"sb-key"};this.name=app?.name||"[DEFAULT]";this.settings={appVerificationDisabledForTesting:false};this.languageCode=null;this.tenantId=null;this.emulatorConfig=null;}
  async authStateReady(){if(this._ready)return;return this._readyP;}
  onAuthStateChanged(cb){const id=++_slc;_stateListeners.set(id,cb);cb(this.currentUser);return()=>{_stateListeners.delete(id);};}
  async updateCurrentUser(u){this.currentUser=u;_stateListeners.forEach(cb=>{try{cb(u);}catch{}});}
  async signOut(){this.currentUser=null;try{sessionStorage.removeItem("sb_auth_user");}catch{}_stateListeners.forEach(cb=>{try{cb(null);}catch{}});}
  _notifyListeners(){_stateListeners.forEach(cb=>{try{cb(this.currentUser);}catch{}});}
  _setReady(){this._ready=true;if(this._readyR)this._readyR();}
}

function Eo(app){
  const key=app?.name||"[DEFAULT]";
  if(_authInstances.has(key))return _authInstances.get(key);
  const auth=new AuthImpl(app);
  _authInstances.set(key,auth);
  const stored=typeof sessionStorage!=="undefined"?sessionStorage.getItem("sb_auth_user"):null;
  if(stored){try{const d=JSON.parse(stored);auth.currentUser=mkUser(d);auth._setReady();}catch{auth._setReady();}}else{auth._setReady();}
  return auth;
}

async function Va(auth,email,password){
  console.log("[SB-AUTH] signIn called with:",email);
  const em=email.trim().toLowerCase();
  const rows=await sbq("dashboard_accounts?email=eq."+encodeURIComponent(em)+"&select=*");
  console.log("[SB-AUTH] query result:",rows);
  if(!rows||!rows.length){console.error("[SB-AUTH] user not found for:",em);throw{code:"auth/user-not-found",message:"No account found with this email."};}
  const acc=rows[0];
  console.log("[SB-AUTH] found account, comparing passwords. DB:",JSON.stringify(acc.password),"Input:",JSON.stringify(password));
  if(acc.password!==password){console.error("[SB-AUTH] password mismatch");throw{code:"auth/wrong-password",message:"Invalid password."};}
  if(acc.status==="disabled"){console.error("[SB-AUTH] account disabled");throw{code:"auth/user-disabled",message:"This account has been disabled."};}
  const user=mkUser(acc);auth.currentUser=user;
  try{sessionStorage.setItem("sb_auth_user",JSON.stringify(acc));}catch{}
  auth._notifyListeners();
  await sbq("dashboard_accounts?id=eq."+encodeURIComponent(acc.id),{method:"PATCH",body:JSON.stringify({last_login_at:new Date().toISOString()})});
  console.log("[SB-AUTH] signIn success for:",em);
  return{user,operationType:"signIn"};
}

async function Fa(auth,email,password){
  const em=email.trim().toLowerCase();
  const existing=await sbq("dashboard_accounts?email=eq."+encodeURIComponent(em)+"&select=id");
  if(existing&&existing.length)throw{code:"auth/email-already-in-use",message:"Email already in use."};
  const id=crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==="x"?r:(r&0x3|0x8)).toString(16);});
  const row={id,email:em,password,role:"viewer",status:"active",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const res=await sbq("dashboard_accounts",{method:"POST",body:JSON.stringify(row)});
  if(!res)throw{code:"auth/internal-error",message:"Failed to create account."};
  const user=mkUser(res[0]||row);auth.currentUser=user;
  try{sessionStorage.setItem("sb_auth_user",JSON.stringify(res[0]||row));}catch{}
  auth._notifyListeners();
  return{user,operationType:"signIn"};
}

async function to(auth){auth.currentUser=null;try{sessionStorage.removeItem("sb_auth_user");}catch{}_stateListeners.forEach(cb=>{try{cb(null);}catch{}});}
function Qa(auth,cb){return auth.onAuthStateChanged(cb);}
async function Ra(user){return"sb-id-token-"+user.uid;}
async function Or(user){return user.getIdTokenResult();}

const _bsp={type:"SESSION"};
const _blp={type:"LOCAL"};
const _bcp={type:"NONE"};
async function Ya(auth,persistence){return;}
function ai(){}
function ii(app,deps){return Eo(app);}
async function Na(auth){throw{code:"auth/operation-not-allowed",message:"Anonymous sign-in not enabled."};}
function dt(auth,cred){return Va(auth,cred.email||"",cred.password||"");}
function Oa(auth,token){throw{code:"auth/invalid-custom-token",message:"Not supported."};}
function Wa(auth,email,link){throw{code:"auth/operation-not-allowed",message:"Not supported."};}
async function Mr(user){}
async function ro(user){}
async function ja(user,email){}
async function Ba(user,password){}
async function Ka(user,profile){}
function Za(auth){}
function $a(userCredential){return null;}
function Di(auth,code){return{};}
function Da(auth,code,np){}
function Ma(auth,code){}
function La(auth,email){}
function qa(user){}
function xa(auth,email){}
function Ga(auth,email){return[];}
function Ha(auth,link){return false;}
function Ja(){}
function Xa(auth,p){return{isValid:true,meetsMinPasswordLength:true,meetsMaxPasswordLength:true};}
function za(user,email){}
function Ua(auth,code){}
function Ci(user,cred){return Promise.resolve({user});}
function Ni(user,cred){return Promise.resolve({user});}
function ba(user,pid){return Promise.resolve(user);}
function no(auth,token){}
function eo(auth,user){}
function qi(auth,cb){return()=>{};}
function Gi(auth,cb){return Qa(auth,cb);}
function Sa(link){return null;}
function uo(){}
function mo(){}
function _o(){}
function co(){}
function po(){}
function go(){}
function lo(){}
function fo(){}
function Io(){}
function ho(){}
function so(){}
function io(){}
function vo(){}

class oe{}
class bt extends oe{}
class ce{static PROVIDER_ID="password";static credential(e,p){return{email:e,password:p,providerId:"password"};}}
class wn{static PROVIDER_ID="facebook.com";}
class An{static PROVIDER_ID="github.com";}
class yn{static PROVIDER_ID="google.com";}
class W extends oe{}
class ka{constructor(pid){this.providerId=pid;}}
class $e extends oe{}
class Yn{static PROVIDER_ID="phone";}
class ua{static assertion(){return{};}}
class Ca{constructor(pid){this.providerId=pid;}}
class la{static assertionForEnrollment(){return{};}}
class da{}
class Pn{static PROVIDER_ID="twitter.com";}
class oo{}
class ut{static parseLink(){return null;}}

const ya={CREDENTIAL_ALREADY_IN_USE:"auth/credential-already-in-use",EMAIL_EXISTS:"auth/email-already-in-use",INVALID_EMAIL:"auth/invalid-email",USER_DELETED:"auth/user-not-found",USER_DISABLED:"auth/user-disabled",WEAK_PASSWORD:"auth/weak-password",WRONG_PASSWORD:"auth/wrong-password",TOO_MANY_ATTEMPTS_TRY_LATER:"auth/too-many-requests",INVALID_LOGIN_CREDENTIALS:"auth/invalid-credential"};
const va={PHONE:"phone",TOTP:"totp"};
const wa={LINK:"link",REAUTHENTICATE:"reauthenticate",SIGN_IN:"signIn"};
const Ea={FACEBOOK:"facebook.com",GITHUB:"github.com",GOOGLE:"google.com",PASSWORD:"password",PHONE:"phone",TWITTER:"twitter.com"};
const Ta={EMAIL_LINK:"emailLink",EMAIL_PASSWORD:"password",FACEBOOK:"facebook.com",GITHUB:"github.com",GOOGLE:"google.com",PHONE:"phone",TWITTER:"twitter.com"};
const Rt={type:"NONE"};
const ds={type:"LOCAL"};
const Aa={};const Er={};

export{ya as ActionCodeOperation,ut as ActionCodeURL,oe as AuthCredential,ya as AuthErrorCodes,bt as EmailAuthCredential,ce as EmailAuthProvider,wn as FacebookAuthProvider,va as FactorId,An as GithubAuthProvider,yn as GoogleAuthProvider,W as OAuthCredential,ka as OAuthProvider,wa as OperationType,$e as PhoneAuthCredential,Yn as PhoneAuthProvider,ua as PhoneMultiFactorGenerator,Ea as ProviderId,oo as RecaptchaVerifier,Ca as SAMLAuthProvider,Ta as SignInMethod,la as TotpMultiFactorGenerator,da as TotpSecret,Pn as TwitterAuthProvider,Ma as applyActionCode,qi as beforeAuthStateChanged,_bcp as browserCookiePersistence,_blp as browserLocalPersistence,oo as browserPopupRedirectResolver,_bsp as browserSessionPersistence,Di as checkActionCode,Da as confirmPasswordReset,ai as connectAuthEmulator,Fa as createUserWithEmailAndPassword,Aa as debugErrorMap,ro as deleteUser,Ga as fetchSignInMethodsForEmail,$a as getAdditionalUserInfo,Eo as getAuth,Ra as getIdToken,Or as getIdTokenResult,io as getMultiFactorResolver,vo as getRedirectResult,Rt as inMemoryPersistence,ds as indexedDBLocalPersistence,ii as initializeAuth,Ja as initializeRecaptchaConfig,Ha as isSignInWithEmailLink,Ci as linkWithCredential,uo as linkWithPhoneNumber,mo as linkWithPopup,_o as linkWithRedirect,so as multiFactor,Qa as onAuthStateChanged,Gi as onIdTokenChanged,Sa as parseActionCodeURL,Er as prodErrorMap,Ni as reauthenticateWithCredential,lo as reauthenticateWithPhoneNumber,fo as reauthenticateWithPopup,Io as reauthenticateWithRedirect,Mr as reload,no as revokeAccessToken,qa as sendEmailVerification,La as sendPasswordResetEmail,xa as sendSignInLinkToEmail,Ya as setPersistence,Na as signInAnonymously,dt as signInWithCredential,Oa as signInWithCustomToken,Va as signInWithEmailAndPassword,Wa as signInWithEmailLink,co as signInWithPhoneNumber,po as signInWithPopup,go as signInWithRedirect,to as signOut,ba as unlink,eo as updateCurrentUser,ja as updateEmail,Ba as updatePassword,ho as updatePhoneNumber,Ka as updateProfile,Za as useDeviceLanguage,Xa as validatePassword,za as verifyBeforeUpdateEmail,Ua as verifyPasswordResetCode};
