# Calendario Económico El Master

Aplicación web de calendario económico global con integración de API Finnworlds.

## 📋 Requisitos

- Node.js 18+
- PostgreSQL (Neon recomendado)
- API Key de Finnworlds

## 🚀 Deployment en Railway

### 1. **Configura las Variables de Entorno en Railway**

En el dashboard de Railway, ve a **Variables** y añade:

```
DATABASE_URL=postgresql://neondb_owner:npg_...@ep-....c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
FINNWORLDS_API_KEY=tu_api_key_aqui
NODE_ENV=production
```

### 2. **Pasos en Railway:**

1. Conecta tu repositorio GitHub
2. Railway detectará `package.json` automáticamente
3. Añade las variables de entorno en la sección **Variables**
4. Deploy automático en cada push

### 3. **Crear la Base de Datos en Railway (Opcional)**

Si usas Railway para la BD:
1. Añade un servicio PostgreSQL en Railway
2. Copia la URL de conexión a `DATABASE_URL`
3. Los datos se sincronizarán automáticamente

## 🔧 Instalación Local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales

# Crear la BD
npm run db:push

# Iniciar en desarrollo
npm run dev
```

## 📊 API Endpoints

### GET `/api/events`

Obtiene eventos económicos con filtros:

**Query Parameters:**
- `dateRange`: `today` | `thisWeek` | `nextWeek` | `thisMonth`
- `countries`: Códigos separados por coma (USA,EUR,GBR)
- `impacts`: `high`, `medium`, `low`
- `categories`: Categorías de eventos
- `search`: Búsqueda de texto
- `timezone`: Zona horaria (IANA format)

**Ejemplo:**
```
GET /api/events?dateRange=today&countries=USA,EUR&impacts=high&timezone=America/New_York
```

## 🔄 Actualización Automática de Datos

El sistema ejecuta dos trabajos automáticos:

1. **Monthly Refresh** (02:00 UTC cada mes)
   - Actualiza mes actual + 90 días adelante

2. **Daily Refresh** (14:00 UTC cada día)
   - Actualiza ±7 días alrededor de hoy

## 🛠️ Script de Refresh Manual

```bash
# Refrescar eventos de un rango específico
export DATABASE_URL="..."
export FINNWORLDS_API_KEY="..."
npx tsx refresh-events.ts
```

## 📝 Notas Importantes

- **Zonas Horarias**: El sistema almacena en UTC y convierte según la zona del usuario
- **Rate Limiting**: Finnworlds permite 20 requests/minuto
- **Caché**: Los datos se almacenan en PostgreSQL para optimizar
- **Variables de Entorno**: Requeridas en todos los ambientes (dev, production, railway)

## 🐛 Troubleshooting

### Error: "DATABASE_URL must be set"
Verifica que `DATABASE_URL` está definida en Railway Variables

### Error: "API no configurada"
Verifica que `FINNWORLDS_API_KEY` está definida en Railway Variables

### Deployments fallando
- Revisa los logs en Railway
- Asegúrate de que las variables de entorno están configuradas
- Verifica que el branch está actualizado

## 📞 Contacto

Para soporte con Finnworlds API: https://finnworlds.com
