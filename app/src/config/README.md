# Módulo de Configuración del Sistema

## Descripción
El módulo de configuración permite gestionar los parámetros generales del sistema UniGear. Proporciona endpoints para obtener y actualizar la configuración del sistema.

## Endpoints

### Obtener Configuración
```
GET /config
```
Devuelve toda la configuración actual del sistema.

### Actualizar Configuración
```
PUT /config
```
Actualiza la configuración del sistema con los nuevos valores proporcionados.

## Estructura del archivo de configuración

El archivo `config.json` contiene los siguientes parámetros:

- `appName`: Nombre de la aplicación
- `version`: Versión actual
- `environment`: Entorno de ejecución (development, production)
- `database`: Configuración de la base de datos
- `api`: Configuración de la API
- `frontend`: URL del frontend
- `email`: Configuración de correo electrónico
- `stripe`: Configuración de integración con Stripe
- `features`: Configuración de características habilitadas
- `limits`: Límites del sistema

## Ejemplo de uso

### Obtener configuración
```bash
curl -X GET http://localhost:3000/config
```

### Actualizar configuración
```bash
curl -X PUT http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "UniGear",
    "version": "1.0.1",
    "environment": "production"
  }'
```

## Seguridad

- El acceso a este módulo debe estar restringido a usuarios administradores
- La configuración sensible (claves API, credenciales) debe ser gestionada con variables de entorno
- Se recomienda implementar autenticación y autorización para estos endpoints en entornos de producción