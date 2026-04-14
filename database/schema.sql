BEGIN;

CREATE TYPE estado_material AS ENUM (
    'disponible',
    'reservado',
    'prestado',
    'averiado',
    'mantenimiento',
    'fuera_servicio'
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
    'general'
);

CREATE TYPE estado_notificacion AS ENUM (
    'pendiente',
    'enviada',
    'fallida'
);

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
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    bloqueado_manual BOOLEAN NOT NULL DEFAULT FALSE,
    intentos_fallidos INTEGER NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
    bloqueado_hasta TIMESTAMPTZ,
    ultimo_login_at TIMESTAMPTZ,
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

CREATE TABLE categorias (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE materiales (
    id BIGSERIAL PRIMARY KEY,
    codigo_inventario VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    categoria_id BIGINT NOT NULL,
    estado estado_material NOT NULL DEFAULT 'disponible',
    fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_baja DATE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_materiales_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
    CONSTRAINT chk_materiales_fechas
        CHECK (fecha_baja IS NULL OR fecha_baja >= fecha_alta)
);

CREATE TABLE solicitudes (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    material_id BIGINT NOT NULL,
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado estado_solicitud NOT NULL DEFAULT 'pendiente',
    prioridad SMALLINT NOT NULL DEFAULT 0,
    motivo TEXT,
    es_reserva BOOLEAN NOT NULL DEFAULT FALSE,
    en_lista_espera BOOLEAN NOT NULL DEFAULT FALSE,
    posicion_espera INTEGER,
    fecha_limite_recogida TIMESTAMPTZ,
    motivo_rechazo TEXT,
    revisado_por BIGINT,
    fecha_resolucion TIMESTAMPTZ,
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
    material_id BIGINT NOT NULL,
    fecha_entrega TIMESTAMPTZ,
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
    CONSTRAINT fk_prestamos_material
        FOREIGN KEY (material_id) REFERENCES materiales(id) ON DELETE RESTRICT,
    CONSTRAINT fk_prestamos_registrado_por
        FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT fk_prestamos_cerrado_por
        FOREIGN KEY (cerrado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT chk_prestamos_fechas
        CHECK (
            fecha_devolucion_real IS NULL
            OR fecha_entrega IS NULL
            OR fecha_devolucion_real >= fecha_entrega
        )
);

CREATE TABLE incidencias (
    id BIGSERIAL PRIMARY KEY,
    material_id BIGINT NOT NULL,
    prestamo_id BIGINT,
    usuario_id BIGINT,
    registrada_por BIGINT NOT NULL,
    tipo tipo_incidencia NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_incidencia TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado_material_resultante estado_material NOT NULL,
    resuelta BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_resolucion TIMESTAMPTZ,
    resuelta_por BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_incidencias_material
        FOREIGN KEY (material_id) REFERENCES materiales(id) ON DELETE RESTRICT,
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

CREATE TABLE sanciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    prestamo_id BIGINT,
    creada_por BIGINT,
    tipo tipo_sancion NOT NULL DEFAULT 'retraso',
    motivo TEXT NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_sanciones_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sanciones_prestamo
        FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE SET NULL,
    CONSTRAINT fk_sanciones_creada_por
        FOREIGN KEY (creada_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT chk_sanciones_fechas
        CHECK (fecha_fin > fecha_inicio)
);

CREATE TABLE notificaciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    tipo tipo_notificacion NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    canal VARCHAR(20) NOT NULL DEFAULT 'email',
    estado estado_notificacion NOT NULL DEFAULT 'pendiente',
    fecha_envio TIMESTAMPTZ,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    entidad_tipo VARCHAR(50),
    entidad_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notificaciones_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT chk_notificaciones_canal
        CHECK (canal IN ('email'))
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

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_categorias_updated_at
BEFORE UPDATE ON categorias
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_materiales_updated_at
BEFORE UPDATE ON materiales
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_solicitudes_updated_at
BEFORE UPDATE ON solicitudes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_prestamos_updated_at
BEFORE UPDATE ON prestamos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_incidencias_updated_at
BEFORE UPDATE ON incidencias
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sanciones_updated_at
BEFORE UPDATE ON sanciones
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_notificaciones_updated_at
BEFORE UPDATE ON notificaciones
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_usuario_roles_rol_id
    ON usuario_roles (rol_id);

CREATE INDEX idx_materiales_categoria_id
    ON materiales (categoria_id);

CREATE INDEX idx_materiales_estado
    ON materiales (estado);

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

CREATE INDEX idx_prestamos_material_id
    ON prestamos (material_id);

CREATE INDEX idx_prestamos_estado
    ON prestamos (estado);

CREATE INDEX idx_incidencias_material_id
    ON incidencias (material_id);

CREATE INDEX idx_incidencias_prestamo_id
    ON incidencias (prestamo_id);

CREATE INDEX idx_sanciones_usuario_activa
    ON sanciones (usuario_id)
    WHERE activa = TRUE;

CREATE INDEX idx_notificaciones_usuario_id
    ON notificaciones (usuario_id);

CREATE INDEX idx_auditoria_usuario_id
    ON auditoria (usuario_id);

CREATE INDEX idx_auditoria_entidad
    ON auditoria (entidad, entidad_id);

INSERT INTO roles (nombre, descripcion) VALUES
    ('estudiante', 'Usuario solicitante de material'),
    ('profesor', 'Usuario solicitante con prioridad en préstamos'),
    ('personal_gestion', 'Gestiona solicitudes, entregas, devoluciones e inventario'),
    ('mantenimiento', 'Gestiona incidencias y estados técnicos del material'),
    ('admin', 'Administrador con permisos globales')
ON CONFLICT (nombre) DO NOTHING;

COMMIT;