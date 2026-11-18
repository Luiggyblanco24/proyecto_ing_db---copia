import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Presentation,PresentationFile} from 'file:///C:/Program%20Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1116-1220-0_26.1116.1220.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const root=process.cwd(), build=path.join(root,'Presentacion/.build');
const p=Presentation.create({slideSize:{width:1280,height:720}});
const C={green:'#1B7A38',ink:'#1E293B',cream:'#F8F6F0',muted:'#53615B'};
function text(s,t,x,y,w,h,size=28,color=C.ink,bold=false){const z=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});z.text=t;z.text.style={fontFamily:'Arial',fontSize:size,color,bold};return z;}
async function image(s,file,x,y,w,h){const b=await fs.readFile(file);s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:file.endsWith('.svg')?'image/svg+xml':'image/png',alt:'SUTENS, material del proyecto',fit:'contain',position:{left:x,top:y,width:w,height:h}});}
function slide(title,i,dark=false){const s=p.slides.add();s.background.fill=dark?C.green:C.cream;text(s,title,70,66,1140,115,46,dark?'#FFFFFF':C.green,true);text(s,`${String(i).padStart(2,'0')} / 06`,1110,665,100,25,16,dark?'#FFFFFF':C.muted);return s;}
let s=slide('Plataforma web SUTENS',1,true);
text(s,'Comunicación y gestión sindical',74,230,1050,90,52,'#FFFFFF',true);
text(s,'Un espacio oficial para conocer al sindicato,\nconsultar información y participar',74,370,1000,110,30,'#FFFFFF');
text(s,'Sindicato Unitario de Trabajadores de la Educación de Norte de Santander',74,575,1020,65,21,'#FFFFFF');
s.speakerNotes.text='Buenos días. Presentamos la plataforma web para SUTENS. Buscamos fortalecer la comunicación, facilitar su gestión y acercar el sindicato a sus afiliados y a quienes desean conocerlo. Fuente: README.md del proyecto. Duración sugerida: 30 segundos.';
s=slide('El problema: encontrar información oficial',2);
text(s,'Lo que muestran las búsquedas compartidas',74,200,1100,50,30,C.ink,true);
text(s,'Referencias a Facebook y publicaciones de otras entidades',74,280,1080,65,30);
text(s,'Sugerencia de búsqueda con el nombre de otro sindicato',74,365,1080,65,30);
text(s,'La oportunidad: reunir la información en un sitio propio',74,495,1080,100,36,C.green,true);
s.speakerNotes.text='Mostrar las dos capturas de Google compartidas al inicio. Encontramos referencias a Facebook y publicaciones externas. Incluso aparece una sugerencia con el nombre de otro sindicato. Esto no demuestra ausencia de presencia digital, pero sí plantea una oportunidad: ofrecer una fuente oficial clara para conocer a SUTENS, consultar comunicados y saber cómo afiliarse. La captura es una observación puntual, no una medición del posicionamiento actual. Duración: 45 segundos.';
s=slide('La solución: un punto de consulta y gestión',3);
text(s,'Sitio público',74,220,510,60,34,C.green,true);
text(s,'Identidad institucional\nDirectiva y subdirectivas\nComunicados públicos\nSolicitud de afiliación',74,310,510,230,29);
text(s,'Espacio privado',690,220,510,60,34,C.green,true);
text(s,'Gestión de afiliados\nBibliotecas de documentos\nCalendario de actividades\nPermisos según responsabilidades',690,310,510,230,29);
s.speakerNotes.text='Nuestra solución reúne un sitio público y un espacio privado. El primero permite conocer la organización y acceder a información autorizada. El segundo apoya los procesos internos según el rol de cada usuario. La información pública y los datos de los afiliados tienen distintos niveles de acceso. Fuente: README.md, src/routes. Duración: 45 segundos.';
s=slide('Funciones que facilitan el trabajo sindical',4);
const items=[['Afiliación en línea','Solicitud y revisión por los responsables'],['Gestión de afiliados','Información organizada por la estructura sindical'],['Bibliotecas','Documentos sindicales y recursos educativos'],['Calendario','Consulta y organización de actividades']];
for(let i=0;i<items.length;i++){let y=210+i*103;text(s,items[i][0],74,y,390,57,29,C.green,true);text(s,items[i][1],500,y,700,72,27);}
s.speakerNotes.text='Recorrer estas funciones durante la demostración. La solicitud en línea facilita el inicio del trámite, pero el registro no aprueba automáticamente la afiliación. La gestión organiza afiliados por subdirectiva, institución y sede. La biblioteca sindical reúne documentos y comunicados. La educativa permite a afiliados aprobados compartir guías y metodologías. El calendario ayuda a consultar y organizar eventos. Fuente: README.md y rutas de afiliados, bibliotecas y calendario. Duración: 75 segundos.';
s=slide('Beneficios para quienes usan la plataforma',5);
text(s,'Afiliados',74,220,350,55,32,C.green,true);text(s,'Información y recursos\nen un lugar definido',74,305,350,150,28);
text(s,'Directivos',475,220,350,55,32,C.green,true);text(s,'Registros centralizados\ny menos búsquedas manuales',475,305,350,150,28);
text(s,'Nuevos interesados',875,220,350,70,32,C.green,true);text(s,'Conocer al sindicato\ne iniciar su vinculación',875,305,340,150,28);
text(s,'Otros sindicatos pueden adaptar estas herramientas a su organización',74,525,1100,90,31,C.ink,true);
s.speakerNotes.text='Para los afiliados, la plataforma facilita encontrar documentos y conocer actividades. Para los directivos, centraliza registros y puede reducir tareas repetitivas. Para los interesados, ofrece una puerta de entrada para conocer el sindicato y solicitar su afiliación. Estas necesidades también existen en otros sindicatos. Su adaptación requiere ajustar estructura, permisos y contenidos. Los beneficios son esperados, no resultados cuantificados. Duración: 55 segundos.';
s=slide('SUTENS, más cercano a sus afiliados',6,true);
text(s,'Más fácil de encontrar\nMás sencillo de conocer\nMás cercano a sus integrantes',74,225,1100,230,48,'#FFFFFF',true);
text(s,'La utilidad depende de mantener la información actualizada\ny promover el uso de la plataforma',74,505,1100,95,28,'#FFFFFF');
s.speakerNotes.text='Retomando las búsquedas iniciales, queremos que cualquier persona interesada encuentre un espacio oficial de SUTENS. Publicar una web no garantiza aparecer primero en Google: también requiere contenido actualizado y trabajo de posicionamiento. El valor del proyecto es integrar comunicación, organización y servicios. Su utilidad se mantiene con la actualización y la participación de sus integrantes. Muchas gracias. Duración: 40 segundos.';
await fs.mkdir(path.join(build,'renders'),{recursive:true});
await (await PresentationFile.exportPptx(p)).save(path.join(build,'candidate.pptx'));
for(let i=0;i<p.slides.items.length;i++){const b=await p.export({slide:p.slides.items[i],format:'png',scale:1});await fs.writeFile(path.join(build,`renders/slide-${i+1}.png`),new Uint8Array(await b.arrayBuffer()));}
const skill='C:/Users/24lui/.codex/plugins/cache/openai-primary-runtime/presentations/26.1116.12020/skills/presentations';
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')));
const runtime='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1116-1220-0_26.1116.1220.0_x64__3k8sg7r9htsxt/dependencies';
await fs.mkdir(path.join(build,'output'),{recursive:true}); const final=path.join(build,'output/SUTENS_Presentacion.pptx');
console.log(await finalizePresentation({workspaceDir:root,candidatePath:path.join(build,'candidate.pptx'),finalPath:final,pythonExecutable:path.join(runtime,'python/python.exe'),integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],explicitTotalSlideCount:6,fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:path.join(build,'validation.json')}));

await fs.copyFile(final,path.join(root,'Presentacion/SUTENS_Presentacion.pptx'));

