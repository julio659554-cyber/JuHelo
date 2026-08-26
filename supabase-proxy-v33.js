export function createClient(...args){
  if(!window.supabase?.createClient){
    throw new Error('Supabase SDK não carregado.');
  }

  const client=window.supabase.createClient(...args);
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

    // O Supabase pode emitir SIGNED_IN novamente quando o PWA volta ao foco.
    // O app já tem a mesma sessão, então não devemos disparar outro boot completo.
    if(event==='SIGNED_IN'&&authInitialized&&userId&&userId===lastUserId){
      return;
    }

    if(event==='SIGNED_IN'){
      lastUserId=userId;
      authInitialized=true;
    }

    // Nunca executa consultas do app dentro do callback interno do Auth.
    // Isso evita deadlock/reentrância no iOS/PWA.
    queueMicrotask(()=>{
      Promise.resolve(callback(event,session)).catch(err=>console.error('JuHelo auth callback',err));
    });
  });

  return client;
}
