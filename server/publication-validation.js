export function validatePublicationInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.publish!=='boolean'||Object.keys(input).some(k=>k!=='publish'))return 'Expected {publish:boolean}';
 return null;
}
export function publicationReadiness(p){
 const missing=[];
 if(p.status!=='available')missing.push('status');
 if(!String(p.public_title||p.title||'').trim())missing.push('title');
 if(!String(p.public_city||'').trim())missing.push('city');
 if(p.public_rooms===null||p.public_rooms===undefined||!Number.isFinite(Number(p.public_rooms))||Number(p.public_rooms)<=0)missing.push('rooms');
 if(p.asking_price_ils===null||p.asking_price_ils===undefined||!Number.isFinite(Number(p.asking_price_ils))||Number(p.asking_price_ils)<=0)missing.push('price');
 if(!['sale','rent'].includes(p.listing_type))missing.push('listing_type');
 try{const url=new URL(p.public_image_url);if(url.protocol!=='https:'||url.username||url.password||!url.hostname.includes('.'))missing.push('image')}catch{missing.push('image')}
 return missing;
}
export function isManager(role){return ['manager','owner'].includes(role)}
