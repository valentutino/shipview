// db.js — database layer
// Uses Supabase when env vars are set, falls back to JSON files for local dev

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const USE_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

let supabase = null;
if (USE_SUPABASE) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  console.log('  DB: Supabase connected');
} else {
  console.log('  DB: Using local JSON files (set SUPABASE_URL + SUPABASE_KEY to use Supabase)');
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function readJSON(file) {
  delete require.cache[require.resolve(file)];
  return require(file);
}

function dataPath(file) {
  return path.join(__dirname, 'data', file);
}

// ─── TENANTS ──────────────────────────────────────────────────────────────────

async function getTenant(id) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  }
  const tenants = readJSON(dataPath('tenants.json'));
  return tenants[id] || null;
}

async function getAllTenants() {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('tenants').select('*').order('name');
    if (error) return [];
    return data;
  }
  const tenants = readJSON(dataPath('tenants.json'));
  return Object.values(tenants);
}

async function upsertTenant(tenant) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('tenants')
      .upsert(tenant, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const tenants = readJSON(dataPath('tenants.json'));
  tenants[tenant.id] = { ...tenants[tenant.id], ...tenant };
  require('fs').writeFileSync(dataPath('tenants.json'), JSON.stringify(tenants, null, 2));
  return tenants[tenant.id];
}

// ─── SHIPMENTS ────────────────────────────────────────────────────────────────

async function getShipments(tenantId) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('tenant', tenantId)
      .neq('status', 'archivado')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data.map(deserializeShipment);
  }
  const all = readJSON(dataPath('shipments.json'));
  return all.filter(s => s.tenant === tenantId && s.status !== 'archivado');
}

async function getShipment(tenantId, id) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('tenant', tenantId)
      .eq('id', id)
      .single();
    if (error) return null;
    return deserializeShipment(data);
  }
  const all = readJSON(dataPath('shipments.json'));
  return all.find(s => s.tenant === tenantId && s.id === id) || null;
}

async function createShipment(shipment) {
  if (USE_SUPABASE) {
    const row = serializeShipment(shipment);
    const { data, error } = await supabase
      .from('shipments')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return deserializeShipment(data);
  }
  const fs = require('fs');
  const all = readJSON(dataPath('shipments.json'));
  all.unshift(shipment);
  fs.writeFileSync(dataPath('shipments.json'), JSON.stringify(all, null, 2));
  return shipment;
}

async function updateShipment(tenantId, id, updates) {
  if (USE_SUPABASE) {
    const row = serializeShipment(updates);
    const { data, error } = await supabase
      .from('shipments')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('tenant', tenantId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return deserializeShipment(data);
  }
  const fs = require('fs');
  const all = readJSON(dataPath('shipments.json'));
  const idx = all.findIndex(s => s.tenant === tenantId && s.id === id);
  if (idx === -1) throw new Error('Shipment not found');
  all[idx] = { ...all[idx], ...updates };
  fs.writeFileSync(dataPath('shipments.json'), JSON.stringify(all, null, 2));
  return all[idx];
}

async function deleteShipment(tenantId, id) {
  if (USE_SUPABASE) {
    const { error } = await supabase
      .from('shipments')
      .delete()
      .eq('tenant', tenantId)
      .eq('id', id);
    if (error) throw error;
    return true;
  }
  const fs = require('fs');
  const all = readJSON(dataPath('shipments.json'));
  const filtered = all.filter(s => !(s.tenant === tenantId && s.id === id));
  fs.writeFileSync(dataPath('shipments.json'), JSON.stringify(filtered, null, 2));
  return true;
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

async function getDocuments(tenantId) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('tenant', tenantId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data;
  }
  const all = readJSON(dataPath('documents.json'));
  return all.filter(d => d.tenant === tenantId);
}

async function createDocument(doc) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('documents')
      .insert(doc)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const fs = require('fs');
  const all = readJSON(dataPath('documents.json'));
  all.unshift(doc);
  fs.writeFileSync(dataPath('documents.json'), JSON.stringify(all, null, 2));
  return doc;
}

async function deleteDocument(tenantId, id) {
  if (USE_SUPABASE) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('tenant', tenantId)
      .eq('id', id);
    if (error) throw error;
    return true;
  }
  const fs = require('fs');
  const all = readJSON(dataPath('documents.json'));
  const filtered = all.filter(d => !(d.tenant === tenantId && d.id === id));
  fs.writeFileSync(dataPath('documents.json'), JSON.stringify(filtered, null, 2));
  return true;
}

// ─── SERIALIZERS (Supabase stores JSON columns as JSONB) ──────────────────────

function serializeShipment(s) {
  return {
    ...s,
    origin:      typeof s.origin === 'string'      ? s.origin      : JSON.stringify(s.origin),
    destination: typeof s.destination === 'string' ? s.destination : JSON.stringify(s.destination),
    timeline:    typeof s.timeline === 'string'    ? s.timeline    : JSON.stringify(s.timeline),
  };
}

function deserializeShipment(s) {
  return {
    ...s,
    origin:      typeof s.origin === 'string'      ? JSON.parse(s.origin)      : s.origin,
    destination: typeof s.destination === 'string' ? JSON.parse(s.destination) : s.destination,
    timeline:    typeof s.timeline === 'string'    ? JSON.parse(s.timeline)    : s.timeline,
  };
}

module.exports = {
  getTenant, getAllTenants, upsertTenant,
  getShipments, getShipment, createShipment, updateShipment, deleteShipment,
  getDocuments, createDocument, deleteDocument,
  USE_SUPABASE,
};
