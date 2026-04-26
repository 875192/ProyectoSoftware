const API_BASE = 'http://localhost:3000';

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Error en la petición');
  }
  return res.json();
}

function mapMaterial(m) {
  return {
    id: String(m.id),
    name: m.nombre,
    desc: m.descripcion,
    category: m.categoria_nombre,
    stock: parseInt(m.stock),
    total: parseInt(m.total),
  };
}

function mapSolicitud(s) {
  return {
    id: String(s.id),
    odId: String(s.id),
    userId: String(s.usuario_id),
    itemId: String(s.material_id),
    startDate: s.fecha_inicio,
    endDate: s.fecha_fin,
    status: s.estado,
    purpose: s.motivo || '',
    materialName: s.material_nombre,
  };
}

function formatRelativeDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hoy, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  if (days === 1) return `Ayer, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  if (days < 7) return `Hace ${days} días`;
  return date.toLocaleDateString('es-ES');
}

function mapNotificacion(n) {
  const typeMap = {
    solicitud_aprobada: 'success',
    solicitud_rechazada: 'alert',
    solicitud_creada: 'info',
    recordatorio_devolucion: 'warning',
    retraso: 'alert',
    incidencia: 'warning',
    sancion: 'alert',
    general: 'info',
  };
  return {
    id: String(n.id),
    title: n.asunto,
    message: n.mensaje,
    date: formatRelativeDate(n.created_at),
    type: typeMap[n.tipo] || 'info',
    read: n.leida,
    entityType: n.entidad_tipo,
    entityId: n.entidad_id ? String(n.entidad_id) : null,
  };
}

export const api = {
  // Auth
  login: async (email, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return {
      id: String(data.id),
      name: data.nombre_completo,
      email: data.email_institucional,
      role: data.rol,
    };
  },

  register: async ({ nombre_completo, email, password, rol }) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nombre_completo, email, password, rol }),
    });
    return {
      id: String(data.id),
      name: data.nombre_completo,
      email: data.email_institucional,
      role: data.rol,
    };
  },


  // Materiales (catalog - grouped with stock)
  getMateriales: async () => {
    const data = await request('/materiales/catalogo');
    return data.map(mapMaterial);
  },

  // Solicitudes
  getSolicitudes: async (usuarioId) => {
    const data = await request(`/solicitudes?usuario_id=${usuarioId}`);
    return data.map(mapSolicitud);
  },

  createSolicitud: async ({ userId, materialName, startDate, endDate, purpose, stripePaymentIntentId }) => {
    const data = await request('/solicitudes', {
      method: 'POST',
      body: JSON.stringify({
        usuario_id: parseInt(userId),
        material_nombre: materialName,
        fecha_inicio: startDate,
        fecha_fin: endDate,
        motivo: purpose,
        stripe_payment_intent_id: stripePaymentIntentId || null,
      }),
    });
    return mapSolicitud(data);
  },

  cancelSolicitud: async (id, usuarioId) => {
    const data = await request(`/solicitudes/${id}/cancelar`, {
      method: 'PUT',
      body: JSON.stringify({ usuario_id: parseInt(usuarioId) }),
    });
    return mapSolicitud(data);
  },

  // Notificaciones
  getNotificaciones: async (usuarioId) => {
    const data = await request(`/notificaciones?usuario_id=${usuarioId}`);
    return data.map(mapNotificacion);
  },

  markNotificacionRead: async (id, usuarioId) => {
    return request(`/notificaciones/${id}/leer`, {
      method: 'PUT',
      body: JSON.stringify({ usuario_id: parseInt(usuarioId) }),
    });
  },

  markAllNotificacionesRead: async (usuarioId) => {
    return request('/notificaciones/leer-todas', {
      method: 'PUT',
      body: JSON.stringify({ usuario_id: parseInt(usuarioId) }),
    });
  },

  // Profile
  updateProfile: async (id, { phone, address }) => {
    return request(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ telefono: phone, direccion: address }),
    });
  },

  updatePassword: async (id, currentPassword, newPassword) => {
    return request(`/usuarios/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password_actual: currentPassword, password_nueva: newPassword }),
    });
  },

  updateProfile: async (id, updates) => {
    return request(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Pagos (Stripe)
  getStripeConfig: async () => {
    return request('/pagos/config');
  },

  createPaymentIntent: async (amount) => {
    return request('/pagos/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  createCheckoutSession: async ({ usuarioId, materialNombre, fechaInicio, fechaFin, motivo }) => {
    return request('/pagos/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        usuario_id: parseInt(usuarioId),
        material_nombre: materialNombre,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        motivo: motivo || '',
      }),
    });
  },

  verifyCheckoutSession: async (sessionId) => {
    return request(`/pagos/verify-session?session_id=${encodeURIComponent(sessionId)}`);
  },
};
