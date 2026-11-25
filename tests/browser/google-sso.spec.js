import {test,expect} from '@playwright/test';
// Runs against the auth-test build (AUTH_REGRESSION=1, VITE_SUPABASE_URL=https://papertrail-auth-test.supabase.co).
test.skip(!process.env.AUTH_REGRESSION,'Requires the isolated auth-test build');
const base='https://papertrail-auth-test.supabase.co';
async function fake(page,{google}){
 const authorize=[];
 await page.route(base+'/**',route=>{
  const url=route.request().url();
  if(url.includes('/auth/v1/settings'))return route.fulfill({json:{external:{google,email:false}}});
  if(url.includes('/auth/v1/authorize')){authorize.push(url);return route.fulfill({status:200,contentType:'text/html',body:'<h1>Google consent (fake)</h1>'});}
  return route.fulfill({json:{}});
 });
 return authorize;
}
test('Continue with Google starts Supabase OAuth and returns to this page',async({page})=>{
 const authorize=await fake(page,{google:true});
 await page.goto('/');await page.getByRole('button',{name:'Log in',exact:true}).click();
 await expect(page.getByLabel('Email')).toHaveCount(0);await expect(page.getByLabel('Password')).toHaveCount(0);
 await page.getByRole('button',{name:'Continue with Google'}).click();
 await expect(page.getByRole('heading',{name:'Google consent (fake)'})).toBeVisible();
 const url=new URL(authorize[0]);
 expect(url.searchParams.get('provider')).toBe('google');
 expect(url.searchParams.get('redirect_to')).toBe('http://127.0.0.1:4173/');
});
test('a project without the Google provider explains how to enable it',async({page})=>{
 await fake(page,{google:false});
 await page.goto('/');await page.getByRole('button',{name:'Log in',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Google sign-in is not enabled');
 await expect(page.getByRole('button',{name:'Continue with Google'})).toBeDisabled();
});
test('a cancelled Google sign-in shows a readable error and cleans the URL',async({page})=>{
 await fake(page,{google:true});
 await page.goto('/#error=access_denied&error_code=403&error_description=The+user+denied+access');
 await expect(page.getByRole('alert')).toContainText('The user denied access');
 expect(new URL(page.url()).hash).toBe('');
});
