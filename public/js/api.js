// Helpers compartidos para consumir la API

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function cerrarSesion() {
  const token = getToken();
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    }).catch(() => {});
  }
  localStorage.removeItem('token');
  window.location.href = '/';
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && token) {
      localStorage.removeItem('token');
      window.location.assign('/login.html?sesion=expirada');
    }
    throw new Error(data.error || 'Error en la petición');
  }
  return data;
}

// Si hay token, redirige al panel (evita volver a login estando logueado)
function redirigirSiLogueado() {
  if (getToken()) window.location.href = '/dashboard.html';
}
