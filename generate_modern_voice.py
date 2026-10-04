#!/usr/bin/env python3
"""Generate new card/navigation voices; never overwrite the original voice map."""
import asyncio,hashlib,json,re,subprocess,math
from pathlib import Path
from datetime import datetime
import edge_tts
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'voice-modern-v1'; OUT.mkdir(exist_ok=True)
VOICE='zh-CN-XiaoxiaoNeural';RATE='-8%';PITCH='+0Hz'
HOME=[
'首页有故事、认一认、小游戏、老师课堂、画画音乐，还有小影院。点一张喜欢的卡片吧。',
'小挑战来啦。先选练一练，再试试更难的关卡。慢慢想，随时都能重新玩。',
'小影院里有精选科普视频。请爸爸妈妈陪你一起看，点卡片后会打开视频所在的网站。',
'今天先认识六个新朋友。听一听，找一找，认完再去玩吧。',
'科技和世界里有新的知识。人工智能、视频平台，还有国家与和平，和爸爸妈妈一起认识吧。'
]
def data():
 s=(ROOT/'recognition-data.js').read_text();m=re.search(r'root\.RECOGNITION\s*=\s*(\{.*\})\s*;\s*\}\)\(window\);',s,re.S);return json.loads(m.group(1))
def target(text):return OUT/(hashlib.sha256(text.encode()).hexdigest()[:20]+'.mp3')
async def one(text,lock):
 p=target(text)
 if p.exists() and p.stat().st_size>1000:return
 async with lock:
  for attempt in range(4):
   temp=p.with_suffix('.part.mp3')
   try:
    await edge_tts.Communicate(text,VOICE,rate=RATE,pitch=PITCH).save(str(temp))
    if temp.stat().st_size<1000:raise ValueError('empty audio')
    temp.replace(p);return
   except Exception:
    temp.unlink(missing_ok=True)
    if attempt==3:raise
    await asyncio.sleep(1.5*(attempt+1))
def verify(p):
 probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)],capture_output=True,text=True,check=True).stdout)
 duration=float(probe['format']['duration']);stream=probe['streams'][0]
 if not (1.0<duration<40 and stream['codec_name']=='mp3' and stream['channels']==1):raise ValueError('bad format '+str(p))
 r=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(p),'-af','volumedetect','-f','null','-'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True,check=True)
 peak=float(re.search(r'max_volume:\s*([+-]?[0-9.]+) dB',r.stderr).group(1));mean=float(re.search(r'mean_volume:\s*([+-]?[0-9.]+) dB',r.stderr).group(1))
 if peak>-.5:
  temp=p.with_suffix('.level.mp3');subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-af',f'volume={-2.5-peak:.2f}dB','-ar','24000','-ac','1','-b:a','48k',str(temp)],check=True);temp.replace(p);return verify(p)
 if mean < -36:raise ValueError('too quiet '+str(p))
 return {'duration':round(duration,3),'sample_rate':int(stream['sample_rate']),'channels':1,'peak_dbfs':peak,'mean_dbfs':mean,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'full_decode_passed':True}
async def main():
 d=data();categories=[c for c in d['categories'] if c.get('modern')];items=[i for c in categories for i in c['items']]
 if len(items)!=24:raise ValueError('requires 24 completed cards')
 texts=[]
 for i in items:texts += [i['text'],f"请找出，{i['word']}。"]
 texts += HOME
 if len(texts)!=53 or len(set(texts))!=53:raise ValueError('expected 53 unique clips')
 lock=asyncio.Semaphore(4);await asyncio.gather(*(one(t,lock) for t in texts))
 files={}
 for i,t in enumerate(texts,1):
  p=target(t);files[t]={'file':p.relative_to(ROOT).as_posix(),'spoken':t,**verify(p)}
  print(f'Checked {i}/53',flush=True)
 manifest={'created_at':datetime.now().astimezone().isoformat(),'source_version':d['version'],'generator':'Microsoft Edge neural TTS','voice':VOICE,'rate':RATE,'pitch':PITCH,'expressive_style':None,'text_count':53,'card_count':24,'note':'Default Xiaoxiao neural female voice, 8% slower; not a claim of teacher emotional style or human listening.','files':files}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 mapping={'zh|'+t:f['file']+'?v=1' for t,f in files.items()}
 (ROOT/'modern-voice-map.js').write_text('/* New modern cards and home navigation; original recordings remain intact. */\n(function(root){\n  root.VOICE_MAP=Object.assign(root.VOICE_MAP||{},'+json.dumps(mapping,ensure_ascii=False,indent=2)+');\n})(window);\n')
 print('53 new female clips completely decoded and mapped')
if __name__=='__main__':asyncio.run(main())
