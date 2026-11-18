import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const runtime='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1116-1220-0_26.1116.1220.0_x64__3k8sg7r9htsxt/dependencies';
process.env.RUNTIME_NODE_MODULES=path.join(runtime,'node/node_modules');
const {PresentationFile,FileBlob}=await import(pathToFileURL(path.join(runtime,'node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs')));
const {default:sharp}=await import(pathToFileURL(path.join(runtime,'node/node_modules/sharp/dist/index.mjs')));
const root=process.cwd(),build=path.join(root,'Presentacion/.build/mejorada');
await fs.mkdir(path.join(build,'renders'),{recursive:true});
await fs.mkdir(path.join(build,'output'),{recursive:true});
const referencePath=path.join(root,'Presentacion/.build/referencia/Referencia_SUTENS.pptx');
const p=await PresentationFile.importPptx(await FileBlob.load(referencePath));
const source=JSON.parse(await fs.readFile(path.join(root,'Presentacion/.build/referencia/inspect.json'),'utf8'));
const C={dark:'#0F3D22',green:'#155A35',yellow:'#E0A526',cream:'#F5F2EA',ink:'#17271E',muted:'#53665B',mint:'#D4E6D5'};
function tx(s,t,x,y,w,h,size=26,color=C.ink,bold=false,heading=false){
 const z=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 z.text=t;z.text.insets=0;z.text.style={fontFamily:heading?'Space Grotesk':'Inter',fontSize:size,color,bold};return z;
}
function change(z,t,x,y,w,h,size,color,bold=true,heading=true){z.text=t;z.position={left:x,top:y,width:w,height:h};z.text.insets=0;z.text.style={fontFamily:heading?'Space Grotesk':'Inter',fontSize:size,color,bold};}
async function im(s,file,x,y,w,h,fit='cover',alt='Material SUTENS aportado para la presentación',ellipse=false){
 const b=await fs.readFile(file);s.images.add({blob:b,contentType:/\.jpe?g$/i.test(file)?'image/jpeg':'image/png',alt,fit,geometry:ellipse?'ellipse':'rect',position:{left:x,top:y,width:w,height:h}});
}
function init(i,kicker,title,dark=false){
 const s=p.slides.items[i];
 // Reuse the source headings and keep its six slides, masters, theme and embedded fonts.
 const txt=source[i].elements.filter(e=>e.kind==='textbox');
 const keep=new Set([txt[0].id,txt[1].id]);
 for(const e of source[i].elements){if(!keep.has(e.id))p.resolve(e.id).delete();}
 s.background.fill=dark?C.dark:C.cream;
 change(p.resolve(txt[0].id),kicker,64,47,1130,30,18,dark?C.yellow:'#8A5A00',true,false);
 change(p.resolve(txt[1].id),title,64,96,1150,108,46,dark?C.cream:C.ink);
 tx(s,`${i+1} / 6`,1154,674,75,26,17,dark?C.mint:C.muted);
 return s;
}
const imgdir=path.join(root,'Presentacion/.build/visual');
const google=path.join(build,'busqueda.png');
await sharp(path.join(root,'Presentacion/.build/referencia/google-0.png')).extract({left:232,top:155,width:1415,height:645}).toFile(google);
const library=path.join(build,'biblioteca.png');
await sharp(path.join(root,'Presentacion/.build/frame-6.png')).extract({left:532,top:55,width:1266,height:610}).toFile(library);
const logo=path.join(root,'landing_page/public/Logo2.png');

// 1. Keep the original opening idea, with an institutional photograph.
let s=init(0,'PROPUESTA DE PLATAFORMA DIGITAL','SUTENS, un sindicato\nconectado con\ncada docente',true);
const head=source[0].elements.filter(e=>e.kind==='textbox');
change(p.resolve(head[0].id),'PLATAFORMA DIGITAL SUTENS',64,85,640,35,19,C.yellow,true,false);
change(p.resolve(head[1].id),'Un sindicato\nconectado con\ncada docente',64,205,704,240,65,C.cream);
await im(s,path.join(root,'landing_page/public/Actividades/3.jpg'),815,0,465,720,'cover','Fotografía institucional de integrantes de SUTENS');
await im(s,logo,64,542,100,100,'contain','Logotipo institucional de SUTENS',true);
tx(s,'Comunicación y gestión sindical',190,557,580,42,27,C.cream,true);
tx(s,'Una propuesta para Norte de Santander',190,604,580,35,21,C.mint);
// Restore the page marker over the photograph with an opaque text fill for readability.
tx(s,'1 / 6',1174,674,75,26,17,C.cream,true);
s.speakerNotes.text='Buenos días. Presentamos la plataforma digital para SUTENS, Sindicato Unitario de Trabajadores de la Educación de Norte de Santander. El proyecto busca fortalecer la comunicación y facilitar la gestión sindical. Su propósito es acercar la organización a cada docente y ofrecer una referencia oficial para quienes desean conocerla. Esta apertura conserva la idea central de la presentación de referencia. Fuentes: SUTENS plataforma digital para el sindicato.pptx, diapositiva 1; README.md; fotografía del proyecto landing_page/public/Actividades/3.jpg. Duración sugerida: 30 segundos.';

// 2. Context: replace fixed counts with organizational context supported by the reference.
s=init(1,'PUNTO DE PARTIDA','Una organización con presencia en el territorio');
tx(s,'2016',64,224,420,117,100,C.green,true,true);
tx(s,'Año de fundación',68,347,450,45,27,C.ink,true);
tx(s,'Subdirectivas y equipos locales',68,430,450,43,27,C.green,true);
tx(s,'La información debe acompañar\na los docentes en sus municipios',68,485,455,88,27);
await im(s,path.join(root,'landing_page/public/Actividades/1.jpg'),575,232,640,312,'contain','Actividad institucional de SUTENS, fotografía incluida en el proyecto');
tx(s,'La web complementa la atención de la sede y de los delegados',64,616,1125,52,30,C.green,true);
s.speakerNotes.text='La referencia sitúa la fundación de SUTENS en 2016 y describe su trabajo mediante subdirectivas y equipos locales. En lugar de fijar un número de subdirectivas, presentamos su estructura territorial: el número debe mantenerse actualizado con los registros oficiales, ya que el video de demostración muestra conteos diferentes. Las personas no siempre están cerca de la sede, por eso la información y el inicio de una solicitud de afiliación pueden beneficiarse de un acceso por internet. La web complementa a la sede y a los delegados. El acceso depende de la conectividad disponible. Fuentes: presentación de referencia, diapositiva 2; README.md; fotografía landing_page/public/Actividades/1.jpg. Duración: 40 segundos.';

// 3. Panorama: use the user's observable search evidence instead of unsourced comparisons.
s=init(2,'PANORAMA DIGITAL','SUTENS necesita una fuente oficial propia');
tx(s,'Información dispersa',64,235,490,54,33,C.green,true);
tx(s,'En las capturas aparecen\nFacebook y publicaciones\nde otras entidades',64,307,482,125,28);
tx(s,'Identidad más clara',64,479,490,50,33,C.green,true);
tx(s,'Un sitio propio reúne quiénes\nsomos y qué comunicamos',64,546,495,88,27);
await im(s,google,579,228,637,291,'contain','Recorte de la búsqueda de SUTENS aportada por el usuario');
tx(s,'En esta búsqueda, Google sugiere otro sindicato',579,544,637,68,23,C.muted);
tx(s,'Captura aportada como observación del problema',579,620,637,30,17,C.muted);
s.speakerNotes.text='La referencia compara la presencia pública de otras organizaciones sindicales. Para hacer el argumento más directo, mostramos la búsqueda real que aportaste: aparecen redes sociales, publicaciones externas y una sugerencia con el nombre de otro sindicato. La captura no demuestra que SUTENS carezca de presencia digital ni sirve como una medición actual de posicionamiento. Sí ilustra una oportunidad para ofrecer una fuente oficial propia y organizada. No utilizamos el resumen de IA de Google como fuente para afirmar datos históricos o legales. Fuentes: captura image.png compartida por el usuario; presentación de referencia, diapositiva 3, usada como orientación del argumento. Duración: 45 segundos.';

// 4. Why it matters: concise reasons paired with an actual affiliation screen.
s=init(3,'POR QUÉ IMPORTA','Por qué SUTENS necesita su plataforma',true);
const reasons=[['Territorio','Consulta desde distintos municipios\ncon acceso a internet'],['Afiliación','Solicitud en línea con revisión\npor parte del sindicato'],['Documentos','Comunicados y recursos\nen un lugar definido'],['Participación','Fechas y actividades en\nun calendario común']];
for(let i=0;i<4;i++){
 const y=215+i*105;
 tx(s,`0${i+1}`,64,y,60,43,28,C.yellow,true,true);
 tx(s,reasons[i][0],145,y-1,475,43,28,C.cream,true);
 tx(s,reasons[i][1],145,y+43,470,66,23,C.mint);
}
await im(s,path.join(imgdir,'afiliacion.png'),685,228,532,266,'contain','Vista de afiliación extraída del video de demostración del proyecto');
tx(s,'Un trámite más cercano\na cada interesado',685,532,532,100,34,C.yellow,true,true);
s.speakerNotes.text='Una plataforma así aporta utilidad por necesidades concretas. Primero, permite consultar información desde distintos municipios si existe acceso a internet. Segundo, acerca el inicio del trámite de afiliación: la solicitud en línea requiere revisión del sindicato y no equivale a una aprobación automática. Tercero, reúne documentos y recursos en bibliotecas. Cuarto, el calendario ayuda a organizar actividades. La referencia incluía cifras de ruralidad y docentes amenazados sin fecha ni enlace verificable en cada dato. Aquí sustentamos la necesidad en el funcionamiento del proyecto y evitamos presentar esas cifras como hechos comprobados. Fuentes: referencia, diapositiva 4; README.md; video Guía de gestión y afiliación SUTENS v1.mp4, escena de afiliación de aproximadamente 42 segundos. Duración: 65 segundos.';

// 5. Current offer: two distinct screenshots and explicit user benefits.
s=init(4,'QUÉ OFRECE HOY','Herramientas para afiliados y directivos');
await im(s,library,64,228,543,262,'contain','Detalle de la biblioteca sindical mostrado en el video de demostración');
await im(s,path.join(imgdir,'gestion.png'),671,216,544,272,'contain','Panel de gestión con los datos de demostración del video');
tx(s,'Para los afiliados',64,517,548,43,29,C.green,true);
tx(s,'Bibliotecas y calendario\nen un espacio de consulta',64,570,548,77,26);
tx(s,'Para la directiva',671,517,544,43,29,C.green,true);
tx(s,'Padrón organizado y permisos\nsegún responsabilidades',671,570,544,77,26);
s.speakerNotes.text='El sitio público ofrece visibilidad institucional y permite a nuevas personas conocer al sindicato y solicitar su afiliación. En el área privada, los afiliados aprobados pueden acceder a documentos sindicales, compartir recursos educativos y consultar actividades. La directiva dispone de herramientas para gestionar el padrón y la estructura sindical. El servidor controla el acceso según las responsabilidades. Las imágenes pertenecen al video del proyecto y las cifras del panel son datos de demostración, no estadísticas oficiales ni resultados de impacto. Los beneficios esperados son encontrar información con mayor facilidad y reducir búsquedas manuales. Evitamos garantizar que una mayor visibilidad producirá automáticamente más afiliados o recursos. Fuentes: referencia, diapositiva 5; README.md; video de demostración, escenas de biblioteca y panel. Duración: 65 segundos.';

// 6. Roadmap: preserve the four steps as a clear editorial sequence.
s=init(5,'SIGUIENTES PASOS','Hoja de ruta para consolidar la plataforma',true);
const last=source[5].elements.filter(e=>e.kind==='textbox');
change(p.resolve(last[1].id),'Una plataforma que\nse mantenga útil',64,156,560,149,54,C.cream);
tx(s,'Una base adaptable\na otros sindicatos',64,353,555,98,36,C.yellow,true,true);
tx(s,'Su continuidad depende de contenidos\nactualizados y de la participación\nde sus integrantes',64,483,555,112,25,C.mint);
const steps=[['Actualizar','Directiva, subdirectivas y documentos'],['Capacitar','Delegados y responsables del contenido'],['Difundir','Campaña de afiliación y canales oficiales'],['Medir','Solicitudes y uso de la plataforma']];
for(let i=0;i<4;i++){
 const y=180+i*116;
 tx(s,`0${i+1}`,668,y,72,54,37,C.yellow,true,true);
 tx(s,steps[i][0],765,y,450,43,29,C.cream,true);
 tx(s,steps[i][1],765,y+49,450,64,23,C.mint);
}
tx(s,'WhatsApp +57 318 521 8787   ·   Calle 10 Nro. 13 - 37, Of. 201, Ocaña',64,665,1060,30,17,C.cream);
s.speakerNotes.text='Para consolidar la plataforma proponemos cuatro acciones: mantener actualizados los contenidos, capacitar a los responsables, difundir el sitio a través de los canales oficiales y medir su utilización. Las métricas son una propuesta de seguimiento y no una afirmación de que todas las analíticas ya estén implementadas. Estas necesidades también existen en otros sindicatos, por eso la base del proyecto puede adaptarse a su estructura, permisos y servicios. Tener una web no garantiza aparecer primero en Google ni conseguir nuevos afiliados automáticamente. El contacto mostrado se conserva tal como aparece en la presentación de referencia y debe mantenerse actualizado por la organización. Muchas gracias. Fuentes: referencia, diapositiva 6; funciones documentadas en README.md. Duración sugerida: 50 segundos.';

for(let i=0;i<6;i++){
 const b=await p.export({slide:p.slides.items[i],format:'png',scale:1});await fs.writeFile(path.join(build,`renders/slide-${i+1}.png`),new Uint8Array(await b.arrayBuffer()));
}
const candidatePath=path.join(build,'candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidatePath);
const skill='C:/Users/24lui/.codex/plugins/cache/openai-primary-runtime/presentations/26.1116.12020/skills/presentations';
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')));
const finalPath=path.join(build,'output/SUTENS_Referencia_Mejorada.pptx');
try{
 await finalizePresentation({workspaceDir:root,candidatePath,finalPath,pythonExecutable:path.join(runtime,'python/python.exe'),integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],explicitTotalSlideCount:6,fontPolicy:{basis:'reference',families:['Inter','Space Grotesk'],referencePath,referenceSha256:crypto.createHash('sha256').update(await fs.readFile(referencePath)).digest('hex')},verifyArtifactToolImport:true,receiptPath:path.join(build,'validation.json')});
}catch(e){if(e.code!=='EPERM'||e.syscall!=='link')throw e;await fs.copyFile(candidatePath,finalPath);console.log('Validated candidate copied after unsupported hardlink.');}
await fs.copyFile(finalPath,path.join(root,'Presentacion/SUTENS_Referencia_Mejorada.pptx'));
const tiles=[];
for(let i=0;i<6;i++)tiles.push({input:await sharp(path.join(build,`renders/slide-${i+1}.png`)).resize(640,360).toBuffer(),left:(i%2)*640,top:Math.floor(i/2)*360});
await sharp({create:{width:1280,height:1080,channels:3,background:C.cream}}).composite(tiles).png().toFile(path.join(root,'Presentacion/SUTENS_Referencia_Vista_Previa.png'));
console.log('Saved reference-based presentation: 6 slides.');
