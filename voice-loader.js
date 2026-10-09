/* Load the recorded voice catalogue only when the child asks to hear something. */
(function(root){
'use strict';
root.VOICE_MAP=root.VOICE_MAP||{};
let pending=null;
const entry=typeof document!=='undefined'?document.currentScript:null;
const source=entry?.dataset?.voiceCatalogue;
root.ensureVoiceCatalogue=function(){
 if(root.VOICE_CATALOGUE_READY)return Promise.resolve();
 if(pending)return pending;
 if(!source)return Promise.reject(new Error('Voice catalogue URL is missing'));
 pending=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=source;script.async=true;
  const fail=()=>{script.remove();pending=null;reject(new Error('Voice catalogue could not load'))};
  script.onload=()=>{if(root.VOICE_CATALOGUE_READY)resolve();else fail()};script.onerror=fail;
  document.head.appendChild(script);
 });
 return pending;
};
})(window);
