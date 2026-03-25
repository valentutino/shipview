# ShipView — Portal White-Label de Seguimiento para Forwarders

Portal SaaS multi-tenant que permite a freight forwarders ofrecer a sus clientes importadores un portal branded de seguimiento de embarques en tiempo real.

## Stack

- **Backend:** Node.js + Express
- **Frontend:** HTML/CSS/JS vanilla (SPA, sin dependencias de build)
- **Datos:** JSON (reemplazable por cualquier DB: PostgreSQL, MongoDB, etc.)
- **Deploy:** Railway, Render, Fly.io, VPS — cualquier host con Node 18+

## Estructura

```
shipview/
├── server.js           # Servidor Express + API REST
├── package.json
├── data/
│   ├── tenants.json    # Config de marca por forwarder
│   ├── shipments.json  # Embarques activos
│   └── documents.json  # Documentos por operación
└── public/
    └── index.html      # SPA completa (HTML + CSS + JS)
```

## Correr localmente

```bash
npm install
npm start
# → http://localhost:3000
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT`   | `3000`  | Puerto del servidor |

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/config/:tenant` | Branding y config del forwarder |
| GET | `/api/shipments/:tenant` | Embarques activos del cliente |
| GET | `/api/shipments/:tenant/:id` | Detalle de un embarque |
| GET | `/api/documents/:tenant` | Documentos disponibles |
| POST | `/api/contact` | Envío de consulta al ejecutivo |

## Tenants de demo

| URL demo | Forwarder |
|----------|-----------|
| `?tenant=lateam` | LATEAM FOODS |
| `?tenant=nipcargo` | NIP CARGO |
| `?tenant=aramis` | ARAMIS GT |
| `?tenant=silver` | SILVER FREIGHT |

## Deploy en Railway (recomendado)

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login y deploy
railway login
railway init
railway up
```

## Deploy en Render

1. Fork o subí este repo a GitHub
2. En Render: New → Web Service → conectar repo
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Listo — URL pública automática

## Escalabilidad

Para pasar de JSON a base de datos real, reemplazar las líneas de `require('./data/...')` en `server.js` por queries a PostgreSQL/MongoDB. El resto del sistema no cambia.

## Agregar un nuevo forwarder (tenant)

1. Agregar entrada en `data/tenants.json` con su branding
2. Agregar sus embarques en `data/shipments.json` con `"tenant": "nuevo-id"`
3. Agregar sus documentos en `data/documents.json`
4. Listo — el portal se adapta automáticamente

## Licencia

Propietario — ShipView SaaS
