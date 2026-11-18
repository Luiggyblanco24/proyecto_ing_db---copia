const editorPortada = document.getElementById('portada-editor');
const controlesPortada = document.getElementById('portada-controles');
const espacioPortada = document.getElementById('portada-espacio');
const galeriaPortada = document.getElementById('portada-galeria');
const archivoPortada = document.getElementById('portada-archivo');
const descripcionPortada = document.getElementById('portada-descripcion');
const actualPortada = document.getElementById('portada-actual');
const estadoPortada = document.getElementById('portada-estado');
const previewPortada = document.getElementById('portada-preview');
const restaurarPortada = document.getElementById('portada-restaurar');
const mensajePortada = document.getElementById('portada-mensaje');
const fotosPortada = new Map();
const fotosSugeridasPortada = new Map();
let urlArchivoPortada;

function fotoElegidaPortada() {
  return galeriaPortada.querySelector('input:checked');
}

function limpiarSugerenciaPortada() {
  const seleccion = fotoElegidaPortada();
  if (seleccion) seleccion.checked = false;
}

function mostrarPreviewPortada(imagen, url, descripcion = imagen.alt) {
  imagen.hidden = !url;
  if (url) {
    imagen.src = url;
    imagen.alt = descripcion;
  } else {
    imagen.removeAttribute('src');
  }
}

function limpiarPreviewPortada() {
  mostrarPreviewPortada(previewPortada, '');
  if (urlArchivoPortada) URL.revokeObjectURL(urlArchivoPortada);
  urlArchivoPortada = undefined;
}

function mostrarEspacioPortada() {
  const foto = fotosPortada.get(espacioPortada.value);
  limpiarSugerenciaPortada();
  archivoPortada.value = '';
  limpiarPreviewPortada();
  descripcionPortada.value = foto?.descripcion || '';
  estadoPortada.textContent = foto ? 'Imagen publicada' : 'Se está mostrando la imagen original.';
  restaurarPortada.hidden = !foto;
  mostrarPreviewPortada(actualPortada, foto?.imagen_url, foto?.descripcion);
}

async function cargarEditorPortada() {
  if (controlesPortada.disabled) return;
  const claveAnterior = espacioPortada.value;
  editorPortada.hidden = true;
  controlesPortada.disabled = true;
  mensajePortada.textContent = 'Cargando imágenes…';
  try {
    const [espacios, fotos, sugerencias] = await Promise.all([
      apiFetch('/api/public/portada/espacios'),
      apiFetch('/api/public/portada'),
      apiFetch('/api/public/galeria').catch(() => null),
    ]);
    fotosPortada.clear();
    for (const foto of fotos) fotosPortada.set(foto.clave, foto);
    fotosSugeridasPortada.clear();
    galeriaPortada.replaceChildren();
    for (const foto of sugerencias ?? []) {
      if (!/^(\/Actividades\/|\/api\/public\/galeria\/|https:\/\/)/.test(foto.imagen_url)) continue;
      fotosSugeridasPortada.set(String(foto.id_foto), foto);
      const tarjeta = document.createElement('label');
      const opcion = document.createElement('input');
      opcion.type = 'radio';
      opcion.name = 'id_foto';
      opcion.value = foto.id_foto;
      const miniatura = document.createElement('img');
      miniatura.src = foto.imagen_url;
      miniatura.alt = '';
      miniatura.loading = 'lazy';
      const descripcion = document.createElement('span');
      descripcion.textContent = foto.descripcion;
      tarjeta.append(opcion, miniatura, descripcion);
      galeriaPortada.append(tarjeta);
    }
    if (fotosSugeridasPortada.size === 0) {
      galeriaPortada.textContent = sugerencias === null
        ? 'No se pudieron cargar las fotos de Comunicaciones.'
        : 'Todavía no hay fotos disponibles en Comunicaciones.';
    }
    espacioPortada.replaceChildren();
    const grupos = new Map();
    for (const { clave, seccion, nombre } of espacios) {
      if (!grupos.has(seccion)) {
        const grupo = document.createElement('optgroup');
        grupo.label = seccion;
        grupos.set(seccion, grupo);
        espacioPortada.append(grupo);
      }
      grupos.get(seccion).append(new Option(nombre, clave));
    }
    if ([...espacioPortada.options].some((opcion) => opcion.value === claveAnterior)) {
      espacioPortada.value = claveAnterior;
    }
    mostrarEspacioPortada();
    editorPortada.hidden = false;
    mensajePortada.textContent = '';
  } catch (error) {
    mensajePortada.textContent = error.message;
  } finally {
    controlesPortada.disabled = false;
  }
}

espacioPortada.addEventListener('change', () => {
  mensajePortada.textContent = '';
  mostrarEspacioPortada();
});

galeriaPortada.addEventListener('change', () => {
  archivoPortada.value = '';
  limpiarPreviewPortada();
  const foto = fotosSugeridasPortada.get(fotoElegidaPortada()?.value);
  if (foto) {
    mensajePortada.textContent = '';
    descripcionPortada.value = foto.descripcion;
    mostrarPreviewPortada(previewPortada, foto.imagen_url);
  }
});

archivoPortada.addEventListener('change', () => {
  limpiarPreviewPortada();
  const archivo = archivoPortada.files[0];
  if (!archivo) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > 4 * 1024 * 1024) {
    archivoPortada.value = '';
    mensajePortada.textContent = 'Selecciona un JPG, PNG o WebP de máximo 4 MB.';
    return;
  }
  if (fotoElegidaPortada()) descripcionPortada.value = '';
  limpiarSugerenciaPortada();
  mensajePortada.textContent = '';
  urlArchivoPortada = URL.createObjectURL(archivo);
  mostrarPreviewPortada(previewPortada, urlArchivoPortada);
});

editorPortada.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const clave = espacioPortada.value;
  const sugerencia = fotoElegidaPortada();
  const datos = new FormData();
  if (archivoPortada.files[0]) datos.set('imagen', archivoPortada.files[0]);
  else if (sugerencia) datos.set('id_foto', sugerencia.value);
  else {
    mensajePortada.textContent = 'Elige una foto sugerida o carga una imagen nueva.';
    return;
  }
  datos.set('descripcion', descripcionPortada.value);
  controlesPortada.disabled = true;
  mensajePortada.textContent = 'Publicando imagen…';
  try {
    const foto = await apiFetch('/api/public/portada/' + encodeURIComponent(clave), {
      method: 'PUT',
      body: datos,
    });
    fotosPortada.set(clave, foto);
    mostrarEspacioPortada();
    mensajePortada.textContent = 'Imagen publicada en la portada.';
  } catch (error) {
    mensajePortada.textContent = error.message;
  } finally {
    controlesPortada.disabled = false;
  }
});

restaurarPortada.addEventListener('click', async () => {
  const clave = espacioPortada.value;
  controlesPortada.disabled = true;
  mensajePortada.textContent = 'Restaurando imagen…';
  try {
    await apiFetch('/api/public/portada/' + encodeURIComponent(clave), { method: 'DELETE' });
    fotosPortada.delete(clave);
    mostrarEspacioPortada();
    mensajePortada.textContent = 'Se restauró la imagen original.';
  } catch (error) {
    mensajePortada.textContent = error.message;
  } finally {
    controlesPortada.disabled = false;
  }
});
