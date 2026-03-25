require('dotenv').config();
const express = require('express');
const path    = require('path');
const db      = require('./lib/db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  const [tenantId, password] = token.split(':');
  if (!tenantId || !password) return res.status(401).json({ error: 'Token inválido' });
  db.verifyAdmin(tenantId, password).then(ok => {
    if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
    req.tenantId = tenantId;
    next();
  }).catch(() => res.status(500).json({ error: 'Error de autenticación' }));
}

// PUBLIC
app.get('/api/config/:tenant', async (req, res) => {
  const t = await db.getTenant(req.params.tenant);
  if (!t) return res.status(404).json({ error: 'Tenant no encontrado' });
  res.json(t);
});
app.get('/api/shipments/:tenant', async (req, res) => {
  res.json(await db.getShipments(req.params.tenant));
});
app.get('/api/shipments/:tenant/:id', async (req, res) => {
  const s = await db.getShipment(req.params.tenant, req.params.id);
  if (!s) return res.status(404).json({ error: 'No encontrado' });
  res.json(s);
});
app.get('/api/documents/:tenant', async (req, res) => {
  res.json(await db.getDocuments(req.params.tenant));
});
app.post('/api/contact', async (req, res) => {
  const { tenant, message, shipmentId } = req.body;
  if (!tenant || !message) return res.status(400).json({ error: 'Faltan campos' });
  await db.saveContact(tenant, shipmentId, message);
  res.json({ ok: true, message: 'Mensaje recibido. Tu ejecutivo responderá en breve.' });
});

// ADMIN AUTH
app.post('/api/admin/login', async (req, res) => {
  const { tenant, password } = req.body;
  if (!tenant || !password) return res.status(400).json({ error: 'Faltan campos' });
  const ok = await db.verifyAdmin(tenant, password);
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const t = await db.getTenant(tenant);
  res.json({ ok: true, token: `${tenant}:${password}`, tenant: t });
});

// ADMIN SHIPMENTS
app.get('/api/admin/shipments', requireAdmin, async (req, res) => {
  res.json(await db.getShipments(req.tenantId));
});
app.post('/api/admin/shipments', requireAdmin, async (req, res) => {
  try { res.json({ ok: true, id: await db.createShipment(req.tenantId, req.body) }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/shipments/:id', requireAdmin, async (req, res) => {
  try { await db.updateShipment(req.tenantId, req.params.id, req.body); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/admin/shipments/:id', requireAdmin, async (req, res) => {
  try { await db.deleteShipment(req.tenantId, req.params.id); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ADMIN DOCUMENTS
app.get('/api/admin/documents', requireAdmin, async (req, res) => {
  res.json(await db.getDocuments(req.tenantId));
});
app.post('/api/admin/documents', requireAdmin, async (req, res) => {
  try { res.json({ ok: true, id: await db.createDocument(req.tenantId, req.body) }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/admin/documents/:id', requireAdmin, async (req, res) => {
  try { await db.deleteDocument(req.tenantId, req.params.id); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ADMIN CONTACTS + TENANT
app.get('/api/admin/contacts', requireAdmin, async (req, res) => {
  res.json(await db.getContacts(req.tenantId));
});
app.put('/api/admin/tenant', requireAdmin, async (req, res) => {
  try { await db.updateTenant(req.tenantId, req.body); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// SPA catch-all
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ShipView running on http://localhost:${PORT}`);
  console.log(`  Admin: http://localhost:${PORT}/admin\n`);
});
