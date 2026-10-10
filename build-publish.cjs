// Build a runtime-only deployment folder, including online entries absent from the offline manifest.
const fs=require('node:fs'),path=require('node:path');
const root=__dirname,destination=process.argv[2];
const suspensionFile=path.join(root,'PUBLISH-SUSPENDED.json');
if(fs.existsSync(suspensionFile)&&JSON.parse(fs.readFileSync(suspensionFile,'utf8')).active){
  throw new Error('网站已按用户要求停用：备案期间禁止发布可用程序。只有用户明确要求恢复后才能解除 PUBLISH-SUSPENDED.json。');
}
if(!destination)throw new Error('Usage: node build-publish.cjs /absolute/output-directory');
const out=path.resolve(destination);
if(out===root||out.startsWith(root+path.sep))throw new Error('Use an output directory outside the source tree');
const files=new Set(JSON.parse(fs.readFileSync(path.join(root,'offline/assets.json'))).files.map(f=>f.url.replace(/^\//,'')));
for(const name of ['index.html','edgeone.json','manifest.webmanifest','offline/index.html','offline/installer.js','offline/sw.js','offline/assets.json','offline/manifest.webmanifest','little-artist/index.html','downloads/index.html','downloads/guolicheng-online-v3.0.0.apk'])files.add(name);
for(const name of fs.readdirSync(path.join(root,'app-assets')))files.add('app-assets/'+name);
for(const name of files){const source=path.join(root,name);if(!fs.existsSync(source))throw new Error('Missing deployment resource: '+name);const target=path.join(out,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target)}
console.log(JSON.stringify({files:files.size,directory:out}));
