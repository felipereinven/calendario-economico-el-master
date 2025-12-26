# Sistema de Notificaciones Individuales por Evento

## Descripción

El sistema de notificaciones permite a los usuarios configurar recordatorios personalizados para eventos económicos específicos. Los usuarios pueden elegir recibir notificaciones 15, 30 o 60 minutos antes de cada evento.

## Características

### 1. Notificaciones por Evento
- Cada evento tiene su propio botón de notificaciones (ícono de campana)
- Los usuarios pueden configurar múltiples recordatorios para el mismo evento
- Las notificaciones se pueden activar/desactivar individualmente

### 2. Opciones de Tiempo
- **15 minutos antes**: Ideal para traders activos
- **30 minutos antes**: Tiempo para preparar estrategias
- **60 minutos antes**: Tiempo amplio para análisis previo

### 3. Zona Horaria
- Las notificaciones respetan automáticamente la zona horaria del usuario
- Los cálculos se hacen basados en el timestamp UTC del evento
- La hora de notificación se ajusta según la configuración del navegador

### 4. **Sincronización entre Dispositivos** (NUEVO)
- **User ID único y persistente**: Cada usuario tiene un ID único generado automáticamente
- **Sincronización manual**: Los usuarios pueden copiar su User ID y usarlo en otros dispositivos
- **Consistencia total**: Las notificaciones configuradas en desktop aparecen en mobile, tablet, etc.
- **Formato simplificado**: `user_<timestamp>_<random>` - Un solo formato para todo

## Arquitectura Simplificada

### Identificación de Usuario

#### Formato único del User ID
```
user_1735123456789_abc123def
```

- **Persistencia**: Se guarda en `localStorage` con la clave `ec-user-id`
- **Generación**: Automática en el primer uso
- **Sincronización**: Manual mediante copia/pegado del ID
- **Futuro**: Integración con sistema de autenticación

#### Funciones principales (`client/src/lib/session.ts`)
```typescript
getUserId()      // Obtiene o crea el User ID
setUserId(id)    // Importa un User ID de otro dispositivo
getSessionId()   // Alias de getUserId para compatibilidad
exportUserId()   // Exporta el User ID para compartir
```

### Frontend

#### Componentes
- **EventCard**: Botón dropdown para configurar notificaciones por evento
- **UserSyncDialog**: Diálogo para copiar/importar User ID entre dispositivos
- **NotificationSettings**: Configuración global de notificaciones (legacy)

#### Hooks
- **useEventNotifications**: Polling cada 30 segundos para notificaciones pendientes
- **useNotifications**: Sistema legacy de notificaciones globales

### Backend

#### API Endpoints
```
GET  /api/notifications              - Lista todas las notificaciones del usuario
GET  /api/notifications/pending      - Notificaciones pendientes de enviar
GET  /api/notifications/:eventId     - Notificaciones de un evento específico
POST /api/notifications              - Crear nueva notificación
DELETE /api/notifications/:eventId/:minutesBefore - Eliminar notificación
```

**Header requerido**: `x-session-id: <userId>`

#### Base de Datos
Tabla `event_notifications` (SIMPLIFICADA):
- `id`: ID único (serial)
- `userId`: ID de usuario (text) - **ÚNICO IDENTIFICADOR**
- `eventId`: ID del evento económico
- `eventTimestamp`: Timestamp del evento
- `minutesBefore`: Minutos antes del evento (15, 30, o 60)
- `notificationSent`: Timestamp de envío (null si no se ha enviado)
- `createdAt`: Fecha de creación

**Índices:**
- `(userId, eventId)`: Para consultas rápidas por usuario y evento
- `eventTimestamp`: Para búsquedas por fecha

#### Scheduler
- **notification-scheduler.ts**: Verifica cada minuto si hay notificaciones pendientes
- Marca notificaciones como enviadas en la base de datos
- El cliente hace polling para obtener notificaciones pendientes

## Flujo de Trabajo

### 1. Configurar notificación en un dispositivo

**Desktop:**
1. Usuario abre la aplicación
2. Se genera automáticamente un `userId` (ej: `user_1735123456789_abc123def`)
3. Click en el botón de campana en EventCard
4. Selecciona tiempo (15, 30 o 60 minutos)
5. Se crea registro en `event_notifications` con el `userId`

### 2. Sincronizar con otro dispositivo

**Mobile:**
1. Usuario abre el diálogo "Sincronizar dispositivos"
2. En desktop, copia su `userId` usando el botón "Copiar ID"
3. En mobile, pega el `userId` en el campo "Importar ID"
4. Click en "Importar"
5. La página se recarga con el nuevo `userId`
6. **Las notificaciones configuradas en desktop ahora aparecen en mobile**

### 3. Notificación programada

**Backend:**
1. Scheduler verifica cada minuto notificaciones pendientes
2. Calcula: `hora_notificacion = hora_evento - minutos_antes`
3. Si `hora_notificacion <= hora_actual`, marca como pendiente

**Frontend:**
1. Hook hace polling cada 30 segundos
2. Obtiene notificaciones pendientes del endpoint
3. Muestra notificación del navegador
4. Marca localmente para evitar duplicados

## Sincronización entre Dispositivos

### Cómo funciona

1. **Mismo User ID = Mismas notificaciones**
   - Desktop: `user_1735123456789_abc123def`
   - Mobile: `user_1735123456789_abc123def` (mismo ID)
   - Resultado: Ambos ven las mismas notificaciones

2. **Consultas por userId**
   - Todas las consultas filtran por `userId`
   - No importa desde qué dispositivo se haga la solicitud
   - La respuesta siempre contiene las notificaciones del usuario

3. **Sin duplicados**
   - El índice `(userId, eventId, minutesBefore)` previene duplicados
   - Si se intenta crear una notificación existente, se rechaza

### Ejemplo de sincronización

```javascript
// Desktop - User configura notificación
userId: "user_1735123456789_abc123def"
eventId: "abc123"
minutesBefore: 30

// Se guarda en DB:
INSERT INTO event_notifications (user_id, event_id, minutes_before, ...)
VALUES ('user_1735123456789_abc123def', 'abc123', 30, ...)

// Mobile - User importa userId
localStorage.setItem('ec-user-id', 'user_1735123456789_abc123def')

// Mobile - Query automática
GET /api/notifications
Headers: { 'x-session-id': 'user_1735123456789_abc123def' }

// Response incluye notificación de desktop:
[
  {
    "id": 1,
    "userId": "user_1735123456789_abc123def",
    "eventId": "abc123",
    "minutesBefore": 30,
    ...
  }
]
```

## Permisos del Navegador

El sistema requiere permisos de notificación del navegador:
```javascript
Notification.requestPermission()
```

Los usuarios deben otorgar permisos la primera vez que activan una notificación.

## Mejoras Futuras

1. **Autenticación real**: Login/registro para sincronización automática
2. **WebSocket/SSE**: Reemplazar polling con push en tiempo real
3. **Service Worker**: Notificaciones incluso con la app cerrada
4. **Sonidos personalizados**: Diferentes tonos según impacto
5. **Notificaciones móviles**: Push notifications via PWA
6. **Historial**: Ver notificaciones pasadas
7. **Snooze**: Posponer notificaciones
8. **QR Code**: Escanear para sincronizar dispositivos instantáneamente

## Consideraciones

- Las notificaciones solo funcionan con la aplicación abierta (sin Service Worker)
- El polling consume recursos, pero es más simple que WebSocket
- La zona horaria se detecta automáticamente del navegador
- Las notificaciones se persisten en la base de datos por usuario
- **La sincronización es manual**: El usuario debe copiar/pegar su User ID
- **Formato único**: Un solo formato de identificador simplifica el código y previene errores
