redirigirSiLogueado();

const form = document.getElementById('form-registro');
const mensaje = document.getElementById('mensaje');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensaje.className = 'mensaje';

  const datos = {
    nombre1: document.getElementById('nombre1').value.trim(),
    nombre2: document.getElementById('nombre2').value.trim(),
    apellido1: document.getElementById('apellido1').value.trim(),
    apellido2: document.getElementById('apellido2').value.trim(),
    cedula: document.getElementById('cedula').value.trim(),
    fecha_nacimiento: document.getElementById('fecha_nacimiento').value,
    correo: document.getElementById('correo').value.trim(),
    celular: document.getElementById('celular').value.trim(),
    usuario: document.getElementById('usuario').value.trim(),
    password: document.getElementById('password').value,
  };

  try {
    const data = await apiFetch('/api/auth/registrar', {
      method: 'POST',
      body: JSON.stringify(datos),
    });

    mensaje.textContent = data.mensaje;
    mensaje.className = 'mensaje exito';
    form.reset();
    form.hidden = true;
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
});
