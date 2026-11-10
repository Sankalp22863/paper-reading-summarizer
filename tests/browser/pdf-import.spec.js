import {test,expect} from '@playwright/test';
import {makePdf} from '../fixtures/pdf.js';
async function attach(page,options={}) {
 await page.getByLabel('Annotated PDF',{exact:true}).setInputFiles({name:'research.pdf',mimeType:'application/pdf',buffer:makePdf(options)});
 await expect(page.locator('.pdf-import-status')).not.toContainText('Reading PDF metadata');
}
test('extracts paper fields from a real PDF and persists its abstract',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'Add paper',exact:true}).click();
 await attach(page);
 await expect(page.getByLabel('Paper title')).toHaveValue('Efficient Memory Systems');
 await expect(page.getByLabel('Authors',{exact:true})).toHaveValue('Alice Smith, Bob Jones');
 await expect(page.getByLabel('Year',{exact:true})).toHaveValue('2024');
 await expect(page.getByLabel('Venue',{exact:true})).toHaveValue('Proceedings of ISCA 2024');
 await expect(page.getByLabel('Original paper link')).toHaveValue('https://doi.org/10.1234/memory.2024');
 await expect(page.getByLabel(/Abstract/)).toHaveValue('Memory hierarchy and data movement affect accelerator performance.');
 await page.getByRole('dialog').getByRole('button',{name:'Add paper',exact:true}).click();
 await expect(page.locator('.paper-abstract')).toContainText('Memory hierarchy and data movement');
 await page.getByRole('button',{name:'Close dialog'}).click();await page.reload();
 await page.getByRole('textbox',{name:'Search library'}).fill('Efficient Memory Systems');await page.locator('.paper-card').click();
 await expect(page.locator('.paper-abstract')).toContainText('Memory hierarchy and data movement');
 expect(errors).toEqual([]);
});
test('falls back to page text and preserves manual entries on replacement',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Add paper',exact:true}).click();
 await page.getByLabel('Paper title').fill('My custom title');
 await attach(page,{metadata:false});
 await expect(page.getByLabel('Paper title')).toHaveValue('My custom title');
 await expect(page.getByLabel('Authors',{exact:true})).toHaveValue('Alice Smith, Bob Jones');
 await page.getByLabel('Authors',{exact:true}).fill('Corrected Author');
 await attach(page,{title:'Another Research Paper',authors:'Jane Doe',metadata:false});
 await expect(page.getByLabel('Paper title')).toHaveValue('My custom title');
 await expect(page.getByLabel('Authors',{exact:true})).toHaveValue('Corrected Author');
 await attach(page,{metadata:false,scanned:true});
 await expect(page.locator('.pdf-import-status')).toContainText('scanned PDF');
 await expect(page.getByLabel('Year',{exact:true})).toHaveValue('');
 await expect(page.getByLabel('Paper title')).toHaveValue('My custom title');
});
test('closing the form or replacing a file cannot apply stale extraction results',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Add paper',exact:true}).click();
 await page.getByLabel('Annotated PDF',{exact:true}).setInputFiles({name:'first.pdf',mimeType:'application/pdf',buffer:makePdf({title:'First Paper Title'})});
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:'Add paper',exact:true}).click();
 await attach(page,{title:'Second Paper Title'});
 await expect(page.getByLabel('Paper title')).toHaveValue('Second Paper Title');
});
