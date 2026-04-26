/**
 * Seed script for UniGear database.
 * Run: node database/seed.js
 * Requires DATABASE_URL env variable or .env file in app/
 *
 * Inserta: categorías, modelos de material (con condiciones de uso),
 * unidades físicas por modelo, usuarios demo, solicitudes/préstamos
 * de ejemplo, sanción y pago de muestra, y notificaciones.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../app/src/.env') });
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

// Crea N unidades físicas por modelo, con código de inventario derivado
// (ej. PORT-014 + sufijo -01..-N) y los primeros K marcados como prestados/etc
function unidadesPara(modelo, total, prestadas = 0, averiadas = 0, mantenimiento = 0) {
  const unidades = [];
  for (let i = 1; i <= total; i++) {
    let estado = 'disponible';
    if (i <= prestadas) estado = 'prestada';
    else if (i <= prestadas + averiadas) estado = 'averiada';
    else if (i <= prestadas + averiadas + mantenimiento) estado = 'mantenimiento';
    unidades.push({
      codigo_inventario: `${modelo.codigo_modelo}-${String(i).padStart(2, '0')}`,
      estado,
    });
  }
  return unidades;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ================================================================
    // USUARIOS
    // ================================================================
    const users = [
      { name: 'Ana García',    email: 'ana.garcia@univ.edu',    role: 'estudiante',       password: '123', telefono: '+34 612 345 678', bio: 'Estudiante de Ingeniería del Software.' },
      { name: 'Carlos Pérez',  email: 'carlos.perez@univ.edu',  role: 'profesor',         password: '123', telefono: '+34 611 222 333', bio: 'Profesor del Departamento de Sistemas Informáticos.' },
      { name: 'Laura Gómez',   email: 'laura.gomez@univ.edu',   role: 'personal_gestion', password: '123', telefono: '+34 622 444 555', bio: 'Personal de gestión de inventario.' },
      { name: 'Roberto Díaz',  email: 'roberto.diaz@univ.edu',  role: 'mantenimiento',    password: '123', telefono: '+34 633 666 777', bio: 'Técnico de mantenimiento.' },
    ];

    const userIds = {};
    for (const u of users) {
      const { hash, salt } = hashPassword(u.password);
      const res = await client.query(`
        INSERT INTO usuarios (nombre_completo, email_institucional, password_hash, password_salt, telefono, bio, email_verificado)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        ON CONFLICT (email_institucional) DO UPDATE
          SET nombre_completo = EXCLUDED.nombre_completo,
              password_hash   = EXCLUDED.password_hash,
              password_salt   = EXCLUDED.password_salt,
              telefono        = EXCLUDED.telefono,
              bio             = EXCLUDED.bio
        RETURNING id
      `, [u.name, u.email, hash, salt, u.telefono, u.bio]);
      userIds[u.role] = res.rows[0].id;

      const roleRes = await client.query('SELECT id FROM roles WHERE nombre = $1', [u.role]);
      if (roleRes.rows.length > 0) {
        await client.query(`
          INSERT INTO usuario_roles (usuario_id, rol_id)
          VALUES ($1, $2)
          ON CONFLICT (usuario_id, rol_id) DO NOTHING
        `, [res.rows[0].id, roleRes.rows[0].id]);
      }
    }
    console.log('✓ Usuarios sembrados:', Object.keys(userIds).length);

    // ================================================================
    // CATEGORÍAS (alineadas con chips del frontend)
    // ================================================================
    const categorias = [
      { nombre: 'Informática',  descripcion: 'Portátiles, monitores y periféricos',  icono: 'laptop' },
      { nombre: 'Audio',        descripcion: 'Micrófonos, auriculares y altavoces',   icono: 'mic' },
      { nombre: 'Vídeo',        descripcion: 'Cámaras, proyectores y trípodes',       icono: 'camera' },
      { nombre: 'Herramientas', descripcion: 'Material de taller y prácticas',        icono: 'tools' },
      { nombre: 'Deporte',      descripcion: 'Material deportivo del pabellón',       icono: 'ball' },
    ];

    const catIds = {};
    for (const c of categorias) {
      const res = await client.query(`
        INSERT INTO categorias (nombre, descripcion, icono)
        VALUES ($1, $2, $3)
        ON CONFLICT (nombre) DO UPDATE
          SET descripcion = EXCLUDED.descripcion,
              icono       = EXCLUDED.icono
        RETURNING id
      `, [c.nombre, c.descripcion, c.icono]);
      catIds[c.nombre] = res.rows[0].id;
    }
    console.log('✓ Categorías sembradas:', Object.keys(catIds).length);

    // ================================================================
    // MODELOS DE MATERIAL (los 22 del listado del frontend)
    // ================================================================
    const modelos = [
      // Informática
      { codigo_modelo: 'PORT-014', nombre: 'MacBook Pro 14"',          categoria: 'Informática',  icono: 'laptop',     plazo: 7,  popularidad: 142,
        descripcion: 'Equipo Apple M3 Pro con 18 GB de RAM y 512 GB de almacenamiento. Ideal para edición de vídeo, desarrollo y trabajos académicos exigentes. Hasta 18 horas de autonomía para sesiones largas en biblioteca.',
        condiciones: ['Cargador MagSafe USB-C incluido', 'Adaptador USB-C → HDMI bajo petición', 'Recogida en conserjería de tu facultad', 'No se permite cambio de SO'],
        unidades: unidadesPara({ codigo_modelo: 'PORT-014' }, 8, 2) },
      { codigo_modelo: 'TAB-006', nombre: 'iPad Pro 11"',              categoria: 'Informática',  icono: 'tablet',     plazo: 5,  popularidad: 98,
        descripcion: 'Tablet con chip M2, pantalla Liquid Retina y compatibilidad con Apple Pencil de 2ª generación. Pensada para apuntes, dibujo técnico y presentaciones interactivas.',
        condiciones: ['Apple Pencil incluido', 'Funda con teclado bajo disponibilidad', 'Recogida en conserjería'],
        unidades: unidadesPara({ codigo_modelo: 'TAB-006' }, 6, 2) },
      { codigo_modelo: 'MON-004', nombre: 'Monitor Dell 27" 4K',       categoria: 'Informática',  icono: 'monitor',    plazo: 14, popularidad: 54,
        descripcion: 'Monitor IPS 4K UHD con cobertura sRGB del 99 %, ideal para diseño y edición. Conexiones HDMI, DisplayPort y USB-C con carga.',
        condiciones: ['Cable HDMI y DP incluidos', 'No se incluye soporte adicional', 'Retirar y entregar en sala A-103'],
        unidades: unidadesPara({ codigo_modelo: 'MON-004' }, 4, 2, 1) },
      { codigo_modelo: 'INF-031', nombre: 'Teclado mecánico Keychron', categoria: 'Informática',  icono: 'keyboard',   plazo: 7,  popularidad: 42,
        descripcion: 'Teclado inalámbrico bluetooth con switches Brown. Compatible con macOS, Windows y Linux. Perfecto si trabajas largas horas escribiendo código o redacciones.',
        condiciones: ['Cable USB-C incluido', 'Pilas no necesarias (batería interna)'],
        unidades: unidadesPara({ codigo_modelo: 'INF-031' }, 8, 0) },
      { codigo_modelo: 'INF-027', nombre: 'Ratón Logitech MX Master',  categoria: 'Informática',  icono: 'mouse',      plazo: 7,  popularidad: 37,
        descripcion: 'Ratón ergonómico con scroll magnético y botones laterales programables. Sincroniza con dos dispositivos a la vez.',
        condiciones: ['Cable de carga USB-C incluido'],
        unidades: unidadesPara({ codigo_modelo: 'INF-027' }, 6, 1) },
      { codigo_modelo: 'INF-052', nombre: 'Disco SSD externo 1TB',     categoria: 'Informática',  icono: 'drive',      plazo: 14, popularidad: 61,
        descripcion: 'Unidad externa NVMe USB-C de alta velocidad. Lectura hasta 1 050 MB/s. Útil para backups y proyectos pesados de vídeo o datos.',
        condiciones: ['Cable USB-C → USB-C incluido', 'Devolver vacío si contenía datos personales'],
        unidades: unidadesPara({ codigo_modelo: 'INF-052' }, 4, 1) },
      { codigo_modelo: 'INF-061', nombre: 'Adaptador USB-C multi',     categoria: 'Informática',  icono: 'cable',      plazo: 5,  popularidad: 26,
        descripcion: 'Hub USB-C con HDMI, lector SD, USB-A x 2 y carga PD. Pendiente de revisión técnica tras varias incidencias.',
        condiciones: ['Recogida temporalmente suspendida'],
        unidades: unidadesPara({ codigo_modelo: 'INF-061' }, 2, 0, 0, 2) },

      // Audio
      { codigo_modelo: 'AUD-008', nombre: 'Micrófono Rode NT-USB',     categoria: 'Audio',        icono: 'mic',        plazo: 7,  popularidad: 75,
        descripcion: 'Micrófono de condensador USB para grabación vocal y podcasts. Incluye trípode de mesa, antipop y cable de 6 m.',
        condiciones: ['Cable USB y soporte incluidos', 'No mojar la cápsula'],
        unidades: unidadesPara({ codigo_modelo: 'AUD-008' }, 3, 0) },
      { codigo_modelo: 'AUD-014', nombre: 'Auriculares Sony WH-1000',  categoria: 'Audio',        icono: 'headphones', plazo: 7,  popularidad: 88,
        descripcion: 'Auriculares inalámbricos con cancelación activa de ruido. Hasta 30 horas de autonomía. Cómodos para sesiones largas.',
        condiciones: ['Estuche rígido y cable jack incluidos', 'No usar bajo la lluvia'],
        unidades: unidadesPara({ codigo_modelo: 'AUD-014' }, 4, 3) },
      { codigo_modelo: 'AUD-022', nombre: 'Interfaz de audio Focusrite', categoria: 'Audio',      icono: 'mixer',      plazo: 14, popularidad: 41,
        descripcion: 'Interfaz USB con dos previos micro de baja distorsión. Ideal para grabar voz, guitarra o sintetizador con calidad de estudio.',
        condiciones: ['Cable USB-B incluido', 'Software de descarga vinculado a tu cuenta'],
        unidades: unidadesPara({ codigo_modelo: 'AUD-022' }, 2, 1) },
      { codigo_modelo: 'AUD-031', nombre: 'Altavoz Bluetooth JBL',     categoria: 'Audio',        icono: 'speaker',    plazo: 5,  popularidad: 52,
        descripcion: 'Altavoz portátil con resistencia al agua IP67 y hasta 12 horas de autonomía. Perfecto para presentaciones al aire libre.',
        condiciones: ['Cargador USB-C incluido'],
        unidades: unidadesPara({ codigo_modelo: 'AUD-031' }, 4, 0) },

      // Vídeo
      { codigo_modelo: 'VID-005', nombre: 'Cámara Sony A7 III',        categoria: 'Vídeo',        icono: 'camera',     plazo: 5,  popularidad: 119,
        descripcion: 'Cámara mirrorless full-frame de 24 MP con vídeo 4K. Incluye objetivo zoom 28-70mm y dos baterías.',
        condiciones: ['Tarjeta SD 64 GB incluida', 'Devolver con las baterías cargadas', 'Coste de sustitución alto: usar con cuidado'],
        unidades: unidadesPara({ codigo_modelo: 'VID-005' }, 4, 1) },
      { codigo_modelo: 'VID-011', nombre: 'Proyector Epson HD',        categoria: 'Vídeo',        icono: 'projector',  plazo: 3,  popularidad: 67,
        descripcion: 'Proyector 1080p con 3 600 lúmenes. Conexión HDMI y wireless. Adecuado para aulas medianas y grandes.',
        condiciones: ['Cable HDMI 5 m incluido', 'Mando a distancia incluido'],
        unidades: unidadesPara({ codigo_modelo: 'VID-011' }, 3, 2) },
      { codigo_modelo: 'VID-019', nombre: 'Trípode Manfrotto',         categoria: 'Vídeo',        icono: 'tripod',     plazo: 7,  popularidad: 31,
        descripcion: 'Trípode profesional con cabezal de bola y rótula fluida. Ideal para foto y vídeo. Soporta hasta 8 kg.',
        condiciones: ['Funda de transporte incluida'],
        unidades: unidadesPara({ codigo_modelo: 'VID-019' }, 6, 0) },
      { codigo_modelo: 'VID-023', nombre: 'Gimbal DJI Ronin',          categoria: 'Vídeo',        icono: 'gimbal',     plazo: 5,  popularidad: 58,
        descripcion: 'Estabilizador para cámaras mirrorless de hasta 4,5 kg. Permite seguir movimientos suaves en grabaciones cinematográficas.',
        condiciones: ['Estuche rígido y baterías incluidas', 'Calibrar antes de cada uso'],
        unidades: unidadesPara({ codigo_modelo: 'VID-023' }, 2, 1) },
      { codigo_modelo: 'VID-029', nombre: 'GoPro Hero 12',             categoria: 'Vídeo',        icono: 'gopro',      plazo: 5,  popularidad: 82,
        descripcion: 'Cámara de acción con grabación 5.3K, estabilización HyperSmooth y resistencia al agua. Trae soporte y baterías extra.',
        condiciones: ['Microsd 64 GB incluida', 'Devolver limpia y seca'],
        unidades: unidadesPara({ codigo_modelo: 'VID-029' }, 4, 0) },

      // Herramientas
      { codigo_modelo: 'HER-007', nombre: 'Taladro Bosch',             categoria: 'Herramientas', icono: 'drill',      plazo: 3,  popularidad: 24,
        descripcion: 'Taladro percutor 18 V con dos baterías y maletín. Incluye juego de brocas para metal, madera y pared.',
        condiciones: ['Maletín y cargador incluidos', 'Solo uso académico autorizado'],
        unidades: unidadesPara({ codigo_modelo: 'HER-007' }, 3, 0) },
      { codigo_modelo: 'HER-012', nombre: 'Kit destornilladores',      categoria: 'Herramientas', icono: 'tools',      plazo: 7,  popularidad: 33,
        descripcion: 'Kit de 32 piezas con destornilladores Phillips, planos, Torx y precisión. Ideal para prácticas de electrónica y mantenimiento.',
        condiciones: ['Estuche enrollable incluido'],
        unidades: unidadesPara({ codigo_modelo: 'HER-012' }, 6, 0) },
      { codigo_modelo: 'HER-018', nombre: 'Multímetro digital',        categoria: 'Herramientas', icono: 'multimeter', plazo: 5,  popularidad: 18,
        descripcion: 'Multímetro auto-rango con medición de tensión, corriente, resistencia y continuidad. Pantalla retroiluminada.',
        condiciones: ['Sondas y pilas incluidas', 'Comprobar antes de uso en alta tensión'],
        unidades: unidadesPara({ codigo_modelo: 'HER-018' }, 2, 0, 0, 2) },

      // Deporte
      { codigo_modelo: 'DEP-002', nombre: 'Balón de baloncesto',       categoria: 'Deporte',      icono: 'ball',       plazo: 3,  popularidad: 44,
        descripcion: 'Balón oficial talla 7 para entrenamiento y partidos amistosos.',
        condiciones: ['Recogida en pabellón'],
        unidades: unidadesPara({ codigo_modelo: 'DEP-002' }, 8, 1) },
      { codigo_modelo: 'DEP-009', nombre: 'Raqueta de pádel',          categoria: 'Deporte',      icono: 'racket',     plazo: 3,  popularidad: 39,
        descripcion: 'Raqueta de pádel intermedia, balance medio. Pala de carbono para mayor durabilidad.',
        condiciones: ['Funda incluida', 'Pelotas no incluidas'],
        unidades: unidadesPara({ codigo_modelo: 'DEP-009' }, 6, 2) },
      { codigo_modelo: 'DEP-014', nombre: 'Set de pesas rusas',        categoria: 'Deporte',      icono: 'weights',    plazo: 7,  popularidad: 21,
        descripcion: 'Juego de kettlebells 8 kg + 12 kg + 16 kg. Mango ergonómico, ideal para entrenamiento funcional.',
        condiciones: ['Devolver limpias'],
        unidades: unidadesPara({ codigo_modelo: 'DEP-014' }, 2, 1) },
    ];

    const modeloIds = {};       // codigo_modelo → id
    const unidadIdsPorModelo = {}; // codigo_modelo → [ids]
    let totalUnidades = 0;

    for (const m of modelos) {
      const res = await client.query(`
        INSERT INTO materiales (categoria_id, nombre, descripcion, codigo_modelo, icono, plazo_max_dias, popularidad)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [catIds[m.categoria], m.nombre, m.descripcion, m.codigo_modelo, m.icono, m.plazo, m.popularidad]);
      const materialId = res.rows[0].id;
      modeloIds[m.codigo_modelo] = materialId;

      // Condiciones de uso
      for (let i = 0; i < m.condiciones.length; i++) {
        await client.query(`
          INSERT INTO material_condiciones_uso (material_id, orden, texto)
          VALUES ($1, $2, $3)
        `, [materialId, i, m.condiciones[i]]);
      }

      // Unidades físicas
      unidadIdsPorModelo[m.codigo_modelo] = [];
      for (const u of m.unidades) {
        const ures = await client.query(`
          INSERT INTO unidades_material (material_id, codigo_inventario, estado)
          VALUES ($1, $2, $3::estado_material)
          RETURNING id
        `, [materialId, u.codigo_inventario, u.estado]);
        unidadIdsPorModelo[m.codigo_modelo].push(ures.rows[0].id);
        totalUnidades++;
      }
    }
    console.log(`✓ Modelos sembrados: ${modelos.length} (${totalUnidades} unidades físicas)`);

    // ================================================================
    // SOLICITUDES Y PRÉSTAMOS DE EJEMPLO
    // ================================================================
    // Estudiante Ana → préstamo activo de MacBook (PORT-014-01) y Cámara Sony (VID-005-01)
    const sol1 = await client.query(`
      INSERT INTO solicitudes (usuario_id, material_id, fecha_inicio, fecha_fin, estado, motivo, fecha_resolucion, revisado_por)
      VALUES ($1, $2, '2026-04-22', '2026-04-29', 'aprobada', 'Trabajo de fin de grado: edición de vídeo del proyecto', NOW(), $3)
      RETURNING id
    `, [userIds['estudiante'], modeloIds['PORT-014'], userIds['personal_gestion']]);

    await client.query(`
      INSERT INTO prestamos (solicitud_id, usuario_id, unidad_material_id, fecha_entrega, fecha_devolucion_prevista, estado, registrado_por)
      VALUES ($1, $2, $3, '2026-04-22 10:00+02', '2026-04-29 18:00+02', 'activo', $4)
    `, [sol1.rows[0].id, userIds['estudiante'], unidadIdsPorModelo['PORT-014'][0], userIds['personal_gestion']]);

    const sol2 = await client.query(`
      INSERT INTO solicitudes (usuario_id, material_id, fecha_inicio, fecha_fin, estado, motivo, fecha_resolucion, revisado_por)
      VALUES ($1, $2, '2026-04-21', '2026-04-26', 'aprobada', 'Grabación audiovisual para asignatura de Multimedia', NOW(), $3)
      RETURNING id
    `, [userIds['estudiante'], modeloIds['VID-005'], userIds['personal_gestion']]);

    await client.query(`
      INSERT INTO prestamos (solicitud_id, usuario_id, unidad_material_id, fecha_entrega, fecha_devolucion_prevista, estado, registrado_por)
      VALUES ($1, $2, $3, '2026-04-21 09:30+02', '2026-04-26 18:00+02', 'activo', $4)
    `, [sol2.rows[0].id, userIds['estudiante'], unidadIdsPorModelo['VID-005'][0], userIds['personal_gestion']]);

    // Profesor Carlos → solicitud pendiente de proyector
    await client.query(`
      INSERT INTO solicitudes (usuario_id, material_id, fecha_inicio, fecha_fin, estado, motivo, prioridad)
      VALUES ($1, $2, '2026-05-02', '2026-05-02', 'pendiente', 'Clase magistral de Inteligencia Artificial', 'alta')
    `, [userIds['profesor'], modeloIds['VID-011']]);

    // Préstamo retrasado de taladro (PORT-014-02 ya estaba en estado 'prestada' por el seed inicial)
    const sol3 = await client.query(`
      INSERT INTO solicitudes (usuario_id, material_id, fecha_inicio, fecha_fin, estado, motivo, fecha_resolucion, revisado_por)
      VALUES ($1, $2, '2026-04-15', '2026-04-22', 'aprobada', 'Práctica de carpintería para proyecto integrador', NOW(), $3)
      RETURNING id
    `, [userIds['estudiante'], modeloIds['HER-007'], userIds['personal_gestion']]);

    await client.query(`
      INSERT INTO prestamos (solicitud_id, usuario_id, unidad_material_id, fecha_entrega, fecha_devolucion_prevista, estado, registrado_por)
      VALUES ($1, $2, $3, '2026-04-15 11:00+02', '2026-04-22 18:00+02', 'retrasado', $4)
    `, [sol3.rows[0].id, userIds['estudiante'], unidadIdsPorModelo['HER-007'][0], userIds['personal_gestion']]);

    console.log('✓ Solicitudes y préstamos de ejemplo sembrados');

    // ================================================================
    // SANCIÓN Y PAGO DE EJEMPLO
    // ================================================================
    // Sanción por retraso en taladro
    const sancion = await client.query(`
      INSERT INTO sanciones (usuario_id, prestamo_id, tipo, motivo, importe_centimos, creada_por)
      VALUES ($1,
              (SELECT id FROM prestamos WHERE solicitud_id = $2),
              'retraso', 'Devolución con retraso de 3 días — Taladro Bosch', 1250, $3)
      RETURNING id
    `, [userIds['estudiante'], sol3.rows[0].id, userIds['personal_gestion']]);

    // Pago histórico ya liquidado (otro retraso anterior)
    const conceptoSub = `Préstamo #${sol3.rows[0].id} · Taladro Bosch`;
    await client.query(`
      INSERT INTO pagos (usuario_id, sancion_id, concepto, concepto_sub, metodo, metodo_detalle, importe_centimos, estado, fecha_pago, stripe_payment_intent_id)
      VALUES ($1, $2, 'Sanción por retraso', $3,
              'tarjeta', 'Visa ····4242', 1250, 'pagado', NOW(), 'pi_demo_seed_001')
    `, [userIds['estudiante'], sancion.rows[0].id, conceptoSub]);

    console.log('✓ Sanción y pago de ejemplo sembrados');

    // ================================================================
    // NOTIFICACIONES
    // ================================================================
    const notificaciones = [
      {
        usuario_id: userIds['estudiante'],
        tipo: 'solicitud_aprobada',
        titulo: 'Solicitud aprobada',
        texto: 'Tu solicitud para el equipo "MacBook Pro 14\\"" ha sido aprobada. Pasa a recogerlo por conserjería.',
        leida: false,
        entidad_tipo: 'solicitud',
        entidad_id: sol1.rows[0].id,
        accion_url: '/solicitudes-prestamo/mis-solicitudes/mis_solicitudes.html',
      },
      {
        usuario_id: userIds['estudiante'],
        tipo: 'recordatorio_devolucion',
        titulo: 'Recordatorio de devolución',
        texto: 'Recuerda que debes devolver "Cámara Sony A7 III" mañana antes de las 18:00. Si necesitas más tiempo, solicita una prórroga.',
        leida: false,
        entidad_tipo: 'prestamo',
      },
      {
        usuario_id: userIds['estudiante'],
        tipo: 'sancion',
        titulo: 'Nueva sanción por retraso',
        texto: 'Se ha aplicado una sanción de 12,50 € por la devolución con retraso de "Taladro Bosch". Puedes pagarla desde tus sanciones.',
        leida: false,
        entidad_tipo: 'sancion',
        entidad_id: sancion.rows[0].id,
        accion_url: '/sanciones/mis-sanciones/mis_sanciones.html',
      },
      {
        usuario_id: userIds['estudiante'],
        tipo: 'general',
        titulo: 'Mantenimiento programado',
        texto: 'El sistema estará fuera de servicio este viernes de 22:00 a 24:00 por tareas de mantenimiento.',
        leida: true,
        entidad_tipo: null,
      },
      {
        usuario_id: userIds['profesor'],
        tipo: 'solicitud_creada',
        titulo: 'Solicitud registrada',
        texto: 'Tu solicitud para "Proyector Epson HD" ha sido registrada y está pendiente de revisión.',
        leida: false,
        entidad_tipo: 'solicitud',
      },
    ];

    for (const n of notificaciones) {
      await client.query(`
        INSERT INTO notificaciones (usuario_id, tipo, titulo, texto, canal, estado, leida, leida_at, entidad_tipo, entidad_id, accion_url, fecha_envio)
        VALUES ($1, $2::tipo_notificacion, $3, $4, 'in_app'::canal_notificacion, 'enviada'::estado_notificacion,
                $5, CASE WHEN $5 THEN NOW() ELSE NULL END, $6, $7, $8, NOW())
      `, [n.usuario_id, n.tipo, n.titulo, n.texto, n.leida, n.entidad_tipo, n.entidad_id || null, n.accion_url || null]);
    }
    console.log('✓ Notificaciones sembradas:', notificaciones.length);

    await client.query('COMMIT');
    console.log('\n✅ Base de datos sembrada correctamente.\n');
    console.log('Credenciales de prueba:');
    console.log('  Estudiante: ana.garcia@univ.edu / 123');
    console.log('  Profesor:   carlos.perez@univ.edu / 123');
    console.log('  Personal:   laura.gomez@univ.edu / 123');
    console.log('  Mant.:      roberto.diaz@univ.edu / 123\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en seed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
