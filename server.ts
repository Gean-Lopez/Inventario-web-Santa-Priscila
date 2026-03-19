import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { isIP } from 'node:net';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import multer from 'multer';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 5000);

const JWT_SECRET = process.env.JWT_SECRET || 'inventario-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '10m';
const JWT_ISSUER = process.env.JWT_ISSUER || 'inventario-web';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'inventario-admin';

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const LOGIN_FAILED_THRESHOLD = Number(process.env.LOGIN_FAILED_THRESHOLD || 5);
const LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 15);

const LOGIN_RATE_LIMIT_IP_MAX = Number(process.env.LOGIN_RATE_LIMIT_IP_MAX || 20);
const LOGIN_RATE_LIMIT_USER_MAX = Number(process.env.LOGIN_RATE_LIMIT_USER_MAX || 10);
const LOGIN_RATE_LIMIT_WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);

const WRITE_RATE_LIMIT_IP_MAX = Number(process.env.WRITE_RATE_LIMIT_IP_MAX || 60);
const WRITE_RATE_LIMIT_USER_MAX = Number(process.env.WRITE_RATE_LIMIT_USER_MAX || 40);
const WRITE_RATE_LIMIT_WINDOW_MS = Number(process.env.WRITE_RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000);
const WRITE_RATE_LIMIT_BLOCK_MS = Number(process.env.WRITE_RATE_LIMIT_BLOCK_MS || 10 * 60 * 1000);

const SIMILARITY_THRESHOLD = Number(process.env.SIMILARITY_THRESHOLD || 0.92);

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventario_web',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
});

type JwtClaims = jwt.JwtPayload & {
  id: number;
  username: string;
  role: string;
  jti: string;
};

type SecurityContext = {
  ip: string;
  requestId: string;
};

type AuthenticatedRequest = Request & {
  user?: JwtClaims;
  security?: SecurityContext;
};

type AuditSeverity = 'info' | 'warn' | 'error';

type AuditEntry = {
  eventType: string;
  severity?: AuditSeverity;
  success?: boolean;
  ip?: string;
  username?: string | null;
  userId?: number | null;
  route?: string;
  method?: string;
  targetType?: string | null;
  targetId?: string | number | null;
  reason?: string | null;
  details?: Record<string, unknown> | null;
};

type ValidatorResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type RateLimitState = {
  hits: number[];
  blockedUntil: number;
};

type LoginPayload = {
  username: string;
  password: string;
};

type SimilarResult = {
  exists: boolean;
  reason?: string;
  score?: number;
  record?: Record<string, any>;
};

const SAFE_TEXT_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,_:/()@#&+\-\[\]]+$/;
const SAFE_IDENTIFIER_REGEX = /^[A-Za-z0-9._-]+$/;
const SAFE_LICENSE_REGEX = /^[A-Za-z0-9-]+$/;
const SAFE_MAC_REGEX = /^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i;
const SAFE_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const YES_NO_VALUES = ['SI', 'NO'] as const;
const TIPO_RECURSO_VALUES = ['LAPTOP', 'CPU', 'NUC', 'ALL-IN-ONE', 'DESKTOP', 'AIO'] as const;

const LOGIN_ALLOWED_KEYS = ['username', 'password'] as const;

const EQUIPO_ALLOWED_KEYS = [
  'empresa',
  'establecimiento',
  'departamento',
  'area',
  'jefe_area',
  'responsable_equipo',
  'fecha_adquisicion',
  'fecha_instalacion',
  'proveedor',
  'tipo_recurso',
  'marca',
  'modelo',
  'modelo_pc',
  'nombre_host',
  'nombre_pc',
  'active_directory',
  'dominio',
  'usuario',
  'contrasena',
  'sistema_operativo',
  'tiene_licencia_windows',
  'codigo_licencia_windows',
  'tiene_licencia_office',
  'mac_address',
  'direccion_mac',
  'mac_address2',
  'ip',
  'direccion_ip',
  'ip_extendida',
  'serie',
  'no_serie',
  'procesador',
  'ram',
  'ram_gb',
  'disco',
  'disco_gb',
  'antivirus',
  'tiene_mouse',
  'tiene_teclado',
  'tiene_parlante',
  'tipo_tarjeta_red',
  'ubicacion',
  'fecha_inventario',
  'responsable_inventario',
  'fecha_mantenimiento',
  'detalle_mantenimiento',
  'activo',
  'observacion',
  'observaciones',
  'etiquetado',
] as const;

type EquipoPayload = Partial<Record<(typeof EQUIPO_ALLOWED_KEYS)[number], unknown>>;

const DB_COLUMNS = [
  'empresa',
  'establecimiento',
  'departamento',
  'area',
  'jefe_area',
  'responsable_equipo',
  'fecha_adquisicion',
  'fecha_instalacion',
  'proveedor',
  'tipo_recurso',
  'marca',
  'modelo',
  'modelo_pc',
  'nombre_host',
  'nombre_pc',
  'active_directory',
  'dominio',
  'usuario',
  'contrasena',
  'sistema_operativo',
  'tiene_licencia_windows',
  'codigo_licencia_windows',
  'tiene_licencia_office',
  'mac_address',
  'direccion_mac',
  'mac_address2',
  'ip',
  'direccion_ip',
  'ip_extendida',
  'serie',
  'no_serie',
  'procesador',
  'ram',
  'ram_gb',
  'disco',
  'disco_gb',
  'antivirus',
  'tiene_mouse',
  'tiene_teclado',
  'tiene_parlante',
  'tipo_tarjeta_red',
  'ubicacion',
  'fecha_inventario',
  'responsable_inventario',
  'fecha_mantenimiento',
  'detalle_mantenimiento',
  'activo',
  'observacion',
  'observaciones',
  'etiquetado',
] as const;

type EquipoRecord = Record<(typeof DB_COLUMNS)[number], string | number | null>;

const rateLimitBuckets = new Map<string, RateLimitState>();

const sortableFields = new Set([
  'id',
  'fecha_inventario',
  'fecha_adquisicion',
  'fecha_instalacion',
  'fecha_mantenimiento',
  'nombre_host',
  'nombre_pc',
  'responsable_equipo',
  'departamento',
  'area',
  'serie',
  'marca',
  'modelo',
  'activo',
]);

const filterableFields = new Set([
  'all',
  'nombre_pc',
  'nombre_host',
  'usuario',
  'responsable_equipo',
  'ip',
  'mac_address',
  'departamento',
  'area',
  'establecimiento',
  'serie',
  'marca',
  'modelo',
  'procesador',
  'tipo_recurso',
  'activo',
  'antivirus',
  'etiquetado',
]);

function nowIso() {
  return new Date().toISOString();
}

function getClientIp(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  const remoteAddress = req.socket.remoteAddress || req.ip || 'unknown';
  return remoteAddress.replace(/^::ffff:/, '');
}

function normalizeUsername(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function toDbDate(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  if (!SAFE_DATE_REGEX.test(text)) return null;
  return text;
}

function clampString(value: unknown, max: number) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, max);
}

function normalizeCompareText(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function buildBigrams(text: string) {
  const source = normalizeCompareText(text);
  if (source.length < 2) return new Set(source ? [source] : []);
  const grams = new Set<string>();
  for (let index = 0; index < source.length - 1; index += 1) {
    grams.add(source.slice(index, index + 2));
  }
  return grams;
}

function similarityScore(a: unknown, b: unknown) {
  const left = buildBigrams(String(a || ''));
  const right = buildBigrams(String(b || ''));
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const gram of left) {
    if (right.has(gram)) overlap += 1;
  }
  return (2 * overlap) / (left.size + right.size);
}

function securityLog(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
  const payload = {
    ts: nowIso(),
    level,
    message,
    ...(meta || {}),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

async function auditEvent(entry: AuditEntry) {
  securityLog(
    entry.severity === 'error' ? 'error' : entry.severity === 'warn' ? 'warn' : 'info',
    entry.eventType,
    {
      success: entry.success !== false,
      ip: entry.ip,
      username: entry.username,
      route: entry.route,
      reason: entry.reason,
      details: entry.details,
    }
  );

  try {
    await pool.query(
      `
        INSERT INTO security_audit (
          event_type, severity, success, ip, username, user_id, route,
          method, target_type, target_id, reason, details_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        entry.eventType,
        entry.severity || 'info',
        entry.success === false ? 0 : 1,
        entry.ip || null,
        entry.username || null,
        entry.userId ?? null,
        entry.route || null,
        entry.method || null,
        entry.targetType || null,
        entry.targetId != null ? String(entry.targetId) : null,
        entry.reason || null,
        entry.details ? JSON.stringify(entry.details) : null,
      ]
    );
  } catch (error) {
    securityLog('error', 'audit_persist_failed', { error: String(error) });
  }
}

function validatorOk<T>(value: T): ValidatorResult<T> {
  return { ok: true, value };
}

function validatorError<T>(error: string): ValidatorResult<T> {
  return { ok: false, error };
}

function createOptionalTextValidator(max: number, pattern = SAFE_TEXT_REGEX) {
  return (value: unknown): ValidatorResult<string | null> => {
    if (value === null || value === undefined || value === '') return validatorOk(null);
    const text = String(value).trim();
    if (!text) return validatorOk(null);
    if (text.length > max) return validatorError(`Longitud máxima ${max}`);
    if (!pattern.test(text)) return validatorError('Contiene caracteres no permitidos');
    return validatorOk(text);
  };
}

function createOptionalEnumValidator(values: readonly string[]) {
  const allowed = new Set(values);
  return (value: unknown): ValidatorResult<string | null> => {
    if (value === null || value === undefined || value === '') return validatorOk(null);
    const text = String(value).trim().toUpperCase();
    if (!allowed.has(text)) return validatorError(`Valor permitido: ${values.join(', ')}`);
    return validatorOk(text);
  };
}

function createOptionalDateValidator() {
  return (value: unknown): ValidatorResult<string | null> => {
    if (value === null || value === undefined || value === '') return validatorOk(null);
    const text = String(value).trim();
    if (!SAFE_DATE_REGEX.test(text)) return validatorError('Formato de fecha inválido');
    const date = new Date(`${text}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return validatorError('Fecha inválida');
    return validatorOk(text);
  };
}

function createOptionalIpValidator() {
  return (value: unknown): ValidatorResult<string | null> => {
    if (value === null || value === undefined || value === '') return validatorOk(null);
    const text = String(value).trim();
    if (!isIP(text)) return validatorError('IP inválida');
    return validatorOk(text);
  };
}

function createOptionalMacValidator() {
  return (value: unknown): ValidatorResult<string | null> => {
    if (value === null || value === undefined || value === '') return validatorOk(null);
    const text = String(value).trim().toUpperCase().replace(/-/g, ':');
    if (!SAFE_MAC_REGEX.test(text)) return validatorError('MAC inválida');
    return validatorOk(text);
  };
}

function createOptionalIntegerValidator(min: number, max: number) {
  return (value: unknown): ValidatorResult<number | null> => {
    if (value === null || value === undefined || value === '') return validatorOk(null);
    const number = Number(value);
    if (!Number.isInteger(number)) return validatorError('Debe ser entero');
    if (number < min || number > max) return validatorError(`Debe estar entre ${min} y ${max}`);
    return validatorOk(number);
  };
}

const validateGeneralText = createOptionalTextValidator(120);
const validateLongText = createOptionalTextValidator(500);
const validateIdentifier = createOptionalTextValidator(100, SAFE_IDENTIFIER_REGEX);
const validateLicense = createOptionalTextValidator(64, SAFE_LICENSE_REGEX);
const validateYesNo = createOptionalEnumValidator(YES_NO_VALUES);
const validateTipoRecurso = createOptionalEnumValidator(TIPO_RECURSO_VALUES);
const validateDate = createOptionalDateValidator();
const validateIp = createOptionalIpValidator();
const validateMac = createOptionalMacValidator();
const validateIntSmall = createOptionalIntegerValidator(0, 99999);

const EQUIPO_VALIDATORS: Record<
  (typeof EQUIPO_ALLOWED_KEYS)[number],
  (value: unknown) => ValidatorResult<any>
> = {
  empresa: validateGeneralText,
  establecimiento: validateGeneralText,
  departamento: validateGeneralText,
  area: validateGeneralText,
  jefe_area: validateGeneralText,
  responsable_equipo: validateGeneralText,
  fecha_adquisicion: validateDate,
  fecha_instalacion: validateDate,
  proveedor: validateGeneralText,
  tipo_recurso: validateTipoRecurso,
  marca: validateGeneralText,
  modelo: validateGeneralText,
  modelo_pc: validateGeneralText,
  nombre_host: validateIdentifier,
  nombre_pc: validateIdentifier,
  active_directory: validateIdentifier,
  dominio: validateIdentifier,
  usuario: validateIdentifier,
  contrasena: createOptionalTextValidator(100),
  sistema_operativo: validateGeneralText,
  tiene_licencia_windows: validateYesNo,
  codigo_licencia_windows: validateLicense,
  tiene_licencia_office: validateYesNo,
  mac_address: validateMac,
  direccion_mac: validateMac,
  mac_address2: validateMac,
  ip: validateIp,
  direccion_ip: validateIp,
  ip_extendida: validateIp,
  serie: validateIdentifier,
  no_serie: validateIdentifier,
  procesador: validateGeneralText,
  ram: validateGeneralText,
  ram_gb: validateIntSmall,
  disco: validateGeneralText,
  disco_gb: validateIntSmall,
  antivirus: validateGeneralText,
  tiene_mouse: validateYesNo,
  tiene_teclado: validateYesNo,
  tiene_parlante: validateYesNo,
  tipo_tarjeta_red: validateGeneralText,
  ubicacion: validateGeneralText,
  fecha_inventario: validateDate,
  responsable_inventario: validateGeneralText,
  fecha_mantenimiento: validateDate,
  detalle_mantenimiento: validateLongText,
  activo: validateYesNo,
  observacion: validateLongText,
  observaciones: validateLongText,
  etiquetado: validateGeneralText,
};

function rejectExtraFields(body: Record<string, unknown>, allowedKeys: readonly string[]) {
  const allowed = new Set(allowedKeys);
  return Object.keys(body).filter((key) => !allowed.has(key));
}

function validateLoginPayload(body: unknown): ValidatorResult<LoginPayload> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return validatorError('Payload inválido');
  }
  const extra = rejectExtraFields(body as Record<string, unknown>, LOGIN_ALLOWED_KEYS);
  if (extra.length > 0) {
    return validatorError(`Campos extra no permitidos: ${extra.join(', ')}`);
  }
  const username = normalizeUsername((body as Record<string, unknown>).username);
  const password = String((body as Record<string, unknown>).password || '').trim();
  if (!username || !SAFE_IDENTIFIER_REGEX.test(username) || username.length > 100) {
    return validatorError('Usuario inválido');
  }
  if (!password || password.length < 4 || password.length > 100) {
    return validatorError('Credenciales inválidas');
  }
  return validatorOk({ username, password });
}

function validateEquipoPayload(body: unknown): ValidatorResult<EquipoPayload> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return validatorError('Payload inválido');
  }
  const source = body as Record<string, unknown>;
  const extra = rejectExtraFields(source, EQUIPO_ALLOWED_KEYS);
  if (extra.length > 0) {
    return validatorError(`Campos extra no permitidos: ${extra.join(', ')}`);
  }

  const validated: EquipoPayload = {};
  for (const key of EQUIPO_ALLOWED_KEYS) {
    const result = EQUIPO_VALIDATORS[key](source[key]);
    if (result.ok === false) {
      return validatorError(`Campo ${key}: ${result.error}`);
    }
    validated[key] = result.value;
  }
  return validatorOk(validated);
}

function buildEquipoRecord(data: EquipoPayload): EquipoRecord {
  const nombreHost = (data.nombre_host as string | null) || (data.nombre_pc as string | null) || null;
  const nombrePc = (data.nombre_pc as string | null) || (data.nombre_host as string | null) || 'SIN-NOMBRE';
  const modelo = (data.modelo as string | null) || (data.modelo_pc as string | null) || null;
  const serie = (data.serie as string | null) || (data.no_serie as string | null) || null;
  const mac = (data.mac_address as string | null) || (data.direccion_mac as string | null) || null;
  const ip = (data.ip as string | null) || (data.direccion_ip as string | null) || null;
  const dominio = (data.dominio as string | null) || (data.active_directory as string | null) || null;
  const observacion = (data.observacion as string | null) || (data.observaciones as string | null) || null;

  return {
    empresa: (data.empresa as string | null) || 'Santa Priscila',
    establecimiento: (data.establecimiento as string | null) || null,
    departamento: (data.departamento as string | null) || null,
    area: (data.area as string | null) || null,
    jefe_area: (data.jefe_area as string | null) || null,
    responsable_equipo: (data.responsable_equipo as string | null) || null,
    fecha_adquisicion: toDbDate(data.fecha_adquisicion),
    fecha_instalacion: toDbDate(data.fecha_instalacion),
    proveedor: (data.proveedor as string | null) || null,
    tipo_recurso: (data.tipo_recurso as string | null) || null,
    marca: (data.marca as string | null) || null,
    modelo,
    modelo_pc: (data.modelo_pc as string | null) || modelo,
    nombre_host: nombreHost,
    nombre_pc: nombrePc,
    active_directory: (data.active_directory as string | null) || dominio,
    dominio,
    usuario: (data.usuario as string | null) || null,
    contrasena: (data.contrasena as string | null) || null,
    sistema_operativo: (data.sistema_operativo as string | null) || null,
    tiene_licencia_windows: (data.tiene_licencia_windows as string | null) || null,
    codigo_licencia_windows: (data.codigo_licencia_windows as string | null) || null,
    tiene_licencia_office: (data.tiene_licencia_office as string | null) || null,
    mac_address: mac,
    direccion_mac: (data.direccion_mac as string | null) || mac,
    mac_address2: (data.mac_address2 as string | null) || null,
    ip,
    direccion_ip: (data.direccion_ip as string | null) || ip,
    ip_extendida: (data.ip_extendida as string | null) || null,
    serie,
    no_serie: (data.no_serie as string | null) || serie,
    procesador: (data.procesador as string | null) || null,
    ram: (data.ram as string | null) || null,
    ram_gb: (data.ram_gb as number | null) || null,
    disco: (data.disco as string | null) || null,
    disco_gb: (data.disco_gb as number | null) || null,
    antivirus: (data.antivirus as string | null) || null,
    tiene_mouse: (data.tiene_mouse as string | null) || null,
    tiene_teclado: (data.tiene_teclado as string | null) || null,
    tiene_parlante: (data.tiene_parlante as string | null) || null,
    tipo_tarjeta_red: (data.tipo_tarjeta_red as string | null) || null,
    ubicacion: (data.ubicacion as string | null) || null,
    fecha_inventario: toDbDate(data.fecha_inventario),
    responsable_inventario: (data.responsable_inventario as string | null) || null,
    fecha_mantenimiento: toDbDate(data.fecha_mantenimiento),
    detalle_mantenimiento: (data.detalle_mantenimiento as string | null) || null,
    activo: (data.activo as string | null) || 'SI',
    observacion,
    observaciones: (data.observaciones as string | null) || observacion,
    etiquetado: (data.etiquetado as string | null) || null,
  };
}

function isPlaceholderValue(value: unknown) {
  const text = normalizeCompareText(value);
  return !text || text === 'SINNOMBRE' || text === 'SINTIPO' || text === 'NA' || text === 'N/A';
}

function hasMinimumData(equipo: EquipoRecord) {
  return Boolean(
    !isPlaceholderValue(equipo.nombre_host) ||
      !isPlaceholderValue(equipo.nombre_pc) ||
      !isPlaceholderValue(equipo.serie) ||
      !isPlaceholderValue(equipo.mac_address)
  );
}

async function findDuplicateEquipo(connection: mysql.PoolConnection, equipo: EquipoRecord, excludeId?: number) {
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (equipo.serie && !isPlaceholderValue(equipo.serie)) {
    clauses.push('UPPER(serie) = UPPER(?)');
    params.push(String(equipo.serie));
  }
  if (equipo.mac_address && !isPlaceholderValue(equipo.mac_address)) {
    clauses.push('UPPER(mac_address) = UPPER(?)');
    params.push(String(equipo.mac_address));
  }
  if (equipo.nombre_host && !isPlaceholderValue(equipo.nombre_host)) {
    clauses.push('UPPER(nombre_host) = UPPER(?)');
    params.push(String(equipo.nombre_host));
  }

  if (clauses.length === 0) {
    return { exists: false };
  }

  let sql = `SELECT * FROM equipos WHERE (${clauses.join(' OR ')})`;
  if (excludeId) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';

  const [rows] = await connection.query(sql, params);
  const record = Array.isArray(rows) && rows.length > 0 ? (rows[0] as Record<string, any>) : null;
  if (!record) return { exists: false };

  let reason = 'duplicado';
  if (equipo.serie && normalizeCompareText(record.serie) === normalizeCompareText(equipo.serie)) {
    reason = 'serie';
  } else if (
    equipo.mac_address &&
    normalizeCompareText(record.mac_address) === normalizeCompareText(equipo.mac_address)
  ) {
    reason = 'mac_address';
  } else if (
    equipo.nombre_host &&
    normalizeCompareText(record.nombre_host) === normalizeCompareText(equipo.nombre_host)
  ) {
    reason = 'nombre_host';
  }

  return { exists: true, reason, record };
}

async function findSimilarEquipo(connection: mysql.PoolConnection, equipo: EquipoRecord, excludeId?: number): Promise<SimilarResult> {
  const searchTerms = [equipo.nombre_host, equipo.nombre_pc, equipo.serie].filter(Boolean).map(String);
  const likeTerms = searchTerms.map((value) => `${clampString(value, 12)}%`);

  let sql = `
    SELECT id, nombre_host, nombre_pc, serie, marca, modelo, responsable_equipo, mac_address
    FROM equipos
  `;
  const params: Array<string | number> = [];

  if (likeTerms.length > 0) {
    sql += `
      WHERE (
        ${likeTerms.map(() => 'nombre_host LIKE ?').join(' OR ')}
        OR ${likeTerms.map(() => 'nombre_pc LIKE ?').join(' OR ')}
        OR ${likeTerms.map(() => 'serie LIKE ?').join(' OR ')}
      )
    `;
    params.push(...likeTerms, ...likeTerms, ...likeTerms);
  } else {
    sql += ' WHERE 1=1 ';
  }

  if (excludeId) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }

  sql += ' ORDER BY id DESC LIMIT 200';
  const [rows] = await connection.query(sql, params);

  let bestScore = 0;
  let bestRecord: Record<string, any> | null = null;

  for (const row of rows as Record<string, any>[]) {
    const hostScore = Math.max(
      similarityScore(equipo.nombre_host, row.nombre_host),
      similarityScore(equipo.nombre_pc, row.nombre_pc)
    );
    const serieScore = similarityScore(equipo.serie, row.serie);
    const ownerScore = similarityScore(equipo.responsable_equipo, row.responsable_equipo);
    const score = (hostScore * 0.5) + (serieScore * 0.35) + (ownerScore * 0.15);

    if (score > bestScore) {
      bestScore = score;
      bestRecord = row;
    }
  }

  if (bestRecord && bestScore >= SIMILARITY_THRESHOLD) {
    return {
      exists: true,
      reason: 'alta_similitud',
      score: Number(bestScore.toFixed(4)),
      record: bestRecord,
    };
  }

  return { exists: false };
}

function getRateLimitBucket(key: string) {
  const current = rateLimitBuckets.get(key);
  if (current) return current;
  const bucket = { hits: [], blockedUntil: 0 };
  rateLimitBuckets.set(key, bucket);
  return bucket;
}

function consumeRateLimit(key: string, max: number, windowMs: number, blockMs: number) {
  const bucket = getRateLimitBucket(key);
  const now = Date.now();
  bucket.hits = bucket.hits.filter((hit) => now - hit <= windowMs);
  if (bucket.blockedUntil > now) {
    return { allowed: false, retryAfterMs: bucket.blockedUntil - now };
  }
  bucket.hits.push(now);
  if (bucket.hits.length > max) {
    bucket.blockedUntil = now + blockMs;
    bucket.hits = [];
    return { allowed: false, retryAfterMs: blockMs };
  }
  return { allowed: true, retryAfterMs: 0 };
}

async function enforceRateLimits(
  req: AuthenticatedRequest,
  res: Response,
  limits: { ipMax: number; userMax?: number; windowMs: number; blockMs: number },
  eventType: string
) {
  const ip = req.security?.ip || getClientIp(req);
  const username = req.user?.username || normalizeUsername((req.body as Record<string, unknown>)?.username);

  const ipResult = consumeRateLimit(`ip:${eventType}:${ip}`, limits.ipMax, limits.windowMs, limits.blockMs);
  if (!ipResult.allowed) {
    res.setHeader('Retry-After', String(Math.ceil(ipResult.retryAfterMs / 1000)));
    await auditEvent({
      eventType: `${eventType}_rate_limited`,
      severity: 'warn',
      success: false,
      ip,
      username: username || null,
      route: req.originalUrl,
      method: req.method,
      reason: 'ip_rate_limit',
    });
    res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' });
    return false;
  }

  if (username && limits.userMax) {
    const userResult = consumeRateLimit(`user:${eventType}:${username}`, limits.userMax, limits.windowMs, limits.blockMs);
    if (!userResult.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(userResult.retryAfterMs / 1000)));
      await auditEvent({
        eventType: `${eventType}_rate_limited`,
        severity: 'warn',
        success: false,
        ip,
        username,
        route: req.originalUrl,
        method: req.method,
        reason: 'user_rate_limit',
      });
      res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' });
      return false;
    }
  }

  return true;
}

async function getActiveLockout(ip: string, username: string) {
  const [rows] = await pool.query(
    `
      SELECT scope_key, blocked_until
      FROM auth_lockouts
      WHERE scope_key IN (?, ?, ?)
        AND blocked_until IS NOT NULL
        AND blocked_until > UTC_TIMESTAMP()
      ORDER BY blocked_until DESC
      LIMIT 1
    `,
    [`ip:${ip}`, `user:${username}`, `pair:${ip}:${username}`]
  );
  return Array.isArray(rows) && rows.length > 0 ? (rows[0] as Record<string, any>) : null;
}

async function registerFailedLogin(ip: string, username: string) {
  const scopes = [`ip:${ip}`, `user:${username}`, `pair:${ip}:${username}`];
  for (const scope of scopes) {
    await pool.query(
      `
        INSERT INTO auth_lockouts (scope_type, scope_key, failed_count, blocked_until, last_failed_at)
        VALUES (?, ?, 1, NULL, UTC_TIMESTAMP())
        ON DUPLICATE KEY UPDATE
          failed_count = failed_count + 1,
          last_failed_at = UTC_TIMESTAMP(),
          blocked_until = CASE
            WHEN failed_count + 1 >= ? THEN DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE)
            ELSE blocked_until
          END
      `,
      [scope.split(':', 1)[0], scope, LOGIN_FAILED_THRESHOLD, LOGIN_LOCK_MINUTES]
    );
  }
}

async function clearFailedLogins(ip: string, username: string) {
  await pool.query('DELETE FROM auth_lockouts WHERE scope_key IN (?, ?, ?)', [
    `ip:${ip}`,
    `user:${username}`,
    `pair:${ip}:${username}`,
  ]);
}

function sendSafeError(
  req: AuthenticatedRequest,
  res: Response,
  status: number,
  message: string,
  audit?: Omit<AuditEntry, 'ip' | 'route' | 'method' | 'username' | 'userId'>
) {
  if (audit) {
    void auditEvent({
      ...audit,
      ip: req.security?.ip || getClientIp(req),
      username: req.user?.username || normalizeUsername((req.body as Record<string, unknown>)?.username) || null,
      userId: req.user?.id ?? null,
      route: req.originalUrl,
      method: req.method,
    });
  }
  return res.status(status).json({ error: message });
}

async function handleServerError(
  req: AuthenticatedRequest,
  res: Response,
  error: unknown,
  eventType: string,
  publicMessage: string
) {
  await auditEvent({
    eventType,
    severity: 'error',
    success: false,
    ip: req.security?.ip || getClientIp(req),
    username: req.user?.username || null,
    userId: req.user?.id ?? null,
    route: req.originalUrl,
    method: req.method,
    reason: 'internal_error',
    details: { error: String(error) },
  });
  return res.status(500).json({ error: publicMessage });
}

function buildEquipoFromRow(row: Record<string, unknown>): EquipoPayload {
  const read = (...keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    }
    return null;
  };

  return {
    empresa: read('EMPRESA', 'empresa'),
    establecimiento: read('ESTABLECIMIENTO', 'establecimiento'),
    departamento: read('DEPARTAMENTO', 'departamento'),
    area: read('ÁREA', 'AREA', 'area'),
    jefe_area: read('JEFE ÁREA', 'JEFE AREA', 'JEFE_AREA', 'jefe_area'),
    responsable_equipo: read('RESPONSABLE', 'RESPONSABLE EQUIPO', 'RESPONSABLE DEL EQUIPO', 'responsable_equipo'),
    fecha_adquisicion: read('FECHA ADQUISICIÓN', 'FECHA DE ADQUISICION', 'FECHA_ADQUISICION', 'fecha_adquisicion'),
    fecha_instalacion: read('FECHA INSTALACIÓN', 'FECHA DE INSTALACION', 'FECHA_INSTALACION', 'fecha_instalacion'),
    proveedor: read('PROVEEDOR', 'proveedor'),
    tipo_recurso: read('TIPO RECURSO', 'TIPO RECURSO (CPU/NUC/LAPTOP)', 'tipo_recurso'),
    marca: read('MARCA', 'marca'),
    modelo: read('MODELO', 'modelo'),
    modelo_pc: read('MODELO PC', 'modelo_pc'),
    nombre_host: read('NOMBRE HOST', 'HOST', 'nombre_host'),
    nombre_pc: read('NOMBRE PC', 'nombre_pc'),
    active_directory: read('ACTIVE DIRECTORY', 'active_directory'),
    dominio: read('DOMINIO', 'dominio'),
    usuario: read('USUARIO', 'usuario'),
    contrasena: read('CONTRASEÑA', 'CONTRASENA', 'contrasena'),
    sistema_operativo: read('SISTEMA OPERATIVO', 'sistema_operativo'),
    tiene_licencia_windows: read('TIENE LICENCIA WINDOWS', 'tiene_licencia_windows'),
    codigo_licencia_windows: read('CÓDIGO LICENCIA WINDOWS', 'CODIGO LICENCIA WINDOWS', 'CODIGO DE LICENCIA DE WINDOWS', 'codigo_licencia_windows'),
    tiene_licencia_office: read('TIENE LICENCIA OFFICE', 'tiene_licencia_office'),
    mac_address: read('MAC ADDRESS', 'MAC', 'mac_address'),
    direccion_mac: read('DIRECCIÓN MAC', 'DIRECCION MAC', 'direccion_mac'),
    mac_address2: read('MAC ADDRESS 2', 'mac_address2'),
    ip: read('IP', 'ip'),
    direccion_ip: read('DIRECCIÓN IP', 'DIRECCION IP', 'direccion_ip'),
    ip_extendida: read('IP EXTENDIDA', 'IP-EXTENDIDA', 'ip_extendida'),
    serie: read('SERIE', 'serie'),
    no_serie: read('NO SERIE', 'NO_SERIE', 'no_serie'),
    procesador: read('PROCESADOR', 'procesador'),
    ram: read('RAM', 'ram'),
    ram_gb: read('RAM GB', 'ram_gb'),
    disco: read('DISCO', 'disco'),
    disco_gb: read('DISCO GB', 'disco_gb'),
    antivirus: read('ANTIVIRUS', 'antivirus'),
    tiene_mouse: read('TIENE MOUSE', 'tiene_mouse'),
    tiene_teclado: read('TIENE TECLADO', 'tiene_teclado'),
    tiene_parlante: read('TIENE PARLANTE', 'tiene_parlante'),
    tipo_tarjeta_red: read('TIPO TARJETA RED', 'tipo_tarjeta_red'),
    ubicacion: read('UBICACIÓN', 'UBICACION', 'ubicacion'),
    fecha_inventario: read('FECHA INVENTARIO', 'FECHA DEL INVENTARIO', 'fecha_inventario'),
    responsable_inventario: read('RESPONSABLE INVENTARIO', 'RESPONSABLE DEL INVENTARIO', 'responsable_inventario'),
    fecha_mantenimiento: read('FECHA MANTENIMIENTO', 'FECHA DEL MANTENIMIENTO', 'fecha_mantenimiento'),
    detalle_mantenimiento: read('DETALLE MANTENIMIENTO', 'detalle_mantenimiento'),
    activo: read('ACTIVO', 'activo'),
    observacion: read('OBSERVACIÓN', 'OBSERVACION', 'observacion'),
    observaciones: read('OBSERVACIONES', 'observaciones'),
    etiquetado: read('ETIQUETADO', 'ETIQUETADO.', 'etiquetado'),
  };
}

function createImportKey(rowIndex: number, equipo: EquipoRecord) {
  return `${rowIndex}:${normalizeCompareText(equipo.nombre_host)}:${normalizeCompareText(
    equipo.serie
  )}:${normalizeCompareText(equipo.mac_address)}`;
}

async function analyzeImportRows(rows: Record<string, unknown>[]) {
  const connection = await pool.getConnection();
  try {
    const readyToImport: any[] = [];
    const duplicates: any[] = [];
    const invalidRows: any[] = [];
    const seenKeys = new Set<string>();

    for (let index = 0; index < rows.length; index += 1) {
      const rowIndex = index + 2;
      const rawPayload = buildEquipoFromRow(rows[index]);
      const validated = validateEquipoPayload(rawPayload);

      if (validated.ok === false) {
        invalidRows.push({ rowIndex, reason: validated.error, importKey: `invalid:${rowIndex}`, equipo: rawPayload });
        continue;
      }

      const equipo = buildEquipoRecord(validated.value);
      if (!hasMinimumData(equipo)) {
        invalidRows.push({
          rowIndex,
          reason: 'Debe incluir al menos host, PC, serie o MAC válidos',
          importKey: `invalid:${rowIndex}`,
          equipo,
        });
        continue;
      }

      const importKey = createImportKey(rowIndex, equipo);
      if (seenKeys.has(importKey)) {
        duplicates.push({ rowIndex, importKey, equipo, duplicateReason: 'duplicado_en_excel' });
        continue;
      }
      seenKeys.add(importKey);

      const duplicate = await findDuplicateEquipo(connection, equipo);
      if (duplicate.exists) {
        duplicates.push({
          rowIndex,
          importKey,
          equipo,
          duplicateReason: duplicate.reason,
          existing: duplicate.record,
        });
        continue;
      }

      const similar = await findSimilarEquipo(connection, equipo);
      if (similar.exists) {
        duplicates.push({
          rowIndex,
          importKey,
          equipo,
          duplicateReason: similar.reason,
          existing: similar.record,
          score: similar.score,
        });
        continue;
      }

      readyToImport.push({ rowIndex, importKey, equipo });
    }

    return { totalRows: rows.length, readyToImport, duplicates, invalidRows };
  } finally {
    connection.release();
  }
}

function getInsertValues(equipo: EquipoRecord) {
  return DB_COLUMNS.map((column) => equipo[column]);
}

async function insertEquipo(connection: mysql.PoolConnection, equipo: EquipoRecord) {
  const placeholders = DB_COLUMNS.map(() => '?').join(', ');
  await connection.query(
    `INSERT INTO equipos (${DB_COLUMNS.join(', ')}) VALUES (${placeholders})`,
    getInsertValues(equipo)
  );
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS equipos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      empresa VARCHAR(120) NOT NULL DEFAULT 'Santa Priscila',
      establecimiento VARCHAR(120) NULL,
      departamento VARCHAR(120) NULL,
      area VARCHAR(120) NULL,
      jefe_area VARCHAR(120) NULL,
      responsable_equipo VARCHAR(120) NULL,
      fecha_adquisicion DATE NULL,
      fecha_instalacion DATE NULL,
      proveedor VARCHAR(120) NULL,
      tipo_recurso VARCHAR(60) NULL,
      marca VARCHAR(120) NULL,
      modelo VARCHAR(120) NULL,
      modelo_pc VARCHAR(120) NULL,
      nombre_host VARCHAR(100) NULL,
      nombre_pc VARCHAR(100) NULL,
      active_directory VARCHAR(100) NULL,
      dominio VARCHAR(100) NULL,
      usuario VARCHAR(100) NULL,
      contrasena VARCHAR(100) NULL,
      sistema_operativo VARCHAR(120) NULL,
      tiene_licencia_windows VARCHAR(5) NULL,
      codigo_licencia_windows VARCHAR(64) NULL,
      tiene_licencia_office VARCHAR(5) NULL,
      mac_address VARCHAR(32) NULL,
      direccion_mac VARCHAR(32) NULL,
      mac_address2 VARCHAR(32) NULL,
      ip VARCHAR(64) NULL,
      direccion_ip VARCHAR(64) NULL,
      ip_extendida VARCHAR(64) NULL,
      serie VARCHAR(100) NULL,
      no_serie VARCHAR(100) NULL,
      procesador VARCHAR(120) NULL,
      ram VARCHAR(60) NULL,
      ram_gb INT NULL,
      disco VARCHAR(120) NULL,
      disco_gb INT NULL,
      antivirus VARCHAR(120) NULL,
      tiene_mouse VARCHAR(5) NULL,
      tiene_teclado VARCHAR(5) NULL,
      tiene_parlante VARCHAR(5) NULL,
      tipo_tarjeta_red VARCHAR(120) NULL,
      ubicacion VARCHAR(120) NULL,
      fecha_inventario DATE NULL,
      responsable_inventario VARCHAR(120) NULL,
      fecha_mantenimiento DATE NULL,
      detalle_mantenimiento TEXT NULL,
      activo VARCHAR(5) NULL,
      observacion TEXT NULL,
      observaciones TEXT NULL,
      etiquetado VARCHAR(120) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_equipos_host (nombre_host),
      INDEX idx_equipos_serie (serie),
      INDEX idx_equipos_mac (mac_address),
      INDEX idx_equipos_resp (responsable_equipo)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(30) NOT NULL DEFAULT 'viewer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_lockouts (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      scope_type VARCHAR(20) NOT NULL,
      scope_key VARCHAR(191) NOT NULL UNIQUE,
      failed_count INT NOT NULL DEFAULT 0,
      blocked_until DATETIME NULL,
      last_failed_at DATETIME NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS security_audit (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      event_type VARCHAR(80) NOT NULL,
      severity VARCHAR(16) NOT NULL DEFAULT 'info',
      success TINYINT(1) NOT NULL DEFAULT 1,
      ip VARCHAR(64) NULL,
      username VARCHAR(100) NULL,
      user_id INT NULL,
      route VARCHAR(255) NULL,
      method VARCHAR(16) NULL,
      target_type VARCHAR(64) NULL,
      target_id VARCHAR(64) NULL,
      reason VARCHAR(255) NULL,
      details_json TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_security_audit_created_at (created_at),
      INDEX idx_security_audit_event_type (event_type),
      INDEX idx_security_audit_username (username),
      INDEX idx_security_audit_ip (ip)
    )
  `);

  const [users] = await pool.query('SELECT id FROM usuarios WHERE username = ? LIMIT 1', [ADMIN_USERNAME]);
  if (Array.isArray(users) && users.length === 0) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await pool.query('INSERT INTO usuarios (username, password_hash, role) VALUES (?, ?, ?)', [
      ADMIN_USERNAME,
      passwordHash,
      'admin',
    ]);
    securityLog('info', 'admin_user_bootstrapped', { username: ADMIN_USERNAME });
  }
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use((req: AuthenticatedRequest, _res, next) => {
  req.security = {
    ip: getClientIp(req),
    requestId: randomUUID(),
  };
  next();
});

app.use(express.json({ limit: '1mb', strict: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function uploadExcel(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (error?: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'Archivo demasiado grande. Maximo permitido: 10 MB.' });
      return;
    }

    res.status(400).json({ error: 'No se pudo procesar el archivo Excel.' });
  });
}

async function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return sendSafeError(req, res, 401, 'Token requerido', {
      eventType: 'auth_token_missing',
      severity: 'warn',
      success: false,
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtClaims;
    return next();
  } catch (error) {
    return sendSafeError(req, res, 401, 'Token inválido o expirado', {
      eventType: 'auth_token_invalid',
      severity: 'warn',
      success: false,
      details: { error: String(error) },
    });
  }
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return sendSafeError(req, res, 403, 'No autorizado', {
      eventType: 'rbac_denied',
      severity: 'warn',
      success: false,
      reason: 'admin_required',
    });
  }
  return next();
}

app.post('/api/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allowed = await enforceRateLimits(
      req,
      res,
      {
        ipMax: LOGIN_RATE_LIMIT_IP_MAX,
        userMax: LOGIN_RATE_LIMIT_USER_MAX,
        windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
        blockMs: LOGIN_RATE_LIMIT_WINDOW_MS,
      },
      'login'
    );
    if (!allowed) return;

    const validated = validateLoginPayload(req.body);
    if (validated.ok === false) {
      return sendSafeError(req, res, 400, 'Solicitud inválida', {
        eventType: 'login_validation_failed',
        severity: 'warn',
        success: false,
        reason: validated.error,
      });
    }

    const { username, password } = validated.value;
    const ip = req.security?.ip || getClientIp(req);
    const lock = await getActiveLockout(ip, username);

    if (lock) {
      return sendSafeError(req, res, 423, 'Acceso temporalmente bloqueado. Intenta más tarde.', {
        eventType: 'login_locked',
        severity: 'warn',
        success: false,
        reason: lock.scope_key,
      });
    }

    const [rows] = await pool.query(
      'SELECT id, username, password_hash, role FROM usuarios WHERE username = ? LIMIT 1',
      [username]
    );
    const user = Array.isArray(rows) && rows.length > 0 ? (rows[0] as Record<string, any>) : null;

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await registerFailedLogin(ip, username);
      await auditEvent({
        eventType: 'login_failed',
        severity: 'warn',
        success: false,
        ip,
        username,
        route: req.originalUrl,
        method: req.method,
        reason: 'invalid_credentials',
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    await clearFailedLogins(ip, username);
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, jti: randomUUID() },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }
    );

    await auditEvent({
      eventType: 'login_success',
      success: true,
      ip,
      username,
      userId: user.id,
      route: req.originalUrl,
      method: req.method,
    });

    return res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error) {
    return handleServerError(req, res, error, 'login_error', 'No se pudo iniciar sesión');
  }
});

app.get('/api/me', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: { id: req.user?.id, username: req.user?.username, role: req.user?.role } });
});

app.get('/api/script', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filePath = path.join(__dirname, 'scripts', 'inventario_web.ps1');
    if (!fs.existsSync(filePath)) {
      return sendSafeError(req, res, 404, 'Script no encontrado', {
        eventType: 'script_not_found',
        severity: 'warn',
        success: false,
      });
    }

    await auditEvent({
      eventType: 'script_view',
      success: true,
      ip: req.security?.ip,
      username: req.user?.username,
      userId: req.user?.id,
      route: req.originalUrl,
      method: req.method,
    });

    res.type('text/plain; charset=utf-8').send(await fs.promises.readFile(filePath, 'utf8'));
  } catch (error) {
    return handleServerError(req, res, error, 'script_error', 'No se pudo cargar el script');
  }
});

app.get('/api/equipos', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = clampString(req.query.q, 120);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10)));
    const filterBy = String(req.query.filterBy || 'all');
    const sortBy = String(req.query.sortBy || 'id');
    const sortDir = String(req.query.sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const safeFilterBy = filterableFields.has(filterBy) ? filterBy : 'all';
    const safeSortBy = sortableFields.has(sortBy) ? sortBy : 'id';

    let where = 'WHERE 1=1';
    const params: Array<string | number> = [];

    if (q) {
      const like = `%${q}%`;
      if (safeFilterBy === 'all') {
        where += `
          AND (
            empresa LIKE ? OR establecimiento LIKE ? OR departamento LIKE ? OR area LIKE ?
            OR responsable_equipo LIKE ? OR nombre_host LIKE ? OR nombre_pc LIKE ? OR usuario LIKE ?
            OR ip LIKE ? OR mac_address LIKE ? OR serie LIKE ? OR marca LIKE ? OR modelo LIKE ?
            OR procesador LIKE ? OR tipo_recurso LIKE ? OR activo LIKE ? OR antivirus LIKE ?
            OR etiquetado LIKE ?
          )
        `;
        params.push(
          like, like, like, like, like, like, like, like, like, like, like, like, like, like, like, like, like, like
        );
      } else {
        where += ` AND ${safeFilterBy} LIKE ?`;
        params.push(like);
      }
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM equipos ${where}`, params);
    const total = Number((countRows as Record<string, unknown>[])[0]?.total || 0);
    const [rows] = await pool.query(
      `SELECT * FROM equipos ${where} ORDER BY ${safeSortBy} ${sortDir} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    return handleServerError(req, res, error, 'equipos_list_error', 'No se pudo consultar equipos');
  }
});

app.get('/api/equipos/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const [rows] = await pool.query('SELECT * FROM equipos WHERE id = ? LIMIT 1', [id]);
    const equipo = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!equipo) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    return res.json(equipo);
  } catch (error) {
    return handleServerError(req, res, error, 'equipo_get_error', 'No se pudo cargar el equipo');
  }
});

app.post('/api/equipos', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const allowed = await enforceRateLimits(
      req,
      res,
      {
        ipMax: WRITE_RATE_LIMIT_IP_MAX,
        userMax: WRITE_RATE_LIMIT_USER_MAX,
        windowMs: WRITE_RATE_LIMIT_WINDOW_MS,
        blockMs: WRITE_RATE_LIMIT_BLOCK_MS,
      },
      'equipos_write'
    );
    if (!allowed) return;

    const validated = validateEquipoPayload(req.body);
    if (validated.ok === false) {
      return sendSafeError(req, res, 400, validated.error, {
        eventType: 'equipo_validation_failed',
        severity: 'warn',
        success: false,
      });
    }

    const equipo = buildEquipoRecord(validated.value);
    if (!hasMinimumData(equipo)) {
      return sendSafeError(req, res, 400, 'Debe incluir al menos host, PC, serie o MAC válidos', {
        eventType: 'equipo_minimum_data_failed',
        severity: 'warn',
        success: false,
      });
    }

    const duplicate = await findDuplicateEquipo(connection, equipo);
    if (duplicate.exists) {
      return sendSafeError(req, res, 409, 'Equipo duplicado detectado', {
        eventType: 'equipo_duplicate_blocked',
        severity: 'warn',
        success: false,
        reason: duplicate.reason,
        details: { existing: duplicate.record },
      });
    }

    const similar = await findSimilarEquipo(connection, equipo);
    if (similar.exists) {
      return sendSafeError(req, res, 409, 'Equipo demasiado similar a un registro existente', {
        eventType: 'equipo_similarity_blocked',
        severity: 'warn',
        success: false,
        reason: similar.reason,
        details: { score: similar.score, existing: similar.record },
      });
    }

    await insertEquipo(connection, equipo);
    const [resultRows] = await connection.query('SELECT LAST_INSERT_ID() AS id');
    const insertedId = Number((resultRows as Record<string, unknown>[])[0]?.id || 0);

    await auditEvent({
      eventType: 'equipo_created',
      success: true,
      ip: req.security?.ip,
      username: req.user?.username,
      userId: req.user?.id,
      route: req.originalUrl,
      method: req.method,
      targetType: 'equipo',
      targetId: insertedId,
    });

    return res.status(201).json({ message: 'Equipo creado', id: insertedId });
  } catch (error) {
    return handleServerError(req, res, error, 'equipo_create_error', 'No se pudo crear el equipo');
  } finally {
    connection.release();
  }
});

app.put('/api/equipos/:id', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const allowed = await enforceRateLimits(
      req,
      res,
      {
        ipMax: WRITE_RATE_LIMIT_IP_MAX,
        userMax: WRITE_RATE_LIMIT_USER_MAX,
        windowMs: WRITE_RATE_LIMIT_WINDOW_MS,
        blockMs: WRITE_RATE_LIMIT_BLOCK_MS,
      },
      'equipos_write'
    );
    if (!allowed) return;

    const validated = validateEquipoPayload(req.body);
    if (validated.ok === false) {
      return sendSafeError(req, res, 400, validated.error, {
        eventType: 'equipo_update_validation_failed',
        severity: 'warn',
        success: false,
      });
    }

    const equipo = buildEquipoRecord(validated.value);
    if (!hasMinimumData(equipo)) {
      return sendSafeError(req, res, 400, 'Debe incluir al menos host, PC, serie o MAC válidos', {
        eventType: 'equipo_update_minimum_data_failed',
        severity: 'warn',
        success: false,
      });
    }

    const duplicate = await findDuplicateEquipo(connection, equipo, id);
    if (duplicate.exists) {
      return sendSafeError(req, res, 409, 'Equipo duplicado detectado', {
        eventType: 'equipo_update_duplicate_blocked',
        severity: 'warn',
        success: false,
        reason: duplicate.reason,
      });
    }

    const similar = await findSimilarEquipo(connection, equipo, id);
    if (similar.exists) {
      return sendSafeError(req, res, 409, 'Equipo demasiado similar a un registro existente', {
        eventType: 'equipo_update_similarity_blocked',
        severity: 'warn',
        success: false,
        reason: similar.reason,
        details: { score: similar.score, existing: similar.record },
      });
    }

    const assignments = DB_COLUMNS.map((column) => `${column} = ?`).join(', ');
    await connection.query(`UPDATE equipos SET ${assignments} WHERE id = ?`, [...getInsertValues(equipo), id]);

    await auditEvent({
      eventType: 'equipo_updated',
      success: true,
      ip: req.security?.ip,
      username: req.user?.username,
      userId: req.user?.id,
      route: req.originalUrl,
      method: req.method,
      targetType: 'equipo',
      targetId: id,
    });

    return res.json({ message: 'Equipo actualizado' });
  } catch (error) {
    return handleServerError(req, res, error, 'equipo_update_error', 'No se pudo actualizar el equipo');
  } finally {
    connection.release();
  }
});

app.delete('/api/equipos/:id', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const allowed = await enforceRateLimits(
      req,
      res,
      {
        ipMax: WRITE_RATE_LIMIT_IP_MAX,
        userMax: WRITE_RATE_LIMIT_USER_MAX,
        windowMs: WRITE_RATE_LIMIT_WINDOW_MS,
        blockMs: WRITE_RATE_LIMIT_BLOCK_MS,
      },
      'equipos_delete'
    );
    if (!allowed) return;

    await pool.query('DELETE FROM equipos WHERE id = ?', [id]);
    await auditEvent({
      eventType: 'equipo_deleted',
      success: true,
      ip: req.security?.ip,
      username: req.user?.username,
      userId: req.user?.id,
      route: req.originalUrl,
      method: req.method,
      targetType: 'equipo',
      targetId: id,
    });

    return res.json({ message: 'Equipo eliminado' });
  } catch (error) {
    return handleServerError(req, res, error, 'equipo_delete_error', 'No se pudo eliminar el equipo');
  }
});

app.post('/api/importexcel/preview', verifyToken, requireAdmin, uploadExcel, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allowed = await enforceRateLimits(
      req,
      res,
      {
        ipMax: WRITE_RATE_LIMIT_IP_MAX,
        userMax: WRITE_RATE_LIMIT_USER_MAX,
        windowMs: WRITE_RATE_LIMIT_WINDOW_MS,
        blockMs: WRITE_RATE_LIMIT_BLOCK_MS,
      },
      'import_preview'
    );
    if (!allowed) return;

    if (!req.file) {
      return res.status(400).json({ error: 'Archivo requerido' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return res.status(400).json({ error: 'Excel sin hojas' });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: null });
    const preview = await analyzeImportRows(rows);

    await auditEvent({
      eventType: 'import_preview',
      success: true,
      ip: req.security?.ip,
      username: req.user?.username,
      userId: req.user?.id,
      route: req.originalUrl,
      method: req.method,
      details: {
        totalRows: preview.totalRows,
        ready: preview.readyToImport.length,
        duplicates: preview.duplicates.length,
        invalid: preview.invalidRows.length,
      },
    });

    return res.json(preview);
  } catch (error) {
    return handleServerError(req, res, error, 'import_preview_error', 'No se pudo analizar el Excel');
  }
});

app.post('/api/importexcel/confirm', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const allowed = await enforceRateLimits(
      req,
      res,
      {
        ipMax: WRITE_RATE_LIMIT_IP_MAX,
        userMax: WRITE_RATE_LIMIT_USER_MAX,
        windowMs: WRITE_RATE_LIMIT_WINDOW_MS,
        blockMs: WRITE_RATE_LIMIT_BLOCK_MS,
      },
      'import_confirm'
    );
    if (!allowed) return;

    const payload = req.body as {
      readyToImport?: Array<{ equipo?: EquipoRecord }>;
      selectedDuplicates?: Array<{ equipo?: EquipoRecord }>;
    };

    if (!payload || !Array.isArray(payload.readyToImport) || !Array.isArray(payload.selectedDuplicates)) {
      return res.status(400).json({ error: 'Payload de importación inválido' });
    }

    const items = [...payload.readyToImport, ...payload.selectedDuplicates];
    let inserted = 0;

    for (const item of items) {
      if (!item?.equipo || typeof item.equipo !== 'object') {
        return res.status(400).json({ error: 'Equipo inválido en importación' });
      }

      const validated = validateEquipoPayload(item.equipo);
      if (validated.ok === false) {
        return res.status(400).json({ error: `Fila inválida: ${validated.error}` });
      }

      const equipo = buildEquipoRecord(validated.value);
      const duplicate = await findDuplicateEquipo(connection, equipo);
      if (duplicate.exists) continue;
      const similar = await findSimilarEquipo(connection, equipo);
      if (similar.exists) continue;
      await insertEquipo(connection, equipo);
      inserted += 1;
    }

    await auditEvent({
      eventType: 'import_confirm',
      success: true,
      ip: req.security?.ip,
      username: req.user?.username,
      userId: req.user?.id,
      route: req.originalUrl,
      method: req.method,
      details: { inserted, requested: items.length },
    });

    return res.json({ message: `Importación completada. ${inserted} registros insertados.` });
  } catch (error) {
    return handleServerError(req, res, error, 'import_confirm_error', 'No se pudo confirmar la importación');
  } finally {
    connection.release();
  }
});

app.get('/api/export', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM equipos ORDER BY id DESC');
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows as Record<string, unknown>[]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipos');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await auditEvent({
      eventType: 'export_excel',
      success: true,
      ip: req.security?.ip,
      username: req.user?.username,
      userId: req.user?.id,
      route: req.originalUrl,
      method: req.method,
      details: { total: Array.isArray(rows) ? rows.length : 0 },
    });

    res.setHeader('Content-Disposition', 'attachment; filename="inventarioequipos.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (error) {
    return handleServerError(req, res, error, 'export_error', 'No se pudo exportar');
  }
});

app.get('/api/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [totalsRows] = await pool.query(`
      SELECT
        COUNT(*) AS totalPcs,
        SUM(CASE WHEN UPPER(COALESCE(activo, '')) = 'SI' THEN 1 ELSE 0 END) AS activos,
        SUM(CASE WHEN UPPER(COALESCE(activo, '')) = 'NO' THEN 1 ELSE 0 END) AS inactivos,
        SUM(CASE WHEN UPPER(COALESCE(tiene_licencia_windows, '')) = 'SI' THEN 1 ELSE 0 END) AS conLicenciaWindows,
        SUM(CASE WHEN UPPER(COALESCE(tiene_licencia_windows, '')) = 'NO' THEN 1 ELSE 0 END) AS sinLicenciaWindows,
        SUM(CASE WHEN UPPER(COALESCE(tiene_licencia_office, '')) = 'SI' THEN 1 ELSE 0 END) AS conLicenciaOffice,
        SUM(CASE WHEN UPPER(COALESCE(tiene_licencia_office, '')) = 'NO' THEN 1 ELSE 0 END) AS sinLicenciaOffice
      FROM equipos
    `);
    const totals = (totalsRows as Record<string, unknown>[])[0] || {};

    const [byTipoRecurso] = await pool.query(`
      SELECT tipo_recurso, COUNT(*) AS count
      FROM equipos
      GROUP BY tipo_recurso
      ORDER BY count DESC
    `);
    const [byArea] = await pool.query(`
      SELECT area, COUNT(*) AS count
      FROM equipos
      GROUP BY area
      ORDER BY count DESC
    `);
    const [byOS] = await pool.query(`
      SELECT sistema_operativo, COUNT(*) AS count
      FROM equipos
      GROUP BY sistema_operativo
      ORDER BY count DESC
    `);

    return res.json({
      totalPcs: Number(totals.totalPcs || 0),
      activos: Number(totals.activos || 0),
      inactivos: Number(totals.inactivos || 0),
      licencias: {
        conLicenciaWindows: Number(totals.conLicenciaWindows || 0),
        sinLicenciaWindows: Number(totals.sinLicenciaWindows || 0),
        conLicenciaOffice: Number(totals.conLicenciaOffice || 0),
        sinLicenciaOffice: Number(totals.sinLicenciaOffice || 0),
      },
      byTipoRecurso,
      byArea,
      byOS,
    });
  } catch (error) {
    return handleServerError(req, res, error, 'stats_error', 'No se pudieron cargar las estadísticas');
  }
});

async function start() {
  await initDb();

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const clientDist = path.join(__dirname, 'dist');
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      return res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    securityLog('info', 'server_started', { url: `http://0.0.0.0:${PORT}` });
  });
}

start().catch((error) => {
  securityLog('error', 'server_boot_failed', { error: String(error) });
  process.exit(1);
});
