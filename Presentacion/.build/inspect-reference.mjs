import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const runtime='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1116-1220-0_26.1116.1220.0_x64__3k8sg7r9htsxt/dependencies';
const {PresentationFile,FileBlob}=await import(pathToFileURL(path.join(runtime,'node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs')));
const dir=path.resolve('Presentacion/.build/referencia');
const p=await PresentationFile.importPptx(await FileBlob.load(path.join(dir,'Referencia_SUTENS.pptx')));
const r=await p.inspect({select:'$.slides[*]',include:['id','index','layout','elements.id','elements.kind','elements.text','elements.position','elements.style']});
await fs.writeFile(path.join(dir,'inspect.json'),JSON.stringify(r.records,null,2));
for(let i=0;i<p.slides.items.length;i++){
 const b=await p.export({slide:p.slides.items[i],format:'png',scale:1});await fs.writeFile(path.join(dir,`slide-${i+1}.png`),new Uint8Array(await b.arrayBuffer()));
}
console.log({count:p.slides.items.length,masters:p.masters.items.length,layouts:p.layouts.items.length});
