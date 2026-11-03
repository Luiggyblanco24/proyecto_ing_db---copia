(() => {
  const MENSAJE_NO_DISPONIBLE = 'Esta funcionalidad no está disponible.';

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'chatbot-boton';
  boton.setAttribute('aria-label', 'Abrir asistente');
  boton.setAttribute('aria-expanded', 'false');
  boton.textContent = '💬';

  const panel = document.createElement('section');
  panel.className = 'chatbot-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Asistente SUTENS');
  panel.innerHTML = `
    <header class="chatbot-cabecera">
      <strong>Asistente SUTENS</strong>
      <button type="button" class="chatbot-cerrar" aria-label="Cerrar asistente">×</button>
    </header>
    <div class="chatbot-mensajes" role="log" aria-live="polite"></div>
    <form class="chatbot-form">
      <input type="text" maxlength="500" placeholder="Escribe tu pregunta..." aria-label="Mensaje" autocomplete="off" required />
      <button type="submit" class="btn btn-primario">Enviar</button>
    </form>
  `;

  const mensajes = panel.querySelector('.chatbot-mensajes');
  const formulario = panel.querySelector('.chatbot-form');
  const campo = formulario.querySelector('input');

  function agregarMensaje(texto, autor) {
    const burbuja = document.createElement('div');
    burbuja.className = `chatbot-mensaje chatbot-${autor}`;
    burbuja.textContent = texto;
    mensajes.append(burbuja);
    mensajes.scrollTop = mensajes.scrollHeight;
  }

  function alternar(abrir) {
    panel.hidden = !abrir;
    boton.setAttribute('aria-expanded', String(abrir));
    if (abrir) campo.focus();
  }

  boton.addEventListener('click', () => alternar(panel.hidden));
  panel.querySelector('.chatbot-cerrar').addEventListener('click', () => alternar(false));
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const texto = campo.value.trim();
    if (!texto) return;
    agregarMensaje(texto, 'usuario');
    campo.value = '';
    agregarMensaje(MENSAJE_NO_DISPONIBLE, 'bot');
  });

  agregarMensaje('Hola, soy el asistente de SUTENS. ¿En qué puedo ayudarte?', 'bot');
  document.body.append(boton, panel);
})();
