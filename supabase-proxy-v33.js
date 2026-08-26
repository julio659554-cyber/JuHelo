export function createClient(...args){
  if(!window.supabase?.createClient){
    throw new Error('Supabase SDK não carregado.');
  }
  return window.supabase.createClient(...args);
}
