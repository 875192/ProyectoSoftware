BEGIN;

-- =====================================================================
-- ENUMs
-- =====================================================================

CREATE TYPE estado_material AS ENUM (
    'disponible',
    'prestada',
    'averiada',
    'mantenimiento',
    'fuera_servicio',
    'dada_de_baja'
);

CREATE TYPE estado_solicitud AS ENUM (
    'pendiente',
    'aprobada',
    'rechazada',
    'cancelada',
    'en_espera',
    'expirada'
);

CREATE TYPE estado_prestamo AS ENUM (
    'pendiente',
    'activo',
    'retrasado',
    'finalizado',
    'cancelado'
);

CREATE TYPE prioridad_solicitud AS ENUM (
    'normal',
    'alta'
);

CREATE TYPE tipo_incidencia AS ENUM (
    'danio',
    'averia',
    'mantenimiento',
    'revision',
    'otro'
);

CREATE TYPE tipo_sancion AS ENUM (
    'retraso',
    'danio',
    'reposicion',
    'administrativa',
    'otra'
);

CREATE TYPE tipo_notificacion AS ENUM (
    'solicitud_creada',
    'solicitud_aprobada',
    'solicitud_rechazada',
    'recordatorio_devolucion',
    'retraso',
    'incidencia',
    'sancion',
    'pago_realizado',
    'pago_fallido',
    'password_reset',
    'general'
);

CREATE TYPE estado_notificacion AS ENUM (
    'pendiente',
    'enviada',
    'fallida'
);

CREATE TYPE canal_notificacion AS ENUM (
    'email',
    'in_app',
    'push'
);

CREATE TYPE estado_pago AS ENUM (
    'pendiente',
    'pagado',
    'fallido',
    'reembolsado',
    'cancelado'
);

CREATE TYPE metodo_pago AS ENUM (
    'tarjeta',
    'transferencia',
    'efectivo'
);

-- =====================================================================
-- Tablas base: roles, usuarios
-- =====================================================================

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email_institucional VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    telefono VARCHAR(20),
    bio TEXT,
    avatar_url TEXT,
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    bloqueado_manual BOOLEAN NOT NULL DEFAULT FALSE,
    intentos_fallidos INTEGER NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
    bloqueado_hasta TIMESTAMPTZ,
    ultimo_login_at TIMESTAMPTZ,
    reset_token TEXT,
    reset_token_expiry TIMESTAMPTZ,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE usuario_roles (
    usuario_id BIGINT NOT NULL,
    rol_id BIGINT NOT NULL,
    asignado_por BIGINT,
    asignado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (usuario_id, rol_id),
    CONSTRAINT fk_usuario_roles_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_roles_rol
        FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_usuario_roles_asignado_por
        FOREIGN KEY (asignado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE preferencias_notificacion_usuario (
    usuario_id BIGINT PRIMARY KEY,
    email_solicitudes BOOLEAN NOT NULL DEFAULT TRUE,
    email_recordatorios BOOLEAN NOT NULL DEFAULT TRUE,
    email_incidencias BOOLEAN NOT NULL DEFAULT TRUE,
    email_sanciones BOOLEAN NOT NULL DEFAULT TRUE,
    email_marketing BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_preferencias_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- =====================================================================
-- Catálogo: categorías, materiales (modelos), unidades físicas
-- =====================================================================

CREATE TABLE categorias (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    icono VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE materiales (
    id BIGSERIAL PRIMARY KEY,
    categoria_id BIGINT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    codigo_modelo VARCHAR(50) NOT NULL UNIQUE,
    icono VARCHAR(50) NOT NULL DEFAULT 'box',
    plazo_max_dias SMALLINT NOT NULL DEFAULT 7
        CHECK (plazo_max_dias BETWEEN 1 AND 365),
    popularidad INTEGER NOT NULL DEFAULT 0 CHECK (popularidad >= 0),
    requiere_pago BOOLEAN NOT NULL DEFAULT FALSE,
    precio_caucion_centimos INTEGER CHECK (precio_caucion_centimos IS NULL OR precio_caucion_centimos >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_materiales_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT
);

CREATE TABLE unidades_material (
    id BIGSERIAL PRIMARY KEY,
    material_id BIGINT NOT NULL,
    codigo_inventario VARCHAR(50) NOT NULL UNIQUE,
    numero_serie VARCHAR(100),
    estado estado_material NOT NULL DEFAULT 'disponible',
    ubicacion VARCHAR(120),
    observaciones TEXT,
    fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_baja DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_unidades_material
        FOREIGN KEY (material_id) REFERENCES materiales(id) ON DELETE RESTRICT,
    CONSTRAINT chk_unidades_fechas
        CHECK (fecha_baja IS NULL OR fecha_baja >= fecha_alta)
);

CREATE TABLE material_condiciones_uso (
    id BIGSERIAL PRIMARY KEY,
    material_id BIGINT NOT NULL,
    orden SMALLINT NOT NULL DEFAULT 0,
    texto VARCHAR(255) NOT NULL,
    CONSTRAINT fk_condiciones_material
        FOREIGN KEY (material_id) REFERENCES materiales(id) ON DELETE CASCADE,
    CONSTRAINT uq_condiciones_orden UNIQUE (material_id, orden)
);

-- =====================================================================
-- Solicitudes y préstamos
-- =====================================================================

CREATE TABLE solicitudes (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    material_id BIGINT NOT NULL,
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado estado_solicitud NOT NULL DEFAULT 'pendiente',
    prioridad prioridad_solicitud NOT NULL DEFAULT 'normal',
    cantidad SMALLINT NOT NULL DEFAULT 1 CHECK (cantidad >= 1),
    motivo TEXT,
    es_reserva BOOLEAN NOT NULL DEFAULT FALSE,
    en_lista_espera BOOLEAN NOT NULL DEFAULT FALSE,
    posicion_espera INTEGER,
    fecha_limite_recogida TIMESTAMPTZ,
    motivo_rechazo TEXT,
    revisado_por BIGINT,
    fecha_resolucion TIMESTAMPTZ,
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_solicitudes_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_solicitudes_material
        FOREIGN KEY (material_id) REFERENCES materiales(id) ON DELETE RESTRICT,
    CONSTRAINT fk_solicitudes_revisado_por
        FOREIGN KEY (revisado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT chk_solicitudes_fechas
        CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT chk_solicitudes_posicion_espera
        CHECK (posicion_espera IS NULL OR posicion_espera > 0)
);

CREATE TABLE prestamos (
    id BIGSERIAL PRIMARY KEY,
    solicitud_id BIGINT NOT NULL UNIQUE,
    usuario_id BIGINT NOT NULL,
    unidad_material_id BIGINT NOT NULL,
    fecha_entrega TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_devolucion_prevista TIMESTAMPTZ NOT NULL,
    fecha_devolucion_real TIMESTAMPTZ,
    estado estado_prestamo NOT NULL DEFAULT 'pendiente',
    registrado_por BIGINT,
    cerrado_por BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_prestamos_solicitud
        FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_prestamos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_prestamos_unidad
        FOREIGN KEY (unidad_material_id) REFERENCES unidades_material(id) ON DELETE RESTRICT,
    CONSTRAINT fk_prestamos_registrado_por
        FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT fk_prestamos_cerrado_por
        FOREIGN KEY (cerrado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT chk_prestamos_fechas
        CHECK (fecha_devolucion_real IS NULL OR fecha_devolucion_real >= fecha_entrega)
);

-- =====================================================================
-- Incidencias y archivos adjuntos
-- =====================================================================

CREATE TABLE incidencias (
    id BIGSERIAL PRIMARY KEY,
    unidad_material_id BIGINT NOT NULL,
    prestamo_id BIGINT,
    usuario_id BIGINT,
    registrada_por BIGINT NOT NULL,
    tipo tipo_incidencia NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_incidencia TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado_material_resultante estado_material,
    resuelta BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_resolucion TIMESTAMPTZ,
    resuelta_por BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_incidencias_unidad
        FOREIGN KEY (unidad_material_id) REFERENCES unidades_material(id) ON DELETE RESTRICT,
    CONSTRAINT fk_incidencias_prestamo
        FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE SET NULL,
    CONSTRAINT fk_incidencias_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT fk_incidencias_registrada_por
        FOREIGN KEY (registrada_por) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_incidencias_resuelta_por
        FOREIGN KEY (resuelta_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT chk_incidencias_resolucion
        CHECK (
            (resuelta = FALSE AND fecha_resolucion IS NULL)
            OR (resuelta = TRUE AND fecha_resolucion IS NOT NULL)
        )
);

CREATE TABLE incidencia_archivos (
    id BIGSERIAL PRIMARY KEY,
    incidencia_id BIGINT NOT NULL,
    url TEXT NOT NULL,
    nombre_original VARCHAR(255),
    mime_type VARCHAR(100) NOT NULL,
    tamano_bytes INTEGER NOT NULL,
    subido_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_archivos_incidencia
        FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE,
    CONSTRAINT chk_archivos_mime
        CHECK (mime_type LIKE 'image/%'),
    CONSTRAINT chk_archivos_tamano
        CHECK (tamano_bytes > 0 AND tamano_bytes <= 5242880)
);

-- =====================================================================
-- Sanciones y pagos
-- =====================================================================

CREATE TABLE pagos (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    solicitud_id BIGINT,
    sancion_id BIGINT,
    concepto VARCHAR(150) NOT NULL,
    concepto_sub VARCHAR(255),
    metodo metodo_pago NOT NULL DEFAULT 'tarjeta',
    metodo_detalle VARCHAR(60),
    importe_centimos INTEGER NOT NULL CHECK (importe_centimos > 0),
    moneda CHAR(3) NOT NULL DEFAULT 'EUR',
    estado estado_pago NOT NULL DEFAULT 'pendiente',
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    recibo_url TEXT,
    fecha_pago TIMESTAMPTZ,
    fecha_reembolso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_pagos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pagos_solicitud
        FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE SET NULL,
    CONSTRAINT chk_pagos_origen
        CHECK (solicitud_id IS NOT NULL OR sancion_id IS NOT NULL)
);

CREATE TABLE sanciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    prestamo_id BIGINT,
    creada_por BIGINT,
    tipo tipo_sancion NOT NULL DEFAULT 'retraso',
    motivo TEXT NOT NULL,
    importe_centimos INTEGER NOT NULL DEFAULT 0 CHECK (importe_centimos >= 0),
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    pagada BOOLEAN NOT NULL DEFAULT FALSE,
    pago_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_sanciones_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sanciones_prestamo
        FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE SET NULL,
    CONSTRAINT fk_sanciones_creada_por
        FOREIGN KEY (creada_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT fk_sanciones_pago
        FOREIGN KEY (pago_id) REFERENCES pagos(id) ON DELETE SET NULL,
    CONSTRAINT chk_sanciones_fechas
        CHECK (fecha_fin IS NULL OR fecha_fin > fecha_inicio)
);

-- FK diferida de pagos.sancion_id (referencia circular sanciones <-> pagos)
ALTER TABLE pagos
    ADD CONSTRAINT fk_pagos_sancion
        FOREIGN KEY (sancion_id) REFERENCES sanciones(id) ON DELETE SET NULL;

-- =====================================================================
-- Notificaciones y auditoría
-- =====================================================================

CREATE TABLE notificaciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    tipo tipo_notificacion NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    texto TEXT NOT NULL,
    canal canal_notificacion NOT NULL DEFAULT 'in_app',
    estado estado_notificacion NOT NULL DEFAULT 'pendiente',
    fecha_envio TIMESTAMPTZ,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    leida_at TIMESTAMPTZ,
    entidad_tipo VARCHAR(50),
    entidad_id BIGINT,
    accion_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notificaciones_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

CREATE TABLE auditoria (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    entidad_id BIGINT,
    detalle JSONB NOT NULL DEFAULT '{}'::JSONB,
    fecha_accion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- =====================================================================
-- Índices
-- =====================================================================

CREATE INDEX idx_usuarios_reset_token
    ON usuarios (reset_token) WHERE reset_token IS NOT NULL;

CREATE INDEX idx_usuario_roles_rol_id
    ON usuario_roles (rol_id);

CREATE INDEX idx_materiales_categoria_id
    ON materiales (categoria_id);

CREATE INDEX idx_materiales_activo
    ON materiales (activo) WHERE activo = TRUE;

CREATE INDEX idx_unidades_material_id
    ON unidades_material (material_id);

CREATE INDEX idx_unidades_disponibles
    ON unidades_material (material_id) WHERE estado = 'disponible';

CREATE INDEX idx_solicitudes_usuario_id
    ON solicitudes (usuario_id);

CREATE INDEX idx_solicitudes_material_id
    ON solicitudes (material_id);

CREATE INDEX idx_solicitudes_estado
    ON solicitudes (estado);

CREATE INDEX idx_solicitudes_material_fechas
    ON solicitudes (material_id, fecha_inicio, fecha_fin);

CREATE INDEX idx_prestamos_usuario_id
    ON prestamos (usuario_id);

CREATE INDEX idx_prestamos_unidad_id
    ON prestamos (unidad_material_id);

CREATE INDEX idx_prestamos_estado
    ON prestamos (estado);

CREATE UNIQUE INDEX ux_prestamos_unidad_activa
    ON prestamos (unidad_material_id)
    WHERE estado IN ('activo', 'retrasado');

CREATE INDEX idx_incidencias_unidad_id
    ON incidencias (unidad_material_id);

CREATE INDEX idx_incidencias_prestamo_id
    ON incidencias (prestamo_id);

CREATE INDEX idx_archivos_incidencia_id
    ON incidencia_archivos (incidencia_id);

CREATE INDEX idx_sanciones_usuario_activa
    ON sanciones (usuario_id) WHERE activa = TRUE;

CREATE INDEX idx_pagos_usuario
    ON pagos (usuario_id, created_at DESC);

CREATE INDEX idx_pagos_estado
    ON pagos (estado);

CREATE INDEX idx_pagos_stripe
    ON pagos (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX idx_notificaciones_usuario_no_leidas
    ON notificaciones (usuario_id) WHERE leida = FALSE;

CREATE INDEX idx_auditoria_usuario_id
    ON auditoria (usuario_id);

CREATE INDEX idx_auditoria_entidad
    ON auditoria (entidad, entidad_id);

-- =====================================================================
-- Triggers
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_categorias_updated_at
    BEFORE UPDATE ON categorias
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_materiales_updated_at
    BEFORE UPDATE ON materiales
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_unidades_updated_at
    BEFORE UPDATE ON unidades_material
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_solicitudes_updated_at
    BEFORE UPDATE ON solicitudes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_prestamos_updated_at
    BEFORE UPDATE ON prestamos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_incidencias_updated_at
    BEFORE UPDATE ON incidencias
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sanciones_updated_at
    BEFORE UPDATE ON sanciones
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pagos_updated_at
    BEFORE UPDATE ON pagos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_notificaciones_updated_at
    BEFORE UPDATE ON notificaciones
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_preferencias_updated_at
    BEFORE UPDATE ON preferencias_notificacion_usuario
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Crear preferencias de notificación por defecto al insertar usuario
CREATE OR REPLACE FUNCTION crear_preferencias_default()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO preferencias_notificacion_usuario (usuario_id)
    VALUES (NEW.id)
    ON CONFLICT (usuario_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_crear_preferencias
    AFTER INSERT ON usuarios
    FOR EACH ROW EXECUTE FUNCTION crear_preferencias_default();

-- Sincronizar estado de unidad cuando cambia un préstamo
CREATE OR REPLACE FUNCTION sync_estado_unidad_prestamo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado IN ('activo', 'retrasado') THEN
        UPDATE unidades_material
        SET estado = 'prestada'
        WHERE id = NEW.unidad_material_id
          AND estado = 'disponible';
    ELSIF NEW.estado = 'finalizado' AND (OLD IS NULL OR OLD.estado <> 'finalizado') THEN
        UPDATE unidades_material
        SET estado = 'disponible'
        WHERE id = NEW.unidad_material_id
          AND estado = 'prestada';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prestamos_sync_unidad
    AFTER INSERT OR UPDATE OF estado ON prestamos
    FOR EACH ROW EXECUTE FUNCTION sync_estado_unidad_prestamo();

-- Incrementar popularidad del modelo cuando se crea un préstamo
CREATE OR REPLACE FUNCTION incrementar_popularidad()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE materiales
    SET popularidad = popularidad + 1
    WHERE id = (SELECT material_id FROM unidades_material WHERE id = NEW.unidad_material_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prestamos_popularidad
    AFTER INSERT ON prestamos
    FOR EACH ROW EXECUTE FUNCTION incrementar_popularidad();

-- Limitar a 5 archivos por incidencia
CREATE OR REPLACE FUNCTION limite_archivos_incidencia()
RETURNS TRIGGER AS $$
DECLARE
    n_archivos INTEGER;
BEGIN
    SELECT COUNT(*) INTO n_archivos
    FROM incidencia_archivos
    WHERE incidencia_id = NEW.incidencia_id;

    IF n_archivos >= 5 THEN
        RAISE EXCEPTION 'Una incidencia no puede tener más de 5 archivos adjuntos';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_archivos_limite
    BEFORE INSERT ON incidencia_archivos
    FOR EACH ROW EXECUTE FUNCTION limite_archivos_incidencia();

-- =====================================================================
-- Vista de catálogo (modelos con stock agregado)
-- =====================================================================

CREATE OR REPLACE VIEW materiales_catalogo_v AS
SELECT
    m.id,
    m.nombre,
    m.descripcion,
    m.codigo_modelo,
    m.icono,
    m.plazo_max_dias,
    m.popularidad,
    m.requiere_pago,
    m.precio_caucion_centimos,
    m.activo,
    c.id   AS categoria_id,
    c.nombre AS categoria_nombre,
    COUNT(u.id) FILTER (WHERE u.estado = 'disponible')                AS stock,
    COUNT(u.id)                                                       AS total,
    COUNT(u.id) FILTER (WHERE u.estado IN ('averiada', 'mantenimiento')) AS incidencias_recientes
FROM materiales m
JOIN categorias c ON c.id = m.categoria_id
LEFT JOIN unidades_material u ON u.material_id = m.id
GROUP BY m.id, c.id;

-- =====================================================================
-- Datos iniciales: roles
-- =====================================================================

INSERT INTO roles (nombre, descripcion) VALUES
    ('estudiante', 'Usuario solicitante de material'),
    ('profesor', 'Usuario solicitante con prioridad en préstamos'),
    ('personal_gestion', 'Gestiona solicitudes, entregas, devoluciones e inventario'),
    ('mantenimiento', 'Gestiona incidencias y estados técnicos del material'),
    ('admin', 'Administrador con permisos globales')
ON CONFLICT (nombre) DO NOTHING;

COMMIT;
