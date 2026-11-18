import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
const root=process.cwd();
const name=(await fs.readdir(path.join(root,'Presentacion'))).find(n=>n.endsWith('.mp4'));
const bytes=await fs.readFile(path.join(root,'Presentacion',name));
const server=http.createServer((req,res)=>{
 if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<video id="v" src="/video" muted preload="auto"></video>');return;}
 const range=req.headers.range;
 if(range){const match=/bytes=(\d+)-(\d*)/.exec(range);const start=Number(match[1]),end=match[2]?Number(match[2]):bytes.length-1;res.writeHead(206,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1});res.end(bytes.subarray(start,end+1));}
 else {res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':bytes.length});res.end(bytes);}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage();
await page.setContent('<video id="v" muted preload="auto"></video>');
await page.evaluate(data=>{v.src='data:video/mp4;base64,'+data;},bytes.toString('base64'));
console.log(await page.evaluate(()=>({state:v.readyState,error:v.error?.message,src:v.currentSrc})));
await page.waitForFunction(()=>document.querySelector('video').readyState>=2,{},{timeout:30000});
const duration=await page.evaluate(()=>v.duration); console.log({duration});
for(let i=0;i<8;i++){
 await page.evaluate(async t=>{await new Promise(r=>{v.onseeked=r;v.currentTime=t;});},duration*(i+.5)/8);
 const data=await page.evaluate(()=>{const c=document.createElement('canvas'); c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return c.toDataURL('image/png').split(',')[1];});
 await fs.writeFile(path.join(root,`Presentacion/.build/frame-${i}.png`),Buffer.from(data,'base64'));
}
await browser.close();server.close();
