// Conservative, local heuristics. Every extracted field remains editable.
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const generic = /^(untitled|unknown|anonymous|document|user|author|notability|microsoft word|latex|acrobat)(\b|$)/i;
const affiliation = /@|https?:|\b(university|institute|department|laborator|school|college|research center|research centre|abstract|keywords|introduction)\b/i;

export function textLines(items) {
  const rows = [];
  for (const item of items) {
    if (!item.str?.trim() || !item.transform) continue;
    const [a,b,c,d,x,y] = item.transform;
    // Ignore rotated arXiv sidebars and superscript affiliation markers.
    if (Math.abs(b) > Math.abs(a) || Math.abs(c) > Math.abs(d)) continue;
    const size = Math.hypot(c,d) || item.height || 10;
    if (size < 6) continue;
    let row = rows.find(r => Math.abs(r.y-y) < Math.min(size, r.size)*0.35);
    if (!row) { row = {y, size, parts:[]}; rows.push(row); }
    row.size = Math.max(row.size,size);
    row.parts.push({text:item.str,x,width:item.width||0});
  }
  return rows.sort((a,b)=>b.y-a.y).flatMap(row=>{
    // Keep separate columns separate, rather than interleaving abstract/body text.
    const segments=[];
    for(const part of row.parts.sort((a,b)=>a.x-b.x)) {
      const segment=segments.at(-1), last=segment?.at(-1);
      if(!last || part.x-(last.x+last.width)>Math.max(24,row.size*2.5)) segments.push([part]);
      else segment.push(part);
    }
    return segments.map(parts=>({text:clean(parts.map(p=>p.text).join(' ')),size:row.size,y:row.y,x:parts[0].x}));
  });
}

function authorLine(text) {
  const value=clean(text.replace(/[\d*†‡§]+/g,'').replace(/\s*[,;]\s*/g,', '));
  if (!value || affiliation.test(value) || value.length>220 || /[=:©]/.test(value)) return '';
  const names=value.split(/,|\band\b|&|;/).map(clean).filter(Boolean);
  // Avoid treating affiliations, sentences or single organization names as authors.
  if (!names.length || names.some(name=>{
    const words=name.split(/\s+/);
    return words.length<2 || words.length>5 || words.some(word=>!/^\p{Lu}[\p{L}.'’\-]*$|^(?:de|van|von|der|da|del|la)$/u.test(word));
  })) return '';
  return names.join(', ');
}

export function inferMetadata({info={},xmp={},pages=[]}={}) {
  const lines=pages[0]||[];
  const text=pages.flat().map(l=>l.text).join('\n');
  const abstractIndex=lines.findIndex(l=>/^abstract\b/i.test(l.text));
  const front=lines.slice(0,abstractIndex<0?30:abstractIndex);
  const candidates=front.filter(l=>l.text.length>12 && !/^(arxiv|https?:|doi\b|proceedings|copyright|©|published|accepted|preprint)/i.test(l.text) && !affiliation.test(l.text));
  const maxSize=Math.max(0,...candidates.map(l=>l.size));
  const titleLines=candidates.filter(l=>l.size>=maxSize*.9).slice(0,4);
  const layoutTitle=clean(titleLines.map(l=>l.text).join(' '));
  const embeddedTitle=clean(xmp.title||info.Title);
  const title=embeddedTitle.length>=8 && !generic.test(embeddedTitle) && !/\.(pdf|docx?|tex)$/i.test(embeddedTitle)?embeddedTitle:layoutTitle;
  const embeddedAuthors=clean(Array.isArray(xmp.authors)?xmp.authors.join(', '):xmp.authors||info.Author);
  let authors=embeddedAuthors && !generic.test(embeddedAuthors) && !affiliation.test(embeddedAuthors)?embeddedAuthors:'';
  if (!authors && titleLines.length) {
    const start=front.indexOf(titleLines.at(-1))+1;
    const authorRows=[];
    for(const line of front.slice(start,start+8)) {
      const parsed=authorLine(line.text);
      if(parsed)authorRows.push(parsed);
      else if(authorRows.length)break;
    }
    authors=[...new Set(authorRows)].join(', ');
  }
  // Only front-matter identifiers: do not pick a DOI from a reference list.
  const frontText=text.split(/\n\s*(?:\d+\.?\s+)?(?:references|bibliography)\s*\n/i)[0];
  const doi=frontText.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i)?.[0]?.replace(/[.,;:)]+$/,'');
  const arxiv=frontText.match(/(?:arxiv\s*:\s*|arxiv\.org\/(?:abs|pdf)\/)(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+\/\d{7}(?:v\d+)?)/i)?.[1];
  const url=doi?`https://doi.org/${doi}`:arxiv?`https://arxiv.org/abs/${arxiv}`:'';
  const venueLine=front.find(l=>/\b(proceedings|conference|symposium|journal|transactions|NeurIPS|ICML|ICLR|ISCA|MICRO|ASPLOS|OSDI|PLDI|POPL|HPCA)\b/i.test(l.text)&&l.text!==title&&l.text.length<240);
  const venue=venueLine?.text||'';
  // PDF creation dates commonly reflect an export, not publication; ignore them.
  const year=venue.match(/\b(?:19|20)\d{2}\b/)?.[0] || frontText.match(/(?:©|copyright|published(?:\s+in)?|publication\s+date)\D{0,35}((?:19|20)\d{2})/i)?.[1] || frontText.match(/arxiv[^\n]{0,100}\b((?:19|20)\d{2})\b/i)?.[1] || '';
  const match=frontText.match(/(?:^|\n)abstract\s*[:.\-—–]?\s*([\s\S]*?)(?=\n\s*(?:(?:\d+[.\s]*)?introduction|keywords|index terms|ccs concepts|\d+\.?\s+[A-Z][a-z]+)\b|$)/i);
  const abstract=match?clean(match[1]).slice(0,5000):'';
  return Object.fromEntries(Object.entries({title,authors,year,venue,url,abstract}).filter(([,v])=>v));
}

export function mergeExtractedFields(current, detected, previousAuto={}, touched=new Set()) {
  const next={...current};
  for(const key of ['title','authors','year','venue','url','abstract']) {
    if(touched.has(key))continue;
    if(!current[key] || (key in previousAuto && current[key]===previousAuto[key])) next[key]=detected[key]||'';
  }
  return next;
}
