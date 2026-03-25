require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ── Supabase client (null if env vars not set → fallback to JSON) ──────────
let supabase = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  console.log('  Database: Supabase ✓');
} else {
  console.log('  Database: JSON files (set SUPABASE_URL + SUPABASE_ANON_KEY to use Supabase)');
}

// ── JSON fallback helpers ─────────────────────────────────────────────────
function jsonTenants()   { return require('../data/tenants.json'); }
function jsonShipments() { return require('../data/shipments.json'); }
function jsonDocuments() { return require('../data/documents.json'); }

// ── Map DB row → API shape ────────────────────────────────────────────────
function mapTenant(row) {
  return {
    id:               row.id,
    name:             row.name,
    initials:         row.initials,
    tagline:          row.tagline,
    colorPrimary:     row.color_primary,
    colorAccent:      row.color_accent,
    colorAccentHover: row.color_accent_hover,
    client: {
      name:                  row.client_name,
      initials:              row.client_initials,
      contact:               row.client_contact,
      account_manager:       row.account_manager,
      account_manager_email: row.account_manager_email,
    }
  };
}

function mapShipment(row, steps = []) {
  return {
    id:      row.id,
    tenant:  row.tenant,
    status:  row.status,
    mode:    row.mode,
    product: row.product,
    detail:  row.detail,
    origin: {
      flag:    row.origin_flag,
      city:    row.origin_city,
      country: row.origin_country,
      port:    row.origin_port,
    },
    destination: {
      flag:    row.destination_flag,
      city:    row.destination_city,
      country: row.destination_country,
      port:    row.destination_port,
    },
    eta:            row.eta,
    etd:            row.etd,
    progress:       row.progress,
    progressColor:  statusColor(row.status),
    alertMessage:   row.alert_message,
    alertSub:       row.alert_sub,
    container:      row.container,
    containerType:  row.container_type,
    carrier:        row.carrier,
    voyage:         row.voyage,
    incoterm:       row.incoterm,
    customs_agent:        row.customs_agent,
    customs_agent_phone:  row.customs_agent_phone,
    destination_agent:        row.destination_agent,
    destination_agent_phone:  row.destination_agent_phone,
    timeline: steps
      .sort((a, b) => a.step_order - b.step_order)
      .map(s => ({
        label: s.label,
        date:  s.date_label,
        state: s.state,
        icon:  s.icon || '',
      })),
  };
}

function mapDocument(row) {
  return {
    id:         row.id,
    tenant:     row.tenant,
    shipmentId: row.shipment_id,
    type:       row.type,
    icon:       row.icon,
    iconBg:     row.icon_bg,
    filename:   row.filename,
    size:       row.size,
    date:       new Date(row.created_at).toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' }),
    isNew:      row.is_new,
  };
}

function statusColor(status) {
  return { transit:'#185FA5', aduana:'#E8A020', alerta:'#D94040', preparando:'#534AB7', entregado:'#1A9E5E' }[status] || '#B0BBCA';
}

// ═══════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════

// ── getTenant ─────────────────────────────
async function getTenant(id) {
  if (!supabase) {
    const t = jsonTenants()[id];
    return t || null;
  }
  const { data, error } = await supabase.from('tenants').select('*').eq('id', id).single();
  if (error || !data) return null;
  return mapTenant(data);
}

// ── getAllTenants ──────────────────────────
async function getAllTenants() {
  if (!supabase) {
    return Object.values(jsonTenants()).map(t => ({
      id: t.id, name: t.name, initials: t.initials,
      colorPrimary: t.colorPrimary, colorAccent: t.colorAccent,
      client: t.client,
    }));
  }
  const { data, error } = await supabase.from('tenants').select('*').order('name');
  if (error) return [];
  return data.map(mapTenant);
}

// ── verifyAdmin ───────────────────────────
async function verifyAdmin(tenantId, password) {
  if (!supabase) {
    const t = jsonTenants()[tenantId];
    return t ? password === 'admin123' : false;
  }
  const { data, error } = await supabase
    .from('tenants').select('admin_password').eq('id', tenantId).single();
  if (error || !data) return false;
  return data.admin_password === password;
}

// ── getShipments ──────────────────────────
async function getShipments(tenantId) {
  if (!supabase) {
    return jsonShipments().filter(s => s.tenant === tenantId);
  }
  const [shipsRes, stepsRes] = await Promise.all([
    supabase.from('shipments').select('*').eq('tenant', tenantId).order('created_at', { ascending: false }),
    supabase.from('timeline_steps').select('*').eq('tenant', tenantId),
  ]);
  if (shipsRes.error) return [];
  const steps = stepsRes.data || [];
  return shipsRes.data.map(row =>
    mapShipment(row, steps.filter(s => s.shipment_id === row.id))
  );
}

// ── getShipment ───────────────────────────
async function getShipment(tenantId, id) {
  if (!supabase) {
    return jsonShipments().find(s => s.tenant === tenantId && s.id === id) || null;
  }
  const [shipRes, stepsRes] = await Promise.all([
    supabase.from('shipments').select('*').eq('tenant', tenantId).eq('id', id).single(),
    supabase.from('timeline_steps').select('*').eq('shipment_id', id).order('step_order'),
  ]);
  if (shipRes.error || !shipRes.data) return null;
  return mapShipment(shipRes.data, stepsRes.data || []);
}

// ── createShipment ────────────────────────
async function createShipment(tenantId, data) {
  const id = data.id || `OP-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`;

  if (!supabase) {
    throw new Error('Supabase no configurado — no se puede guardar en JSON en producción.');
  }

  const row = {
    id,
    tenant:                   tenantId,
    status:                   data.status || 'preparando',
    mode:                     data.mode   || 'sea',
    product:                  data.product,
    detail:                   data.detail,
    origin_flag:              data.originFlag,
    origin_city:              data.originCity,
    origin_country:           data.originCountry,
    origin_port:              data.originPort,
    destination_flag:         data.destinationFlag,
    destination_city:         data.destinationCity,
    destination_country:      data.destinationCountry,
    destination_port:         data.destinationPort,
    eta:                      data.eta    || null,
    etd:                      data.etd    || null,
    progress:                 parseInt(data.progress) || 0,
    alert_message:            data.alertMessage    || null,
    alert_sub:                data.alertSub        || null,
    container:                data.container       || null,
    container_type:           data.containerType   || null,
    carrier:                  data.carrier         || null,
    voyage:                   data.voyage          || null,
    incoterm:                 data.incoterm        || null,
    customs_agent:            data.customsAgent    || null,
    customs_agent_phone:      data.customsPhone    || null,
    destination_agent:        data.destAgent       || null,
    destination_agent_phone:  data.destPhone       || null,
  };

  const { error } = await supabase.from('shipments').insert(row);
  if (error) throw error;

  // Insert default timeline steps
  const defaultSteps = buildDefaultTimeline(id, tenantId, data.status || 'preparando', data.etd, data.eta);
  if (defaultSteps.length) {
    await supabase.from('timeline_steps').insert(defaultSteps);
  }

  return id;
}

// ── updateShipment ────────────────────────
async function updateShipment(tenantId, id, data) {
  if (!supabase) throw new Error('Supabase no configurado.');

  const updates = {};
  if (data.status   !== undefined) updates.status   = data.status;
  if (data.progress !== undefined) updates.progress = parseInt(data.progress);
  if (data.eta      !== undefined) updates.eta      = data.eta || null;
  if (data.etd      !== undefined) updates.etd      = data.etd || null;
  if (data.alertMessage !== undefined) updates.alert_message = data.alertMessage || null;
  if (data.alertSub     !== undefined) updates.alert_sub     = data.alertSub     || null;
  if (data.container    !== undefined) updates.container     = data.container;
  if (data.containerType!== undefined) updates.container_type= data.containerType;
  if (data.carrier      !== undefined) updates.carrier       = data.carrier;
  if (data.voyage       !== undefined) updates.voyage        = data.voyage;
  if (data.incoterm     !== undefined) updates.incoterm      = data.incoterm;
  if (data.product      !== undefined) updates.product       = data.product;
  if (data.detail       !== undefined) updates.detail        = data.detail;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase.from('shipments')
    .update(updates).eq('id', id).eq('tenant', tenantId);
  if (error) throw error;

  // Update timeline steps if provided
  if (data.timeline && Array.isArray(data.timeline)) {
    await supabase.from('timeline_steps').delete().eq('shipment_id', id);
    const steps = data.timeline.map((s, i) => ({
      shipment_id: id,
      tenant:      tenantId,
      step_order:  i + 1,
      label:       s.label,
      date_label:  s.date,
      state:       s.state,
      icon:        s.icon || '',
    }));
    if (steps.length) await supabase.from('timeline_steps').insert(steps);
  }

  return true;
}

// ── deleteShipment ────────────────────────
async function deleteShipment(tenantId, id) {
  if (!supabase) throw new Error('Supabase no configurado.');
  const { error } = await supabase.from('shipments')
    .delete().eq('id', id).eq('tenant', tenantId);
  if (error) throw error;
  return true;
}

// ── getDocuments ──────────────────────────
async function getDocuments(tenantId) {
  if (!supabase) {
    return jsonDocuments().filter(d => d.tenant === tenantId);
  }
  const { data, error } = await supabase.from('documents')
    .select('*').eq('tenant', tenantId).order('created_at', { ascending: false });
  if (error) return [];
  return data.map(mapDocument);
}

// ── createDocument ────────────────────────
async function createDocument(tenantId, data) {
  if (!supabase) throw new Error('Supabase no configurado.');
  const id = `doc-${Date.now()}`;
  const row = {
    id,
    tenant:      tenantId,
    shipment_id: data.shipmentId || null,
    type:        data.type,
    icon:        data.icon    || '📄',
    icon_bg:     data.iconBg  || '#E6F1FB',
    filename:    data.filename,
    size:        data.size    || null,
    is_new:      true,
  };
  const { error } = await supabase.from('documents').insert(row);
  if (error) throw error;
  return id;
}

// ── deleteDocument ────────────────────────
async function deleteDocument(tenantId, id) {
  if (!supabase) throw new Error('Supabase no configurado.');
  const { error } = await supabase.from('documents')
    .delete().eq('id', id).eq('tenant', tenantId);
  if (error) throw error;
  return true;
}

// ── saveContact ───────────────────────────
async function saveContact(tenantId, shipmentId, message) {
  if (!supabase) return true; // silently ok in JSON mode
  const { error } = await supabase.from('contact_messages').insert({
    tenant: tenantId, shipment_id: shipmentId || null, message,
  });
  if (error) console.error('contact save error:', error);
  return true;
}

// ── getContacts ───────────────────────────
async function getContacts(tenantId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('contact_messages')
    .select('*').eq('tenant', tenantId).order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

// ── updateTenant (branding) ───────────────
async function updateTenant(id, data) {
  if (!supabase) throw new Error('Supabase no configurado.');
  const updates = {};
  if (data.name)              updates.name              = data.name;
  if (data.colorPrimary)      updates.color_primary     = data.colorPrimary;
  if (data.colorAccent)       updates.color_accent      = data.colorAccent;
  if (data.colorAccentHover)  updates.color_accent_hover= data.colorAccentHover;
  if (data.adminPassword)     updates.admin_password    = data.adminPassword;
  if (data.accountManager)    updates.account_manager   = data.accountManager;
  if (data.accountManagerEmail) updates.account_manager_email = data.accountManagerEmail;
  const { error } = await supabase.from('tenants').update(updates).eq('id', id);
  if (error) throw error;
  return true;
}

// ── Helpers ───────────────────────────────
function buildDefaultTimeline(shipmentId, tenant, status, etd, eta) {
  const etdStr = etd ? new Date(etd).toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'}) : '—';
  const etaStr = eta ? new Date(eta).toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'}) : '—';

  const base = [
    { label:'Reserva confirmada', date_label: new Date().toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'}), state:'done',    icon:'✓' },
    { label:'Consolidación',      date_label: 'Pendiente',  state:'pending', icon:'' },
    { label:'Zarpe',              date_label: etdStr,       state:'pending', icon:'' },
    { label:'En tránsito',        date_label: 'Pendiente',  state:'pending', icon:'' },
    { label:'Entrega destino',    date_label: etaStr,       state:'pending', icon:'' },
  ];

  if (status === 'preparando') base[1].state = 'current';
  else if (status === 'transit') { base[1].state = 'done'; base[1].icon = '✓'; base[2].state = 'done'; base[2].icon = '✓'; base[3].state = 'current'; }
  else if (status === 'aduana')  { base.slice(0,4).forEach(s=>{ s.state='done'; s.icon='✓'; }); base[3].state='current'; }
  else if (status === 'alerta')  { base[0].state='done'; base[0].icon='✓'; base[1].state='done'; base[1].icon='✓'; base[2].state='alert'; base[2].icon='⚠'; }
  else if (status === 'entregado') { base.forEach(s=>{ s.state='done'; s.icon='✓'; }); }

  return base.map((s, i) => ({ shipment_id: shipmentId, tenant, step_order: i+1, ...s }));
}

module.exports = {
  getTenant, getAllTenants, verifyAdmin, updateTenant,
  getShipments, getShipment, createShipment, updateShipment, deleteShipment,
  getDocuments, createDocument, deleteDocument,
  saveContact, getContacts,
};
