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
    codigo: m.codigo_modelo,
    name: m.nombre,
    desc: m.descripcion,
    icon: m.icono,
    plazo: m.plazo_max_dias,
    category: m.categoria_nombre,
    categoriaId: m.categoria_id ? String(m.categoria_id) : null,
    stock: parseInt(m.stock) || 0,
    total: parseInt(m.total) || 0,
    popularidad: parseInt(m.popularidad) || 0,
    requierePago: !!m.requiere_pago,
    precioCaucionCentimos: m.precio_caucion_centimos != null ? parseInt(m.precio_caucion_centimos) : null,
    incidencias: parseInt(m.incidencias_recientes) || 0,
    estado: m.estado,
    condiciones: m.condiciones || [],
  };
}

function mapCategoria(c) {
  return {
    id: String(c.id),
    nombre: c.nombre,
    descripcion: c.descripcion,
    icono: c.icono,
    count: parseInt(c.total) || 0,
  };
}

function mapSolicitud(s) {
  return {
    id: String(s.id),
    userId: String(s.usuario_id),
    materialId: String(s.material_id),
    materialName: s.material_nombre,
    materialIcon: s.material_icono,
    materialCodigo: s.material_codigo,
    categoria: s.categoria_nombre,
    startDate: s.fecha_inicio,
    endDate: s.fecha_fin,
    fechaSolicitud: s.fecha_solicitud,
    status: s.estado,
    purpose: s.motivo || '',
    motivoRechazo: s.motivo_rechazo || null,
    posicionEspera: s.posicion_espera || null,
    prioridad: s.prioridad || 'normal',
  };
}

function mapPrestamo(p) {
  return {
    id: String(p.id),
    solicitudId: String(p.solicitud_id),
    userId: String(p.usuario_id),
    materialId: String(p.material_id),
    materialName: p.material_nombre,
    materialIcon: p.material_icono,
    materialCodigo: p.material_codigo,
    categoria: p.categoria_nombre,
    codigoInventario: p.codigo_inventario,
    fechaEntrega: p.fecha_entrega,
    fechaDevolucionPrevista: p.fecha_devolucion_prevista,
    fechaDevolucionReal: p.fecha_devolucion_real,
    estado: p.estado,
  };
}

function mapSancion(s) {
  return {
    id: String(s.id),
    tipo: s.tipo,
    motivo: s.motivo,
    importeCentimos: parseInt(s.importe_centimos) || 0,
    fechaInicio: s.fecha_inicio,
    fechaFin: s.fecha_fin,
    activa: !!s.activa,
    pagada: !!s.pagada,
    prestamoId: s.prestamo_id ? String(s.prestamo_id) : null,
    materialName: s.material_nombre,
  };
}

function mapPago(p) {
  const metodoMap = {
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    efectivo: 'Efectivo',
  };
  return {
    id: String(p.id),
    fecha: p.fecha_pago || p.created_at,
    concepto: p.concepto,
    conceptoSub: p.concepto_sub || '',
    metodo: p.metodo_detalle
      ? `${metodoMap[p.metodo] || p.metodo} ${p.metodo_detalle}`
      : (metodoMap[p.metodo] || p.metodo),
    importeCentimos: parseInt(p.importe_centimos) || 0,
    importe: (parseInt(p.importe_centimos) || 0) / 100,
    estado: p.estado,
    moneda: p.moneda,
    sancionId: p.sancion_id ? String(p.sancion_id) : null,
    solicitudId: p.solicitud_id ? String(p.solicitud_id) : null,
    reciboUrl: p.recibo_url || null,
    stripePaymentIntentId: p.stripe_payment_intent_id || null,
  };
}

function mapIncidencia(i) {
  return {
    id: String(i.id),
    tipo: i.tipo,
    descripcion: i.descripcion,
    fechaIncidencia: i.fecha_incidencia,
    resuelta: !!i.resuelta,
    fechaResolucion: i.fecha_resolucion,
    prestamoId: i.prestamo_id ? String(i.prestamo_id) : null,
    materialName: i.material_nombre,
  };
}

function mapNotificacion(n) {
  const typeMap = {
    solicitud_aprobada: 'solicitud',
    solicitud_rechazada: 'solicitud',
    solicitud_creada: 'solicitud',
    recordatorio_devolucion: 'devolucion',
    retraso: 'devolucion',
    incidencia: 'sancion',
    sancion: 'sancion',
    pago_realizado: 'sistema',
    pago_fallido: 'sistema',
    password_reset: 'sistema',
    general: 'sistema',
  };
  return {
    id: String(n.id),
    title: n.titulo,
    message: n.texto,
    tipo: n.tipo,
    category: typeMap[n.tipo] || 'sistema',
    createdAt: n.created_at,
    read: !!n.leida,
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

  // Materiales
  getMateriales: async () => {
    const data = await request('/materiales/catalogo');
    return data.map(mapMaterial);
  },

  getMaterial: async (id) => {
    const data = await request(`/materiales/${id}`);
    return mapMaterial(data);
  },

  getTopMaterial: async () => {
    const data = await request('/materiales/top');
    return mapMaterial(data);
  },

  // Categorías
  getCategorias: async () => {
    const data = await request('/categorias');
    return data.map(mapCategoria);
  },

  // Solicitudes
  getSolicitudes: async (usuarioId) => {
    const data = await request(`/solicitudes?usuario_id=${usuarioId}`);
    return data.map(mapSolicitud);
  },

  createSolicitud: async ({ userId, materialId, materialName, startDate, endDate, purpose, prioridad, stripePaymentIntentId }) => {
    const data = await request('/solicitudes', {
      method: 'POST',
      body: JSON.stringify({
        usuario_id: parseInt(userId),
        material_id: materialId ? parseInt(materialId) : undefined,
        material_nombre: materialName,
        fecha_inicio: startDate,
        fecha_fin: endDate,
        motivo: purpose,
        prioridad: prioridad || null,
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

  // Préstamos
  getPrestamos: async (usuarioId) => {
    const data = await request(`/prestamos?usuario_id=${usuarioId}`);
    return data.map(mapPrestamo);
  },

  getProximosVencimientos: async (usuarioId, limit = 5) => {
    const data = await request(`/prestamos/proximos?usuario_id=${usuarioId}&limit=${limit}`);
    return data.map(mapPrestamo);
  },

  getEstadisticasMensuales: async (usuarioId) => {
    return request(`/prestamos/estadisticas/mensual?usuario_id=${usuarioId}`);
  },

  // Sanciones
  getSanciones: async (usuarioId) => {
    const data = await request(`/sanciones?usuario_id=${usuarioId}`);
    return data.map(mapSancion);
  },

  getSancion: async (id) => {
    const data = await request(`/sanciones/${id}`);
    return mapSancion(data);
  },

  // Pagos
  getPagos: async (usuarioId) => {
    const data = await request(`/pagos?usuario_id=${usuarioId}`);
    return data.map(mapPago);
  },

  pagarSancion: async ({ sancionId, metodoDetalle, stripePaymentIntentId }) => {
    const data = await request('/pagos/sancion', {
      method: 'POST',
      body: JSON.stringify({
        sancion_id: parseInt(sancionId),
        metodo_detalle: metodoDetalle || null,
        stripe_payment_intent_id: stripePaymentIntentId || null,
      }),
    });
    return { pago: mapPago(data.pago), sancionId: String(data.sancion_id) };
  },

  // Incidencias
  getIncidencias: async (usuarioId) => {
    const data = await request(`/incidencias?usuario_id=${usuarioId}`);
    return data.map(mapIncidencia);
  },

  createIncidencia: async ({ usuarioId, prestamoId, tipo, descripcion }) => {
    const data = await request('/incidencias', {
      method: 'POST',
      body: JSON.stringify({
        usuario_id: parseInt(usuarioId),
        prestamo_id: parseInt(prestamoId),
        tipo,
        descripcion,
      }),
    });
    return mapIncidencia(data);
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

  deleteNotificacion: async (id, usuarioId) => {
    return request(`/notificaciones/${id}?usuario_id=${usuarioId}`, {
      method: 'DELETE',
    });
  },

  // Perfil + Dashboard
  getProfile: async (id) => {
    return request(`/usuarios/${id}`);
  },

  getDashboard: async (id) => {
    return request(`/usuarios/${id}/dashboard`);
  },

  updateProfile: async (id, updates) => {
    return request(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  updatePassword: async (id, currentPassword, newPassword) => {
    return request(`/usuarios/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password_actual: currentPassword, password_nueva: newPassword }),
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
