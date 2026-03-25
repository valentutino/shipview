const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── API ROUTES ───────────────────────────────────────────

// GET /api/config/:tenant  → brand config for white-label
app.get('/api/config/:tenant', (req, res) => {
  const tenants = require('./data/tenants.json');
  const tenant = tenants[req.params.tenant];
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  res.json(tenant);
});

// GET /api/shipments/:tenant  → all active shipments for a client
app.get('/api/shipments/:tenant', (req, res) => {
  const shipments = require('./data/shipments.json');
  const result = shipments.filter(s => s.tenant === req.params.tenant);
  res.json(result);
});

// GET /api/shipments/:tenant/:id  → single shipment detail
app.get('/api/shipments/:tenant/:id', (req, res) => {
  const shipments = require('./data/shipments.json');
  const item = shipments.find(s => s.tenant === req.params.tenant && s.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Shipment not found' });
  res.json(item);
});

// GET /api/documents/:tenant  → documents list
app.get('/api/documents/:tenant', (req, res) => {
  const docs = require('./data/documents.json');
  const result = docs.filter(d => d.tenant === req.params.tenant);
  res.json(result);
});

// POST /api/contact  → contact form submission
app.post('/api/contact', (req, res) => {
  const { tenant, message, shipmentId } = req.body;
  // In production: send email, create ticket, etc.
  console.log(`[CONTACT] tenant=${tenant} shipment=${shipmentId} msg="${message}"`);
  res.json({ ok: true, message: 'Mensaje recibido. Tu ejecutivo responderá en breve.' });
});

// Catch-all: serve the SPA for any non-API route
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ShipView server running on http://localhost:${PORT}`);
  console.log(`  Demo tenants: /lateam  /nipcargo  /aramis  /silver\n`);
});
