const FUTURE_JWT_RE=/jwt\s+issued\s+at\s+future/i;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function retryingFetch(baseFetch){
  return async(input,init)=>{
    for(let attempt=0;attempt<4;attempt++){
      const request=input instanceof Request?input.clone():input;
      const response=await baseFetch(request,init);
      if(response.ok)return response;

      let body='';
      try{body=await response.clone().text()}catch{}
      if(!FUTURE_JWT_RE.test(body)||attempt===3)return response;

      // PostgREST can briefly see a freshly issued Auth token a few ms "in the future".
      // It is transient; retry the exact request instead of surfacing a false login failure.
      await wait(550*(attempt+1));
    }
  };
}

function jwtIssuedAt(session){
  try{
    const token=session?.access_token;
    if(!token)return 0;
    const part=token.split('.')[1];
    if(!part)return 0;
    const normalized=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');
    const payload=JSON.parse(atob(normalized));
    return Number(payload?.iat||0)*1000;
  }catch{return 0}
}

function signedInDelay(session){
  const iat=jwtIssuedAt(session);
  // Always give a brand-new token a short settling window. If the device/backend clocks
  // differ slightly, extend that window using iat, capped so login never feels stuck.
  const dynamic=iat?iat+1600-Date.now():0;
  return Math.max(700,Math.min(3200,dynamic));
}

export function createClient(...args){
  if(!window.supabase?.createClient){
    throw new Error('Supabase SDK não carregado.');
  }

  const [url,key,rawOptions={}]=args;
  const originalFetch=rawOptions?.global?.fetch||window.fetch.bind(window);
  const options={
    ...rawOptions,
    global:{
      ...(rawOptions.global||{}),
      fetch:retryingFetch(originalFetch)
    }
  };

  const client=window.supabase.createClient(url,key,options);
  const originalOnAuthStateChange=client.auth.onAuthStateChange.bind(client.auth);
  let lastUserId=null;
  let authInitialized=false;

  client.auth.onAuthStateChange=(callback)=>originalOnAuthStateChange((event,session)=>{
    const userId=session?.user?.id||null;

    if(event==='INITIAL_SESSION'){
      lastUserId=userId;
      authInitialized=true;
    }

    if(event==='SIGNED_OUT'){
      lastUserId=null;
      authInitialized=true;
    }

    // Supabase can emit SIGNED_IN again when the PWA returns to focus.
    // Same user + initialized session means there is no reason to boot twice.
    if(event==='SIGNED_IN'&&authInitialized&&userId&&userId===lastUserId){
      return;
    }

    if(event==='SIGNED_IN'){
      lastUserId=userId;
      authInitialized=true;
    }

    const delay=event==='SIGNED_IN'?signedInDelay(session):0;

    // Never execute app queries inside the internal Auth callback. Besides avoiding
    // reentrancy on iOS, the delay prevents fresh-JWT clock-skew failures.
    setTimeout(()=>{
      Promise.resolve(callback(event,session)).catch(err=>console.error('JuHelo auth callback',err));
    },delay);
  });

  return client;
}
