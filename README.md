# Calendario Económico Insider

Aplicación web profesional para seguimiento de eventos económicos globales en tiempo real utilizando web scraping de Investing.com.

## 🎯 Características

- **Scraping en tiempo real** de Investing.com para obtener eventos económicos actualizados
- **8 economías principales**: Estados Unidos, Eurozona, Alemania, Francia, España, Reino Unido, China y Japón
- **Filtros avanzados**: Por país, impacto (alto/medio/bajo), categoría y búsqueda de texto
- **Soporte multi-zona horaria**: Convierte automáticamente eventos a tu zona horaria local
- **Actualización automática**: Sistema de caché con refrescos programados
- **Interfaz responsive**: Diseñada con Tailwind CSS para desktop y mobile
- **Notificaciones**: Sistema de alertas para eventos de alto impacto

## 🛠️ Stack Tecnológico

### Backend
- **Node.js + Express**: Servidor API REST
- **TypeScript**: Type-safety en todo el código
- **Puppeteer**: Web scraping de Investing.com
- **PostgreSQL (Neon)**: Base de datos serverless
- **Drizzle ORM**: Type-safe database queries

### Frontend
- **React 18**: UI interactiva
- **Vite**: Build tool ultrarrápido
- **Tailwind CSS**: Estilos utility-first
- **shadcn/ui**: Componentes UI de alta calidad
- **TanStack Query**: Gestión de estado del servidor

## 🚀 Instalación

### Requisitos previos
- Node.js 18+
- Base de datos PostgreSQL (recomendado: [Neon](https://neon.tech))

### Pasos

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd "Calendario Insider"
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Edita `.env` y agrega tu URL de base de datos:
```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
NODE_ENV=development
```

4. **Crear las tablas de la base de datos**
```bash
npm run db:push
```

5. **Iniciar el servidor de desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5000`

> **Nota**: Si el puerto 5000 está en uso (macOS Control Center), usa:
> ```bash
> PORT=5001 npm run dev
> ```

## 📁 Estructura del Proyecto

```
.
├── client/                 # Frontend React
│   └── src/
│       ├── components/    # Componentes reutilizables
│       ├── hooks/         # React hooks personalizados
│       ├── lib/           # Utilidades
│       └── pages/         # Páginas de la aplicación
├── server/                # Backend Express
│   ├── services/          # Lógica de negocio
│   │   ├── investing-scraper.ts    # Scraper de Investing.com
│   │   └── cache-coordinator.ts    # Gestión de caché y refrescos
│   ├── utils/             # Utilidades del servidor
│   ├── db.ts              # Configuración de base de datos
│   ├── routes.ts          # Endpoints API
│   └── storage.ts         # Capa de acceso a datos
├── shared/                # Código compartido (schemas, tipos)
└── migrations/            # Migraciones de base de datos
```

## 🔄 Sistema de Actualización

### Scraping Automático

El proyecto implementa un sistema de actualización automática en dos niveles:

1. **Refresh Diario (14:00 UTC)**
   - Actualiza eventos de hoy y mañana
   - Se ejecuta al iniciar el servidor y cada 24h

2. **Refresh Mensual (02:00 UTC)**
   - Actualiza todos los rangos de tiempo disponibles
   - Limpia eventos antiguos (>180 días)
   - Se ejecuta diariamente

### Rangos de Tiempo Disponibles
- `yesterday`: Eventos de ayer
- `today`: Eventos de hoy
- `tomorrow`: Eventos de mañana  
- `thisWeek`: Eventos de esta semana
- `nextWeek`: Eventos de la próxima semana

## 🌐 API Endpoints

### `GET /api/events`
Obtiene eventos económicos filtrados

**Query Parameters:**
- `period`: Período de tiempo (yesterday, today, tomorrow, thisWeek, nextWeek)
- `timezone`: Zona horaria (default: UTC)
- `countries[]`: Array de códigos de país (USA, EUR, DEU, FRA, ESP, GBR, CHN, JPN)
- `impacts[]`: Array de niveles de impacto (high, medium, low)
- `categories[]`: Array de categorías de eventos
- `search`: Búsqueda de texto

**Ejemplo:**
```
GET /api/events?period=today&timezone=America/Bogota&impacts[]=high
```

### `GET /api/investing/:timeRange`
Endpoint de scraping directo (para desarrollo/debugging)

### `POST /api/cache/clear`
Limpia el caché del scraper (requiere autenticación)

## 🔧 Scripts Disponibles

```bash
npm run dev          # Inicia servidor de desarrollo
npm run build        # Compila para producción
npm start            # Inicia servidor de producción
npm run check        # Verifica tipos de TypeScript
npm run db:push      # Aplica cambios al schema de la base de datos
```

## 📊 Categorías de Eventos

Los eventos se clasifican automáticamente en categorías:
- **Empleo**: Tasa de desempleo, nóminas no agrícolas, etc.
- **Inflación**: IPC, IPP, precios al consumidor
- **PIB**: Crecimiento económico, producción industrial
- **Política Monetaria**: Decisiones de tasas de interés, reuniones de bancos centrales
- **Ventas**: Ventas minoristas, vivienda
- **Manufactura**: PMI, pedidos industriales
- **Sentimiento**: Confianza del consumidor, índices de sentimiento
- **Balanza Comercial**: Exportaciones, importaciones
- **Banca**: Préstamos, crédito
- Y más...

## 🌍 Países Soportados

- 🇺🇸 Estados Unidos (USA)
- 🇪🇺 Eurozona (EUR)
- 🇩🇪 Alemania (DEU)
- 🇫🇷 Francia (FRA)
- 🇪🇸 España (ESP)
- 🇬🇧 Reino Unido (GBR)
- 🇨🇳 China (CHN)
- 🇯🇵 Japón (JPN)

## 🐛 Troubleshooting

### Puerto en uso
Si encuentras el error `EADDRINUSE`, el puerto 5000 está ocupado:
```bash
PORT=5001 npm run dev
```

### Errores de scraping
El scraper puede fallar ocasionalmente si Investing.com cambia su estructura. Los eventos en caché seguirán disponibles.

### Base de datos
Si hay problemas con la base de datos:
```bash
npm run db:push  # Recrear tablas
```

## 📝 Licencia

MIT

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor abre un issue o pull request.
