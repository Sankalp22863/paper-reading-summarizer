import {test,expect} from '@playwright/test';
import {makePdf} from '../fixtures/pdf.js';
// Run against a build with the test project URL. No real account or network needed.
test.skip(!process.env.AUTH_REGRESSION,'Requires the isolated auth-test build');
const key='sb-papertrail-auth-test-auth-token';
const user={id:'11111111-1111-4111-8111-111111111111',email:'reader@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const session={user,access_token:'test-access-token',refresh_token:'test-refresh-token',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600};
test('tab focus and repeated sign-in preserve the upload form; sign-out still clears it',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let libraryReads=0;
 await page.route('https://papertrail-auth-test.supabase.co/**',route=>{
   if(route.request().url().includes('/rest/v1/libraries')){libraryReads++;return route.fulfill({json:{data:{papers:[],goals:[]}}});}
   if(route.request().url().includes('/auth/v1/user'))return route.fulfill({json:user});
   return route.fulfill({json:{}});
 });
 await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key,session});
 await page.goto('/');
 await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Add paper',exact:true}).click();
 await page.getByLabel('Annotated PDF',{exact:true}).setInputFiles({name:'paper.pdf',mimeType:'application/pdf',buffer:makePdf()});
 await expect(page.getByLabel('Paper title')).toHaveValue('Efficient Memory Systems');
 await page.getByRole('textbox',{name:'Reading notes',exact:true}).fill('Unsaved observations must survive changing windows.');
 const readsBeforeFocus=libraryReads;
 await page.evaluate(()=>{
   Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});
   window.dispatchEvent(new Event('visibilitychange'));
   Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});
   window.dispatchEvent(new Event('visibilitychange'));
 });
 // Deliver the same event that session recovery emits, also covering another tab.
 await page.evaluate(({key,session})=>{const channel=new BroadcastChannel(key);channel.postMessage({event:'SIGNED_IN',session});setTimeout(()=>channel.close(),100);},{key,session});
 await page.waitForTimeout(300);
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByLabel('Paper title')).toHaveValue('Efficient Memory Systems');
 await expect(page.getByRole('textbox',{name:'Reading notes',exact:true})).toHaveValue('Unsaved observations must survive changing windows.');
 expect(await page.getByLabel('Annotated PDF',{exact:true}).evaluate(input=>input.files[0].name)).toBe('paper.pdf');
 expect(libraryReads).toBe(readsBeforeFocus);
 // An actual identity change must still clear private UI state.
 await page.evaluate(key=>{const channel=new BroadcastChannel(key);channel.postMessage({event:'SIGNED_OUT',session:null});setTimeout(()=>channel.close(),100);},key);
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect(page.getByRole('button',{name:'Log in',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});
