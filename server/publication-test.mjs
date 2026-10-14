import assert from 'node:assert/strict';
import {validatePublicationInput,publicationReadiness,isManager} from './publication-validation.js';
assert.equal(validatePublicationInput({publish:true}),null);
for(const input of [{publish:'true'},{publish:true,office_id:'x'},[],null,{}])assert.ok(validatePublicationInput(input));
assert.equal(isManager('manager'),true);assert.equal(isManager('owner'),true);assert.equal(isManager('agent'),false);assert.equal(isManager('admin'),false);
const ready={status:'available',title:'Apartment',public_city:'Tel Aviv',public_rooms:3,asking_price_ils:2100000,listing_type:'sale',public_image_url:'https://example.com/photo.jpg'};
assert.deepEqual(publicationReadiness(ready),[]);
for(const [key,value] of [['status','sold'],['title',''],['public_city',''],['public_rooms',0],['asking_price_ils',null],['listing_type','other'],['public_image_url','http://example.com/photo.jpg']])assert.ok(publicationReadiness({...ready,[key]:value}).length,key);
console.log('PASS publication validation and manager permissions');
