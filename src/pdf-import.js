import {inferMetadata,textLines} from './pdf-metadata';

export async function extractPaperDetails(file,signal) {
  if(file.size>25*1024*1024)throw new Error('Please choose a PDF smaller than 25 MB.');
  if(!(await file.slice(0,5).text()).startsWith('%PDF-'))throw new Error('Please choose a valid PDF export.');
  const pdfjs=await import('pdfjs-dist');
  const {default:workerUrl}=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
  const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,stopAtErrors:true});
  const abort=()=>{void task.destroy().catch(()=>{});};
  signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted)abort();
  let timedOut=false;
  const timeout=setTimeout(()=>{timedOut=true;abort();},20000);
  // Never prompt for a document password or block indefinitely waiting for one.
  task.onPassword=()=>abort();
  try {
    const pdf=await task.promise;
    const metadata=await pdf.getMetadata();
    const pages=[];
    for(let n=1;n<=Math.min(pdf.numPages,2);n++) {
      const page=await pdf.getPage(n);
      pages.push(textLines((await page.getTextContent()).items));
      page.cleanup();
    }
    return inferMetadata({info:metadata.info,xmp:{title:metadata.metadata?.get('dc:title'),authors:metadata.metadata?.get('dc:creator')},pages});
  } catch(error) {
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');
    if(timedOut)throw new Error('PDF reading took too long. You can still fill in the details manually.');
    throw new Error('Could not read this PDF. It may be password-protected or damaged. You can enter its details manually.');
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort',abort);
    await task.destroy().catch(()=>{});
  }
}
