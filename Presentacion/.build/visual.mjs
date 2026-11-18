import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const runtime='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1116-1220-0_26.1116.1220.0_x64__3k8sg7r9htsxt/dependencies';
process.env.RUNTIME_NODE_MODULES=path.join(runtime,'node/node_modules');
const {Presentation,PresentationFile}=await import(pathToFileURL(path.join(runtime,'node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs')));
const {default:sharp}=await import(pathToFileURL(path.join(runtime,'node/node_modules/sharp/dist/index.mjs')));
const root=process.cwd(),build=path.join(root,'Presentacion/.build/visual');
await fs.mkdir(path.join(build,'renders'),{recursive:true});
await fs.mkdir(path.join(build,'output'),{recursive:true});
const p=Presentation.create({slideSize:{width:1280,height:720}});
const C={dark:'#07382B',green:'#1B7A38',yellow:'#FFC94A',cream:'#F8F6F0',ink:'#142C25',muted:'#52645D',white:'#FFFFFF',mint:'#BDE1CD'};
function tx(s,t,x,y,w,h,size=28,color=C.ink,bold=false){
 const z=s.shapes.add({geometry:'textbox',name:t.slice(0,55),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 z.text=t;z.text.insets=0;z.text.style={fontFamily:'Arial',fontSize:size,color,bold};return z;
}
async function im(s,file,x,y,w,h,fit='cover',alt='Material del proyecto SUTENS'){
 const b=await fs.readFile(file);const ext=path.extname(file).toLowerCase();
 s.images.add({blob:b,contentType:ext==='.svg'?'image/svg+xml':ext==='.jpg'?'image/jpeg':'image/png',alt,fit,position:{left:x,top:y,width:w,height:h}});
}
function sl(n,bg=C.cream){let s=p.slides.add();s.background.fill=bg;tx(s,`${n} / 6`,1178,675,65,24,17,bg===C.cream?C.muted:C.mint);return s;}
async function cropFrame(index,name,rect){let f=path.join(build,name+'.png');await sharp(path.join(root,`Presentacion/.build/frame-${index}.png`)).extract(rect).toFile(f);return f;}
const publicSite=await cropFrame(0,'sitio-publico',{left:118,top:50,width:1680,height:840});
const affiliation=await cropFrame(2,'afiliacion',{left:118,top:50,width:1680,height:840});
const dashboard=await cropFrame(3,'gestion',{left:118,top:50,width:1680,height:840});
const library=await cropFrame(6,'biblioteca',{left:118,top:50,width:1680,height:840});
const logo=path.join(root,'landing_page/public/Logo2.png');

// 1. Portada fotográfica. La imagen pertenece al material institucional del proyecto.
let s=sl(1,C.dark);
tx(s,'SUTENS',58,38,850,52,35,C.yellow,true);
tx(s,'Un sindicato más cerca\nde sus afiliados',58,111,1010,157,62,C.white,true);
tx(s,'Plataforma web de comunicación y gestión sindical',60,283,1100,44,26,C.mint);
await im(s,logo,1092,34,130,130,'contain','Logotipo SUTENS del proyecto');
await im(s,path.join(root,'landing_page/public/Actividades/1.jpg'),0,352,1280,305,'cover','Fotografía institucional de una actividad de SUTENS');
tx(s,'PROYECTO DE INGENIERÍA DE SISTEMAS',60,674,1050,25,16,C.mint);
s.speakerNotes.text='Buenos días. Presentamos nuestra plataforma web para SUTENS, una propuesta para fortalecer la comunicación y facilitar la gestión sindical. Queremos acercar la organización a sus afiliados y a quienes desean conocerla. La fotografía forma parte de los recursos institucionales del proyecto. Fuentes: README.md y landing_page/public/Actividades/1.jpg. Duración sugerida: 30 segundos.';

// 2. Problema: composición tipográfica y evidencia observada, sin recrear una captura.
s=sl(2,C.dark);
tx(s,'EL PUNTO DE PARTIDA',58,42,950,33,19,C.yellow,true);
tx(s,'¿Qué encuentra alguien\nque busca SUTENS?',58,106,1120,145,58,C.white,true);
tx(s,'01',60,300,130,90,68,C.yellow,true);
tx(s,'Información dispersa',225,299,930,51,34,C.white,true);
tx(s,'Facebook y publicaciones de otras entidades',225,357,970,42,27,C.mint);
tx(s,'02',60,432,130,90,68,C.yellow,true);
tx(s,'Confusión en la búsqueda',225,432,930,51,34,C.white,true);
tx(s,'Google sugiere el nombre de otro sindicato',225,490,970,42,27,C.mint);
tx(s,'La necesidad: una fuente oficial propia y organizada',60,594,1150,52,32,C.yellow,true);
s.speakerNotes.text='Aquí podemos mostrar las capturas de Google compartidas al plantear el proyecto. En ellas aparecen referencias a Facebook y publicaciones externas. También vemos una sugerencia con el nombre de otro sindicato. Las capturas no prueban que SUTENS carezca de presencia digital, pero ilustran la oportunidad de reunir su información en una fuente oficial propia. Estas son observaciones de las capturas del usuario, no un estudio de posicionamiento ni una verificación actual de los resultados. Duración: 45 segundos.';

// 3. Sitio público con imagen amplia de la plataforma real.
s=sl(3);
tx(s,'LA SOLUCIÓN',58,38,900,30,18,C.green,true);
tx(s,'Un espacio oficial para conocer a SUTENS',58,85,1160,75,47,C.dark,true);
await im(s,publicSite,58,194,790,395,'contain','Vista del sitio público extraída del video aportado');
tx(s,'Identidad propia',891,209,330,48,29,C.green,true);
tx(s,'Quiénes somos y\ncómo nos organizamos',891,266,325,77,25);
tx(s,'Información pública',891,375,335,46,29,C.green,true);
tx(s,'Comunicados y acceso\na la solicitud de afiliación',891,431,327,98,25);
tx(s,'Más claridad para quien llega por primera vez',60,620,1110,47,30,C.dark,true);
s.speakerNotes.text='La solución comienza con un sitio público que reúne la identidad institucional, la estructura del sindicato y sus comunicaciones. Una persona interesada puede conocer a SUTENS e iniciar su solicitud de afiliación. En el video observamos la portada, la navegación institucional y el acceso a Afíliate. Fuente visual: video Guía de gestión y afiliación SUTENS v1.mp4, escena de aproximadamente 8 segundos. Fuente funcional: README.md. Los datos y cifras visibles pertenecen a la demostración del video y no deben interpretarse como estadísticas oficiales actualizadas. Duración: 45 segundos.';

// 4. Gestión: una captura principal y una lista breve de funciones.
s=sl(4,C.dark);
tx(s,'EL TRABAJO INTERNO',58,38,1100,30,18,C.yellow,true);
tx(s,'Herramientas para la gestión diaria',58,85,1160,75,49,C.white,true);
await im(s,dashboard,536,208,685,343,'contain','Panel de gestión mostrado en el video del proyecto');
const rows=[['01','Afiliación y revisión'],['02','Gestión de afiliados'],['03','Bibliotecas de recursos'],['04','Calendario de actividades']];
for(let i=0;i<rows.length;i++){const y=205+i*87;tx(s,rows[i][0],60,y,60,42,28,C.yellow,true);tx(s,rows[i][1],139,y,368,69,28,C.white,true);}
tx(s,'Vista de demostración del video',540,570,660,28,18,C.mint);
tx(s,'Cada usuario accede según sus responsabilidades',60,630,1100,44,29,C.yellow,true);
s.speakerNotes.text='En el espacio privado encontramos las herramientas que apoyan el trabajo interno. La solicitud de afiliación queda pendiente de revisión: registrarse no significa quedar aprobado automáticamente. El padrón organiza afiliados por la estructura sindical. La biblioteca sindical reúne documentos y la educativa permite compartir guías y metodologías entre afiliados aprobados. El calendario facilita consultar y organizar eventos. El servidor limita el acceso de acuerdo con las responsabilidades. Fuente visual: video del usuario, aproximadamente 59 segundos. Las cifras son datos de demostración, no resultados de impacto ni estadísticas oficiales. Fuentes funcionales: README.md, src/routes/afiliado.routes.js, biblioteca.routes.js y calendario.routes.js. Duración: 75 segundos.';

// 5. Beneficios: fotografía institucional y texto editorial.
s=sl(5);
tx(s,'EL VALOR PARA LAS PERSONAS',58,38,1100,30,18,C.green,true);
tx(s,'Una plataforma útil para sus integrantes',58,85,1160,75,47,C.dark,true);
await im(s,path.join(root,'landing_page/public/Actividades/3.jpg'),58,205,610,390,'cover','Integrantes de SUTENS en fotografía institucional del proyecto');
tx(s,'Afiliados',722,207,495,42,30,C.green,true);
tx(s,'Documentos y actividades\nen un lugar definido',722,258,495,72,26);
tx(s,'Directivos',722,365,495,42,30,C.green,true);
tx(s,'Registros centralizados y\nmenos búsquedas manuales',722,416,495,72,26);
tx(s,'Nuevos interesados',722,523,495,42,30,C.green,true);
tx(s,'Conocer la organización\ne iniciar su vinculación',722,574,495,72,26);
s.speakerNotes.text='Los afiliados ganan facilidad para encontrar documentos, recursos y actividades. Los directivos cuentan con registros centralizados y herramientas que pueden reducir búsquedas manuales. Quienes aún no pertenecen al sindicato tienen una puerta de entrada para conocerlo e iniciar su vinculación. Son beneficios esperados del diseño, no ahorros cuantificados ni impactos que hayamos medido. Fuente de la fotografía: landing_page/public/Actividades/3.jpg. Fuente funcional: README.md y recorrido del video. Duración: 50 segundos.';

// 6. Cierre: imagen del sindicato y mensaje central.
s=sl(6,C.dark);
await im(s,path.join(root,'landing_page/public/Actividades/5.jpg'),0,0,565,720,'cover','Actividad colectiva de SUTENS, fotografía del proyecto');
tx(s,'SU UTILIDAD VA MÁS ALLÁ',615,51,600,35,18,C.yellow,true);
tx(s,'Comunicación\ny organización\npara el sindicato',615,120,610,220,54,C.white,true);
tx(s,'Una base adaptable\na otros sindicatos',617,391,595,92,34,C.yellow,true);
tx(s,'El valor se mantiene con información\nactualizada y participación de sus integrantes',617,516,580,100,25,C.mint);
tx(s,'Gracias',617,641,450,42,29,C.white,true);
s.speakerNotes.text='Las necesidades de comunicación, organización de afiliados y acceso a documentos también están presentes en otros sindicatos. La propuesta puede adaptarse a su estructura, permisos y servicios. Volviendo a las búsquedas iniciales, buscamos una fuente oficial más fácil de encontrar y de conocer. Una web no garantiza aparecer primero en Google: requiere publicación, contenido actualizado y trabajo de posicionamiento. Su utilidad depende de que la organización mantenga la información y promueva su uso. Muchas gracias. Fuente de fotografía: landing_page/public/Actividades/5.jpg. Duración sugerida: 50 segundos.';

for(let i=0;i<p.slides.items.length;i++){
 const b=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(build,`renders/slide-${i+1}.png`),new Uint8Array(await b.arrayBuffer()));
}
const candidatePath=path.join(build,'candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidatePath);
const skill='C:/Users/24lui/.codex/plugins/cache/openai-primary-runtime/presentations/26.1116.12020/skills/presentations';
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')));
const finalPath=path.join(build,'output/SUTENS_Presentacion_Visual.pptx');
try {
 await finalizePresentation({workspaceDir:root,candidatePath,finalPath,pythonExecutable:path.join(runtime,'python/python.exe'),integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],explicitTotalSlideCount:6,fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:path.join(build,'validation.json')});
}catch(e){
 if(e.code!=='EPERM'||e.syscall!=='link')throw e;
 console.log('Checks completed; final hardlink unavailable, copying validated candidate.');
 await fs.copyFile(candidatePath,finalPath);
}
await fs.copyFile(finalPath,path.join(root,'Presentacion/SUTENS_Presentacion_Visual.pptx'));
await fs.copyFile(finalPath,path.join(root,'Presentacion/SUTENS_Presentacion.pptx'));
// Una vista previa ligera para que el usuario pueda valorar el nuevo diseño.
const tiles=[];
for(let i=0;i<6;i++){tiles.push({input:await sharp(path.join(build,`renders/slide-${i+1}.png`)).resize(640,360).toBuffer(),left:(i%2)*640,top:Math.floor(i/2)*360});}
await sharp({create:{width:1280,height:1080,channels:3,background:'#F8F6F0'}}).composite(tiles).png().toFile(path.join(build,'Vista_Previa.png'));
console.log('Saved 6 slides and speaker notes.');
