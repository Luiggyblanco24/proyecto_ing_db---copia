if (!getToken()) {
  window.location.href = '/login.html';
}

document.getElementById('cerrar-sesion').addEventListener('click', (event) => {
  event.preventDefault();
  cerrarSesion();
});

document.getElementById('form-cambiar-contrasena').addEventListener('submit', async (event) => {
  event.preventDefault();
  const nuevaContrasena = document.getElementById('nueva-contrasena').value;
  const confirmarContrasena = document.getElementById('confirmar-contrasena').value;
  const mensaje = document.getElementById('mensaje');
  const boton = event.currentTarget.querySelector('[type="submit"]');
  mensaje.className = 'mensaje';

  if (nuevaContrasena !== confirmarContrasena) {
    mensaje.textContent = 'Las contraseñas no coinciden.';
    mensaje.className = 'mensaje error';
    return;
  }

  boton.disabled = true;
  try {
    const resultado = await apiFetch('/api/auth/cambiar-contrasena-temporal', {
      method: 'POST',
      body: JSON.stringify({ nuevaContrasena }),
    });
    setToken(resultado.token);
    mensaje.textContent = resultado.mensaje;
    mensaje.className = 'mensaje exito';
    window.location.href = '/dashboard.html';
  } catch (error) {
    mensaje.textContent = error.message;
    mensaje.className = 'mensaje error';
    boton.disabled = false;
  }
});
