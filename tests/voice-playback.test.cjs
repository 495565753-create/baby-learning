// Regression for rapid replay, navigation and duplicate media failure events.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','kid.js'),'utf8');
function extract(name){const start=src.indexOf('function '+name+'('),end=src.indexOf('\nfunction ',start+1);return src.slice(start,end<0?src.length:end);}
const pending=[],tts=[];let finished=0;
const player={src:'',pause(){},removeAttribute(){this.src=''},play(){return new Promise((resolve,reject)=>pending.push({resolve,reject}))}};
const synth={cancel(){},speak(u){tts.push(u)}};
const c={player,state:{muted:false},window:{VOICE_MAP:{'zh|a':'a.mp3','zh|b':'b.mp3'},speechSynthesis:synth},speechSynthesis:synth,SpeechSynthesisUtterance:function(text){this.text=text},console:{...console,warn(){}}};
vm.createContext(c);vm.runInContext('let voiceRun=0;'+['voiceKey','playSpoken','fallbackSpeech','speak','stopAudio','playClassroomText'].map(extract).join('\n'),c);
async function tick(){await Promise.resolve();await Promise.resolve()}
(async()=>{
 c.playSpoken('a','zh-CN',()=>finished++);const oldEnded=player.onended;
 c.speak('b');pending[0].reject(Object.assign(new Error('replaced'),{name:'AbortError'}));oldEnded();await tick();
 assert.equal(player.src,'b.mp3');assert.equal(tts.length,0);assert.equal(finished,0);
 c.speak('a');const stale=pending.at(-1);c.speak('b');stale.reject(new Error('old network failure'));await tick();
 assert.equal(player.src,'b.mp3');assert.equal(tts.length,0);
 c.stopAudio();pending.at(-1).reject(new Error('late stop failure'));await tick();assert.equal(tts.length,0);assert.equal(player.src,'');
 c.playClassroomText('a',()=>finished++);const oldClass=pending.at(-1),oldClassEnded=player.onended;
 c.playClassroomText('b',()=>finished++);oldClass.reject(new Error('old lesson failure'));oldClassEnded();await tick();
 assert.equal(player.src,'b.mp3');assert.equal(finished,0);player.onended();assert.equal(finished,1);
 c.playClassroomText('a',()=>finished++);const interrupted=pending.at(-1);c.speak('b');interrupted.reject(new Error('old lesson failure'));await tick();assert.equal(player.src,'b.mp3');assert.equal(finished,1);
 c.speak('a');pending.at(-1).reject(new Error('active network failure'));await tick();assert.equal(tts.at(-1).text,'a');
 const ttsBefore=tts.length,finishedBefore=finished;
 c.playSpoken('a','zh-CN',()=>finished++);const sameFailure=pending.at(-1),errorHandler=player.onerror;errorHandler();sameFailure.reject(new Error('same network failure'));await tick();assert.equal(tts.length,ttsBefore+1);errorHandler();assert.equal(tts.length,ttsBefore+1);tts.at(-1).onend();tts.at(-1).onend();assert.equal(finished,finishedBefore+1);
 c.playClassroomText('a',()=>finished++);const failedLesson=pending.at(-1),lessonError=player.onerror,lessonBefore=finished;lessonError();failedLesson.reject(new Error('same lesson failure'));await tick();lessonError();assert.equal(finished,lessonBefore+1);
 c.state.page='reader';c.state.readerPaused=true;c.playSpoken('a');const pausedAudio=pending.at(-1),ttsPaused=tts.length;pausedAudio.reject(Object.assign(new Error('pause'),{name:'AbortError'}));await tick();assert.equal(player.src,'a.mp3');assert.equal(tts.length,ttsPaused);
 console.log('PASS: once-only fallback/end, reader pause, rapid replay, stale errors, exit, old end callbacks, lesson switching, active fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
