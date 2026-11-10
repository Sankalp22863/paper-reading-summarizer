import { createClient } from '@supabase/supabase-js';
import { initialData } from './data';
export const cloud = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY) : null;
const key = 'papertrail-library-v1';
export function localLoad() { const value = localStorage.getItem(key); if (!value) return initialData(); const data = JSON.parse(value); if (!Array.isArray(data.papers) || !Array.isArray(data.goals)) throw new Error('The saved library is invalid. Export a backup before making changes.'); return data; }
export async function loadLibrary(user) { if (!user) return localLoad(); const {data,error} = await cloud.from('libraries').select('data').eq('user_id',user.id).maybeSingle(); if(error) throw error; return data?.data || {papers:[], goals:[]}; }
export async function saveLibrary(data,user) { if(!user) {localStorage.setItem(key,JSON.stringify(data)); return;} const {error} = await cloud.from('libraries').upsert({user_id:user.id,data,updated_at:new Date().toISOString()}); if(error) throw error; }
async function db() { return new Promise((resolve,reject) => { const request = indexedDB.open('papertrail-files',1); request.onupgradeneeded=()=>request.result.createObjectStore('files'); request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); }); }
async function fileStore(action,id,file) { const database = await db(); return new Promise((resolve,reject) => { const tx=database.transaction('files',action==='get'?'readonly':'readwrite'); const store=tx.objectStore('files'); const request=action==='put'?store.put(file,id):action==='delete'?store.delete(id):store.get(id); tx.oncomplete=()=>{database.close();resolve(request.result);}; tx.onerror=()=>{database.close();reject(tx.error);}; }); }
export async function uploadPdf(file,user) {
  if(file.size > 25*1024*1024) throw new Error('Please choose a PDF smaller than 25 MB.');
  if(!(await file.slice(0,5).text()).startsWith('%PDF-')) throw new Error('Please choose a valid PDF export.');
  const id=crypto.randomUUID();
  if(!user) {await fileStore('put',id,file);return {id,name:file.name,local:true};}
  const path=`${user.id}/${id}.pdf`; const {error}=await cloud.storage.from('papers').upload(path,file,{contentType:'application/pdf'});if(error)throw error;return {id:path,name:file.name,local:false};
}
export async function pdfUrl(file) { if(file.local) {const blob=await fileStore('get',file.id);if(!blob)throw new Error('This PDF is not stored in this browser. Reattach the original file.');return URL.createObjectURL(blob);} const {data,error}=await cloud.storage.from('papers').createSignedUrl(file.id,120);if(error)throw error;return data.signedUrl; }
export async function removePdf(file) { if(!file)return;if(file.local)return fileStore('delete',file.id); const {error}=await cloud.storage.from('papers').remove([file.id]);if(error)throw error; }
