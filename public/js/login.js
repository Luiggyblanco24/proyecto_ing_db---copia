redirigirSiLogueado();

const form = document.getElementById('form-login');
const mensaje = document.getElementById('mensaje');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensaje.className = 'mensaje';

  const usuario = document.getElementById('usuario').value.trim();
  const password = document.getElementById('password').value;

  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, password }),
    });

    setToken(data.token);
    window.location.href = '/dashboard.html';
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
});
