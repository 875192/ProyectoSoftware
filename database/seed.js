/**
 * Seed script for UniGear database.
 * Run: node database/seed.js
 * Requires DATABASE_URL env variable or .env file in app/
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../app/.env') });
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add motivo column if it doesn't exist
    await client.query(`
      ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS motivo TEXT
    `);

    // --- USERS ---
    const users = [
      { name: 'Ana García', email: 'ana.garcia@univ.edu', role: 'estudiante', password: '123' },
      { name: 'Carlos Pérez', email: 'carlos.perez@univ.edu', role: 'profesor', password: '123' },
      { name: 'Laura Gómez', email: 'laura.gomez@univ.edu', role: 'personal_gestion', password: '123' },
      { name: 'Roberto Díaz', email: 'roberto.diaz@univ.edu', role: 'mantenimiento', password: '123' },
    ];

    const userIds = {};
    for (const u of users) {
      const { hash, salt } = hashPassword(u.password);
      const res = await client.query(`
        INSERT INTO usuarios (nombre_completo, email_institucional, password_hash, password_salt)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email_institucional) DO UPDATE
          SET password_hash = EXCLUDED.password_hash,
              password_salt = EXCLUDED.password_salt
        RETURNING id
      `, [u.name, u.email, hash, salt]);
      userIds[u.role] = res.rows[0].id;

      // Assign role
      const roleRes = await client.query('SELECT id FROM roles WHERE nombre = $1', [u.role]);
      if (roleRes.rows.length > 0) {
        await client.query(`
          INSERT INTO usuario_roles (usuario_id, rol_id)
          VALUES ($1, $2)
          ON CONFLICT (usuario_id, rol_id) DO NOTHING
        `, [res.rows[0].id, roleRes.rows[0].id]);
      }
    }

    console.log('✓ Users seeded:', userIds);

    // --- CATEGORIES ---
    const categories = [
      { nombre: 'Portátiles', descripcion: 'Equipos portátiles para desarrollo y estudio' },
      { nombre: 'Cámaras', descripcion: 'Equipos de fotografía y vídeo' },
      { nombre: 'Proyectores', descripcion: 'Proyectores para presentaciones' },
      { nombre: 'Laboratorio', descripcion: 'Equipos de laboratorio científico' },
      { nombre: 'Audiovisual', descripcion: 'Equipos de sonido y vídeo' },
      { nombre: 'Electrónica', descripcion: 'Componentes y kits electrónicos' },
    ];

    const catIds = {};
    for (const c of categories) {
      const res = await client.query(`
        INSERT INTO categorias (nombre, descripcion)
        VALUES ($1, $2)
        ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion
        RETURNING id
      `, [c.nombre, c.descripcion]);
      catIds[c.nombre] = res.rows[0].id;
    }

    console.log('✓ Categories seeded:', catIds);

    // --- MATERIALS ---
    const materials = [
      // Portátiles Dell XPS 15 - 3 units (2 disponible, 1 prestado)
      { code: 'PORT-001', nombre: 'Portátil Dell XPS 15', desc: 'Intel Core i7, 16GB RAM, 512GB SSD. Ideal para programación pesada.', cat: 'Portátiles', estado: 'disponible' },
      { code: 'PORT-002', nombre: 'Portátil Dell XPS 15', desc: 'Intel Core i7, 16GB RAM, 512GB SSD. Ideal para programación pesada.', cat: 'Portátiles', estado: 'disponible' },
      { code: 'PORT-003', nombre: 'Portátil Dell XPS 15', desc: 'Intel Core i7, 16GB RAM, 512GB SSD. Ideal para programación pesada.', cat: 'Portátiles', estado: 'prestado' },
      // MacBook Pro M2 - 2 units (1 disponible, 1 reservado)
      { code: 'PORT-004', nombre: 'MacBook Pro M2', desc: 'Chip M2 Apple, 16GB RAM. Especial diseño y multimedia.', cat: 'Portátiles', estado: 'disponible' },
      { code: 'PORT-005', nombre: 'MacBook Pro M2', desc: 'Chip M2 Apple, 16GB RAM. Especial diseño y multimedia.', cat: 'Portátiles', estado: 'reservado' },
      // Cámara Canon EOS R5 - 3 units (2 disponible, 1 prestado)
      { code: 'CAM-001', nombre: 'Cámara Canon EOS R5', desc: 'Cámara mirrorless Full Frame 45MP. Incluye objetivo 24-105mm f/4.', cat: 'Cámaras', estado: 'disponible' },
      { code: 'CAM-002', nombre: 'Cámara Canon EOS R5', desc: 'Cámara mirrorless Full Frame 45MP. Incluye objetivo 24-105mm f/4.', cat: 'Cámaras', estado: 'disponible' },
      { code: 'CAM-003', nombre: 'Cámara Canon EOS R5', desc: 'Cámara mirrorless Full Frame 45MP. Incluye objetivo 24-105mm f/4.', cat: 'Cámaras', estado: 'prestado' },
      // Kit Arduino - 5 units (5 disponible)
      { code: 'ELEC-001', nombre: 'Kit Arduino Uno Rev3', desc: 'Placa base + sensores, cables puente y protoboard.', cat: 'Electrónica', estado: 'disponible' },
      { code: 'ELEC-002', nombre: 'Kit Arduino Uno Rev3', desc: 'Placa base + sensores, cables puente y protoboard.', cat: 'Electrónica', estado: 'disponible' },
      { code: 'ELEC-003', nombre: 'Kit Arduino Uno Rev3', desc: 'Placa base + sensores, cables puente y protoboard.', cat: 'Electrónica', estado: 'disponible' },
      { code: 'ELEC-004', nombre: 'Kit Arduino Uno Rev3', desc: 'Placa base + sensores, cables puente y protoboard.', cat: 'Electrónica', estado: 'disponible' },
      { code: 'ELEC-005', nombre: 'Kit Arduino Uno Rev3', desc: 'Placa base + sensores, cables puente y protoboard.', cat: 'Electrónica', estado: 'disponible' },
      // Microscopio - 4 units (0 disponible, 2 averiado, 2 mantenimiento)
      { code: 'LAB-001', nombre: 'Microscopio Binocular', desc: 'Aumentos 40x-1000x. Iluminación LED ajustable.', cat: 'Laboratorio', estado: 'averiado' },
      { code: 'LAB-002', nombre: 'Microscopio Binocular', desc: 'Aumentos 40x-1000x. Iluminación LED ajustable.', cat: 'Laboratorio', estado: 'averiado' },
      { code: 'LAB-003', nombre: 'Microscopio Binocular', desc: 'Aumentos 40x-1000x. Iluminación LED ajustable.', cat: 'Laboratorio', estado: 'mantenimiento' },
      { code: 'LAB-004', nombre: 'Microscopio Binocular', desc: 'Aumentos 40x-1000x. Iluminación LED ajustable.', cat: 'Laboratorio', estado: 'mantenimiento' },
      // Proyector Epson - 3 units (3 disponible)
      { code: 'PROY-001', nombre: 'Proyector Epson WXGA', desc: '3300 lúmenes. Conexión HDMI y VGA. Ligero y portable.', cat: 'Proyectores', estado: 'disponible' },
      { code: 'PROY-002', nombre: 'Proyector Epson WXGA', desc: '3300 lúmenes. Conexión HDMI y VGA. Ligero y portable.', cat: 'Proyectores', estado: 'disponible' },
      { code: 'PROY-003', nombre: 'Proyector Epson WXGA', desc: '3300 lúmenes. Conexión HDMI y VGA. Ligero y portable.', cat: 'Proyectores', estado: 'disponible' },
    ];

    const materialIds = {};
    for (const m of materials) {
      const res = await client.query(`
        INSERT INTO materiales (codigo_inventario, nombre, descripcion, categoria_id, estado)
        VALUES ($1, $2, $3, $4, $5::estado_material)
        ON CONFLICT (codigo_inventario) DO UPDATE
          SET nombre = EXCLUDED.nombre,
              descripcion = EXCLUDED.descripcion,
              estado = EXCLUDED.estado
        RETURNING id
      `, [m.code, m.nombre, m.desc, catIds[m.cat], m.estado]);

      if (!materialIds[m.nombre]) materialIds[m.nombre] = [];
      materialIds[m.nombre].push(res.rows[0].id);
    }

    console.log('✓ Materials seeded:', Object.keys(materialIds).length, 'types');

    // --- SAMPLE SOLICITUDES ---
    // Student has one finished and one approved request
    const portId = materialIds['Portátil Dell XPS 15'][2]; // the prestado one
    const camId = materialIds['Cámara Canon EOS R5'][2]; // the prestado one

    await client.query(`
      INSERT INTO solicitudes (usuario_id, material_id, fecha_inicio, fecha_fin, estado, motivo)
      VALUES ($1, $2, '2026-03-01', '2026-03-05', 'aprobada', 'Práctica de programación para TFG')
      ON CONFLICT DO NOTHING
    `, [userIds['estudiante'], portId]);

    await client.query(`
      INSERT INTO solicitudes (usuario_id, material_id, fecha_inicio, fecha_fin, estado, motivo)
      VALUES ($1, $2, '2026-03-10', '2026-03-12', 'aprobada', 'Grabación de vídeo corto para proyecto audiovisual')
      ON CONFLICT DO NOTHING
    `, [userIds['estudiante'], camId]);

    // Professor has a pending request
    const proyId = materialIds['Proyector Epson WXGA'][0];
    await client.query(`
      INSERT INTO solicitudes (usuario_id, material_id, fecha_inicio, fecha_fin, estado, motivo)
      VALUES ($1, $2, '2026-03-12', '2026-03-12', 'pendiente', 'Clase magistral de Inteligencia Artificial')
      ON CONFLICT DO NOTHING
    `, [userIds['profesor'], proyId]);

    console.log('✓ Sample solicitudes seeded');

    // --- SAMPLE NOTIFICATIONS ---
    const notifications = [
      {
        usuario_id: userIds['estudiante'],
        tipo: 'solicitud_aprobada',
        asunto: 'Solicitud Aprobada',
        mensaje: 'Tu solicitud para el equipo "Portátil Dell XPS 15" ha sido aprobada. Puedes pasar a recogerlo por el almacén.',
        leida: false,
        entidad_tipo: 'solicitud'
      },
      {
        usuario_id: userIds['estudiante'],
        tipo: 'recordatorio_devolucion',
        asunto: 'Recordatorio de devolución',
        mensaje: 'Recuerda que debes devolver "Kit Arduino Uno" mañana antes de las 14:00h. Si necesitas más tiempo, solicita una prórroga.',
        leida: false,
        entidad_tipo: 'solicitud'
      },
      {
        usuario_id: userIds['estudiante'],
        tipo: 'general',
        asunto: 'Mantenimiento programado',
        mensaje: 'El sistema estará fuera de servicio este viernes de 22:00 a 24:00 por tareas de mantenimiento en el servidor central.',
        leida: true,
        entidad_tipo: null
      },
      {
        usuario_id: userIds['profesor'],
        tipo: 'solicitud_creada',
        asunto: 'Solicitud Registrada',
        mensaje: 'Tu solicitud para "Proyector Epson WXGA" ha sido registrada y está pendiente de revisión.',
        leida: false,
        entidad_tipo: 'solicitud'
      },
      {
        usuario_id: userIds['profesor'],
        tipo: 'general',
        asunto: 'Mantenimiento programado',
        mensaje: 'El sistema estará fuera de servicio este viernes de 22:00 a 24:00 por tareas de mantenimiento en el servidor central.',
        leida: true,
        entidad_tipo: null
      },
    ];

    for (const n of notifications) {
      await client.query(`
        INSERT INTO notificaciones (usuario_id, tipo, asunto, mensaje, leida, entidad_tipo, estado)
        VALUES ($1, $2::tipo_notificacion, $3, $4, $5, $6, 'enviada'::estado_notificacion)
      `, [n.usuario_id, n.tipo, n.asunto, n.mensaje, n.leida, n.entidad_tipo]);
    }

    console.log('✓ Notifications seeded');

    await client.query('COMMIT');
    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest credentials:');
    console.log('  Estudiante: ana.garcia@univ.edu / 123');
    console.log('  Profesor:   carlos.perez@univ.edu / 123');
    console.log('  Personal:   laura.gomez@univ.edu / 123');
    console.log('  Mant.:      roberto.diaz@univ.edu / 123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
