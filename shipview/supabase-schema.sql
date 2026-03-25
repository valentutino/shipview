-- ═══════════════════════════════════════════
-- SHIPVIEW — Schema completo para Supabase
-- Ejecutar en: Supabase → SQL Editor → New query
-- ═══════════════════════════════════════════

-- TENANTS (forwarders)
create table if not exists tenants (
  id                  text primary key,
  name                text not null,
  initials            text not null,
  tagline             text,
  color_primary       text not null default '#0B1929',
  color_accent        text not null default '#00C896',
  color_accent_hover  text not null default '#00a07a',
  admin_password      text not null default 'admin123',
  client_name         text not null,
  client_initials     text not null,
  client_contact      text,
  account_manager     text,
  account_manager_email text,
  created_at          timestamptz default now()
);

-- SHIPMENTS (embarques)
create table if not exists shipments (
  id                    text primary key,
  tenant                text not null references tenants(id) on delete cascade,
  status                text not null check (status in ('transit','aduana','alerta','preparando','entregado')),
  mode                  text not null check (mode in ('sea','air','road','rail')) default 'sea',
  product               text not null,
  detail                text,
  origin_flag           text,
  origin_city           text,
  origin_country        text,
  origin_port           text,
  destination_flag      text,
  destination_city      text,
  destination_country   text,
  destination_port      text,
  eta                   date,
  etd                   date,
  progress              integer not null default 0 check (progress >= 0 and progress <= 100),
  alert_message         text,
  alert_sub             text,
  container             text,
  container_type        text,
  carrier               text,
  voyage                text,
  incoterm              text,
  customs_agent         text,
  customs_agent_phone   text,
  destination_agent     text,
  destination_agent_phone text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- TIMELINE STEPS (pasos del embarque)
create table if not exists timeline_steps (
  id          serial primary key,
  shipment_id text not null references shipments(id) on delete cascade,
  tenant      text not null,
  step_order  integer not null,
  label       text not null,
  date_label  text,
  state       text not null check (state in ('done','current','pending','alert')),
  icon        text,
  created_at  timestamptz default now()
);

-- DOCUMENTS (documentos por operación)
create table if not exists documents (
  id          text primary key,
  tenant      text not null references tenants(id) on delete cascade,
  shipment_id text references shipments(id) on delete set null,
  type        text not null,
  icon        text default '📄',
  icon_bg     text default '#E6F1FB',
  filename    text not null,
  size        text,
  is_new      boolean default false,
  created_at  timestamptz default now()
);

-- CONTACT MESSAGES (mensajes del cliente)
create table if not exists contact_messages (
  id          serial primary key,
  tenant      text not null,
  shipment_id text,
  message     text not null,
  client_name text,
  status      text default 'pending',
  created_at  timestamptz default now()
);

-- ═══════════════════════════════════════════
-- DATOS INICIALES — LATEAM FOODS
-- ═══════════════════════════════════════════

insert into tenants (id, name, initials, tagline, color_primary, color_accent, color_accent_hover, admin_password, client_name, client_initials, client_contact, account_manager, account_manager_email) values
('lateam',   'LATEAM FOODS',   'LF', 'Comercio exterior de alimentos · LATAM', '#0A1628', '#00C896', '#00a07a', 'lateam2025',   'Grupo Distribuciones SA', 'GD', '+54 11 4800-0000', 'Valentina Torres',  'v.torres@lateamfoods.com'),
('nipcargo',  'NIP CARGO',      'NC', 'Soluciones logísticas internacionales',  '#0c2044', '#3B8BD4', '#2a6fb8', 'nipcargo2025', 'Alimentos del Centro SA', 'AC', '+54 341 420-0000', 'Rodrigo Méndez',    'r.mendez@nipcargo.com'),
('aramis',    'ARAMIS GT',      'AG', 'Freight forwarder internacional',         '#1a1a1a', '#F59E0B', '#d97706', 'aramis2025',   'Transportes Río SA',      'TR', '+54 11 5200-0000', 'Carolina Ríos',     'c.rios@aramis-gt.com'),
('silver',    'SILVER FREIGHT', 'SF', 'Logística marítima y aérea',              '#1c2a3a', '#F97316', '#ea6c0a', 'silver2025',   'Exportadora Sur SRL',     'ES', '+54 261 430-0000', 'Martín Álvarez',    'm.alvarez@silverfreight.com')
on conflict (id) do nothing;

insert into shipments (id, tenant, status, mode, product, detail, origin_flag, origin_city, origin_country, origin_port, destination_flag, destination_city, destination_country, destination_port, eta, etd, progress, alert_message, alert_sub, container, container_type, carrier, voyage, incoterm, customs_agent, customs_agent_phone, destination_agent, destination_agent_phone) values
('OP-2025-033','lateam','alerta','sea','Arroz grano largo','22 toneladas · FCL 40''','🇦🇷','Buenos Aires','Argentina','Puerto Buenos Aires','🇧🇷','Santos','Brasil','Porto de Santos',null,'2025-03-10',35,'Certificado fitosanitario SENASA faltante','Operación bloqueada en aduana de origen','MSCU7823401','FCL 40''','MSC Línea','—','FOB Buenos Aires','Estudio Romero','+54 11 4321-0000','Porto Agentes Brasil','+55 13 3200-0000'),
('OP-2025-038','lateam','aduana','sea','Cóctel de frutas Pavlides','18 toneladas · FCL 20''','🇬🇷','Piraeus','Grecia','Port of Piraeus','🇬🇹','Puerto Quetzal','Guatemala','Puerto Quetzal','2025-03-27','2025-03-01',88,'Demora 2 días en SAT Guatemala','Referencia SAT: GT-2025-8821','HLXU4401223','FCL 20''','Hapag-Lloyd','HX241E','CIF Puerto Quetzal','Agencia Centrocom GT','+502 7800-0000','Agencia Centrocom GT','+502 7800-0000'),
('OP-2025-041','lateam','transit','sea','Duraznos en almíbar Pavlides','20 toneladas · FCL 40''','🇬🇷','Piraeus','Grecia','Port of Piraeus','🇨🇱','Valparaíso','Chile','Terminal Pacífico Sur','2025-03-28','2025-02-28',78,null,'On time · Sin novedades','MSCU1192847','FCL 40''','MSC Cristina','ME241W','CIF Valparaíso','Agencia Aduanera Chile','+56 32 225-0000','Agencia Aduanera Chile','+56 32 225-0000'),
('OP-2025-035','lateam','transit','sea','Aceite de oliva extra virgen','15 toneladas · LCL','🇮🇹','Génova','Italia','Porto di Genova','🇵🇪','Callao','Perú','Terminal Callao','2025-04-02','2025-03-08',55,null,'On time · Sin novedades','LCL Consolidado','LCL','Hapag-Lloyd','HL241S','CIF Callao','Perú Port Agents SAC','+51 1 615-0000','Perú Port Agents SAC','+51 1 615-0000'),
('OP-2025-042','lateam','preparando','sea','Conservas de tomate italiano','12 toneladas · FCL 20''','🇮🇹','Nápoles','Italia','Porto di Napoli','🇲🇽','Veracruz','México','Puerto de Veracruz','2025-04-28','2025-04-10',15,'Póliza de seguro pendiente','Confirmar cobertura antes del embarque','Pendiente asignación','FCL 20''','CMA CGM','Pendiente','FOB Nápoles','Agencia México Ports','+52 229 930-0000','Agencia México Ports','+52 229 930-0000')
on conflict (id) do nothing;

insert into timeline_steps (shipment_id, tenant, step_order, label, date_label, state, icon) values
('OP-2025-033','lateam',1,'Reserva confirmada','05 Mar 2025','done','✓'),
('OP-2025-033','lateam',2,'Consolidación','10 Mar 2025','done','✓'),
('OP-2025-033','lateam',3,'Aduana origen','Detenido','alert','⚠'),
('OP-2025-033','lateam',4,'En tránsito','Pendiente','pending',''),
('OP-2025-033','lateam',5,'Entrega destino','Pendiente','pending',''),
('OP-2025-038','lateam',1,'Reserva confirmada','20 Feb 2025','done','✓'),
('OP-2025-038','lateam',2,'Zarpó de Piraeus','01 Mar 2025','done','✓'),
('OP-2025-038','lateam',3,'Arribó al puerto','23 Mar 2025','done','✓'),
('OP-2025-038','lateam',4,'Aduana Guatemala','En proceso','current','⏳'),
('OP-2025-038','lateam',5,'Entrega destino','~27 Mar 2025','pending',''),
('OP-2025-041','lateam',1,'Reserva confirmada','15 Feb 2025','done','✓'),
('OP-2025-041','lateam',2,'Zarpó de Piraeus','28 Feb 2025','done','✓'),
('OP-2025-041','lateam',3,'En tránsito','Mar Mediterráneo','current','🚢'),
('OP-2025-041','lateam',4,'Aduana Chile','~28 Mar 2025','pending',''),
('OP-2025-041','lateam',5,'Entrega destino','~02 Abr 2025','pending',''),
('OP-2025-035','lateam',1,'Reserva confirmada','20 Feb 2025','done','✓'),
('OP-2025-035','lateam',2,'Zarpó de Génova','08 Mar 2025','done','✓'),
('OP-2025-035','lateam',3,'En tránsito','Atlántico Sur','current','🚢'),
('OP-2025-035','lateam',4,'Aduana Perú','~31 Mar 2025','pending',''),
('OP-2025-035','lateam',5,'Entrega destino','~02 Abr 2025','pending',''),
('OP-2025-042','lateam',1,'Reserva confirmada','18 Mar 2025','done','✓'),
('OP-2025-042','lateam',2,'Consolidación','En proceso','current','📦'),
('OP-2025-042','lateam',3,'Zarpe','10 Abr 2025','pending',''),
('OP-2025-042','lateam',4,'En tránsito','~18 Abr 2025','pending',''),
('OP-2025-042','lateam',5,'Entrega destino','~28 Abr 2025','pending','')
on conflict do nothing;

insert into documents (id, tenant, shipment_id, type, icon, icon_bg, filename, size, is_new) values
('doc-001','lateam','OP-2025-038','Bill of Lading','📜','#E6F1FB','BL_OP2025-038_MSC.pdf','312 KB',true),
('doc-002','lateam','OP-2025-041','Packing List','📋','#E1F5EE','PackingList_OP2025-041.pdf','245 KB',true),
('doc-003','lateam','OP-2025-041','Certificado de Origen','🏛️','#FAEEDA','CertOrigen_OP2025-041_GR.pdf','118 KB',false),
('doc-004','lateam','OP-2025-038','Invoice comercial','🧾','#E1F5EE','Invoice_OP2025-038.pdf','88 KB',false),
('doc-005','lateam','OP-2025-035','Póliza de seguro','🛡️','#EEEDFE','Poliza_OP2025-035.pdf','201 KB',false)
on conflict (id) do nothing;
