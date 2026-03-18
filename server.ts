import express from 'express';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventario_web',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const JWT_SECRET = process.env.JWT_SECRET || 'inventario_admin_secret_2026';

async function initDb() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS equipos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_pc VARCHAR(100),
        usuario VARCHAR(100),
        dominio VARCHAR(100),
        direccion_ip VARCHAR(15),
        direccion_mac VARCHAR(17),
        tipo_tarjeta_red VARCHAR(100),
        sistema_operativo VARCHAR(100),
        ram_gb INT,
        procesador VARCHAR(255),
        disco_gb INT,
        modelo_pc VARCHAR(150),
        no_serie VARCHAR(100),
        ubicacion VARCHAR(100),
        observaciones TEXT,
        empresa VARCHAR(100),
        establecimiento VARCHAR(100),
        departamento VARCHAR(100),
        area VARCHAR(100),
        jefe_area VARCHAR(100),
        responsable_equipo VARCHAR(100),
        fecha_adquisicion DATE,
        fecha_instalacion DATE,
        proveedor VARCHAR(100),
        tipo_recurso VARCHAR(50),
        marca VARCHAR(100),
        modelo VARCHAR(100),
        nombre_host VARCHAR(100),
        active_directory VARCHAR(100),
        contrasena VARCHAR(100),
        tiene_licencia_windows VARCHAR(10),
        codigo_licencia_windows VARCHAR(150),
        tiene_licencia_office VARCHAR(10),
        mac_address VARCHAR(50),
        mac_address2 VARCHAR(50),
        ip VARCHAR(45),
        ip_extendida VARCHAR(50),
        serie VARCHAR(100),
        ram VARCHAR(50),
        disco VARCHAR(50),
        antivirus VARCHAR(100),
        tiene_mouse VARCHAR(5),
        tiene_teclado VARCHAR(5),
        tiene_parlante VARCHAR(5),
        fecha_inventario DATE,
        responsable_inventario VARCHAR(100),
        fecha_mantenimiento DATE,
        detalle_mantenimiento TEXT,
        activo VARCHAR(10),
        observacion TEXT,
        etiquetado VARCHAR(100)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('📊 Base de datos lista.');
  } catch (error) {
    console.error('❌ Error al inicializar DB:', error);
  } finally {
    connection.release();
  }
}

const app = express();
app.use(express.json({ limit: '20mb' }));
const upload = multer({ storage: multer.memoryStorage() });

function formatDate(val: any): string | null {
  if (val === null || val === undefined || val === '') return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }

  if (typeof val === 'string') {
    const text = val.trim();
    if (!text) return null;

    if (text.includes('T')) return text.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

    return null;
  }

  if (typeof val === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  return null;
}

function numberFromText(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Math.round(val);
  const n = parseInt(String(val).replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

function cleanEmpty(val: any) {
  return val === '' || val === undefined ? null : val;
}

function normalizeText(val: any) {
  if (val === null || val === undefined) return null;
  const text = String(val).trim();
  return text === '' ? null : text;
}

function normalizeMac(val: any) {
  const text = normalizeText(val);
  return text ? text.toUpperCase() : null;
}

function normalizeHost(val: any) {
  const text = normalizeText(val);
  return text ? text.toUpperCase() : null;
}

function normalizeSerie(val: any) {
  const text = normalizeText(val);
  return text ? text.toUpperCase() : null;
}

function isPlaceholderValue(val: any) {
  if (val === null || val === undefined) return true;
  const text = String(val).trim().toUpperCase();

  return (
    text === '' ||
    text === 'SIN NOMBRE' ||
    text === 'N/A' ||
    text === 'NA' ||
    text === '-' ||
    text === 'AGREGADO' ||
    text === 'POR AGREGAR'
  );
}

function mapEquipo(body: any) {
  return {
    empresa: cleanEmpty(body.empresa) || 'Santa Priscila',
    establecimiento: cleanEmpty(body.establecimiento),
    departamento: cleanEmpty(body.departamento),
    area: cleanEmpty(body.area),
    jefe_area: cleanEmpty(body.jefe_area),
    responsable_equipo: cleanEmpty(body.responsable_equipo),

    fecha_adquisicion: formatDate(body.fecha_adquisicion),
    fecha_instalacion: formatDate(body.fecha_instalacion),
    proveedor: cleanEmpty(body.proveedor),
    tipo_recurso: cleanEmpty(body.tipo_recurso),
    marca: cleanEmpty(body.marca),

    modelo: cleanEmpty(body.modelo || body.modelo_pc),
    modelo_pc: cleanEmpty(body.modelo_pc || body.modelo),

    nombre_host: cleanEmpty(body.nombre_host || body.nombre_pc),
    nombre_pc: cleanEmpty(body.nombre_pc || body.nombre_host) || 'SIN NOMBRE',

    active_directory: cleanEmpty(body.active_directory || body.dominio),
    dominio: cleanEmpty(body.dominio || body.active_directory),

    usuario: cleanEmpty(body.usuario),
    contrasena: cleanEmpty(body.contrasena),
    sistema_operativo: cleanEmpty(body.sistema_operativo),

    tiene_licencia_windows: cleanEmpty(body.tiene_licencia_windows),
    codigo_licencia_windows: cleanEmpty(body.codigo_licencia_windows),
    tiene_licencia_office: cleanEmpty(body.tiene_licencia_office),

    mac_address: cleanEmpty(body.mac_address || body.direccion_mac),
    direccion_mac: cleanEmpty(body.direccion_mac || body.mac_address),
    mac_address2: cleanEmpty(body.mac_address2),

    ip: cleanEmpty(body.ip || body.direccion_ip),
    direccion_ip: cleanEmpty(body.direccion_ip || body.ip),
    ip_extendida: cleanEmpty(body.ip_extendida),

    serie: cleanEmpty(body.serie || body.no_serie),
    no_serie: cleanEmpty(body.no_serie || body.serie),

    procesador: cleanEmpty(body.procesador),

    ram: cleanEmpty(body.ram) || (body.ram_gb != null ? `${body.ram_gb} GB` : null),
    ram_gb: body.ram_gb != null ? numberFromText(body.ram_gb) : numberFromText(body.ram),

    disco: cleanEmpty(body.disco) || (body.disco_gb != null ? `${body.disco_gb} GB` : null),
    disco_gb: body.disco_gb != null ? numberFromText(body.disco_gb) : numberFromText(body.disco),

    antivirus: cleanEmpty(body.antivirus),
    tiene_mouse: cleanEmpty(body.tiene_mouse),
    tiene_teclado: cleanEmpty(body.tiene_teclado),
    tiene_parlante: cleanEmpty(body.tiene_parlante),

    tipo_tarjeta_red: cleanEmpty(body.tipo_tarjeta_red),
    ubicacion: cleanEmpty(body.ubicacion),

    fecha_inventario: formatDate(body.fecha_inventario),
    responsable_inventario: cleanEmpty(body.responsable_inventario),
    fecha_mantenimiento: formatDate(body.fecha_mantenimiento),
    detalle_mantenimiento: cleanEmpty(body.detalle_mantenimiento),

    activo: cleanEmpty(body.activo) || 'SI',
    observacion: cleanEmpty(body.observacion || body.observaciones),
    observaciones: cleanEmpty(body.observaciones || body.observacion),
    etiquetado: cleanEmpty(body.etiquetado),
  };
}

function verifyToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administrador' });
  }
  next();
}

function getVal(row: any, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return null;
}

function isRowEmpty(row: any) {
  return Object.values(row).every(
    (v) => v === null || v === undefined || String(v).trim() === ''
  );
}

function hasMinimumData(equipo: any) {
  const serie = !isPlaceholderValue(equipo.serie) ? equipo.serie : null;
  const mac = !isPlaceholderValue(equipo.mac_address) ? equipo.mac_address : null;
  const ip = !isPlaceholderValue(equipo.ip) ? equipo.ip : null;
  const host = !isPlaceholderValue(equipo.nombre_host) ? equipo.nombre_host : null;
  const pc = !isPlaceholderValue(equipo.nombre_pc) ? equipo.nombre_pc : null;

  return Boolean(serie || mac || ip || host || pc);
}

async function findDuplicateEquipo(connection: any, equipo: any, excludeId?: number | string) {
  const serie = normalizeSerie(equipo.serie || equipo.no_serie);
  const mac = normalizeMac(equipo.mac_address || equipo.direccion_mac);
  const host = normalizeHost(equipo.nombre_host || equipo.nombre_pc);

  if (serie && !isPlaceholderValue(serie)) {
    const sql = excludeId
      ? 'SELECT id, serie, mac_address, nombre_host FROM equipos WHERE UPPER(TRIM(serie)) = ? AND id <> ? LIMIT 1'
      : 'SELECT id, serie, mac_address, nombre_host FROM equipos WHERE UPPER(TRIM(serie)) = ? LIMIT 1';
    const params = excludeId ? [serie, excludeId] : [serie];
    const [rows]: any = await connection.query(sql, params);
    if (rows.length) {
      return { exists: true, reason: 'serie', record: rows[0] };
    }
  }

  if ((!serie || isPlaceholderValue(serie)) && mac && !isPlaceholderValue(mac)) {
    const sql = excludeId
      ? 'SELECT id, serie, mac_address, nombre_host FROM equipos WHERE UPPER(TRIM(mac_address)) = ? AND id <> ? LIMIT 1'
      : 'SELECT id, serie, mac_address, nombre_host FROM equipos WHERE UPPER(TRIM(mac_address)) = ? LIMIT 1';
    const params = excludeId ? [mac, excludeId] : [mac];
    const [rows]: any = await connection.query(sql, params);
    if (rows.length) {
      return { exists: true, reason: 'mac_address', record: rows[0] };
    }
  }

  if (
    (!serie || isPlaceholderValue(serie)) &&
    (!mac || isPlaceholderValue(mac)) &&
    host &&
    !isPlaceholderValue(host)
  ) {
    const sql = excludeId
      ? 'SELECT id, serie, mac_address, nombre_host FROM equipos WHERE UPPER(TRIM(nombre_host)) = ? AND id <> ? LIMIT 1'
      : 'SELECT id, serie, mac_address, nombre_host FROM equipos WHERE UPPER(TRIM(nombre_host)) = ? LIMIT 1';
    const params = excludeId ? [host, excludeId] : [host];
    const [rows]: any = await connection.query(sql, params);
    if (rows.length) {
      return { exists: true, reason: 'nombre_host', record: rows[0] };
    }
  }

  return { exists: false };
}

function buildEquipoFromRow(row: any) {
  return mapEquipo({
    empresa: getVal(row, 'EMPRESA', 'empresa'),
    establecimiento: getVal(row, 'ESTABLECIMIENTO', 'establecimiento'),
    departamento: getVal(row, 'DEPARTAMENTO', 'departamento'),
    area: getVal(row, 'AREA', 'ÁREA', 'area'),
    jefe_area: getVal(row, 'JEFE AREA', 'JEFE ÁREA', 'jefe_area'),
    responsable_equipo: getVal(row, 'RESPONSABLE DEL EQUIPO', 'responsable_equipo'),

    fecha_adquisicion: getVal(row, 'FECHA DE ADQUISICION', 'FECHA DE ADQUISICIÓN', 'fecha_adquisicion'),
    fecha_instalacion: getVal(row, 'FECHA DE INSTALACION', 'FECHA DE INSTALACIÓN', 'fecha_instalacion'),
    proveedor: getVal(row, 'PROVEEDOR', 'proveedor'),
    tipo_recurso: getVal(row, 'TIPO RECURSO (CPU/NUC/LAPTOP)', 'TIPO RECURSO', 'tipo_recurso'),
    marca: getVal(row, 'MARCA', 'marca'),
    modelo: getVal(row, 'MODELO', 'modelo'),
    modelo_pc: getVal(row, 'MODELO PC', 'modelo_pc'),

    nombre_host: getVal(row, 'NOMBRE HOST', 'nombre_host'),
    nombre_pc: getVal(row, 'NOMBRE PC', 'nombre_pc'),

    active_directory: getVal(row, 'ACTIVE DIRECTORY', 'active_directory'),
    dominio: getVal(row, 'DOMINIO', 'dominio'),
    usuario: getVal(row, 'USUARIO', 'usuario'),
    contrasena: getVal(row, 'CONTRASEÑA', 'CONTRASENA', 'contrasena'),
    sistema_operativo: getVal(row, 'SISTEMA OPERATIVO', 'sistema_operativo'),

    tiene_licencia_windows: getVal(row, 'TIENE LICENCIA WINDOWS', 'tiene_licencia_windows'),
    codigo_licencia_windows: getVal(
      row,
      'CODIGO DE LICENCIA DE WINDOWS',
      'CÓDIGO DE LICENCIA DE WINDOWS',
      'CODIGO LICENCIA WINDOWS',
      'codigo_licencia_windows'
    ),
    tiene_licencia_office: getVal(row, 'TIENE LICENCIA OFFICE', 'tiene_licencia_office'),

    mac_address: getVal(row, 'MAC ADDRESS', 'mac_address'),
    direccion_mac: getVal(row, 'DIRECCION MAC', 'DIRECCIÓN MAC', 'direccion_mac'),
    mac_address2: getVal(row, 'MAC ADDRESS 2', 'mac_address2'),

    ip: getVal(row, 'IP', 'ip'),
    direccion_ip: getVal(row, 'DIRECCION IP', 'DIRECCIÓN IP', 'direccion_ip'),
    ip_extendida: getVal(row, 'IP-EXTENDIDA', 'IP EXTENDIDA', 'ip_extendida'),

    serie: getVal(row, 'SERIE', 'serie'),
    no_serie: getVal(row, 'NO SERIE', 'no_serie'),

    procesador: getVal(row, 'PROCESADOR', 'procesador'),
    ram: getVal(row, 'RAM', 'ram'),
    ram_gb: getVal(row, 'RAM GB', 'ram_gb'),
    disco: getVal(row, 'DISCO', 'disco'),
    disco_gb: getVal(row, 'DISCO GB', 'disco_gb'),

    antivirus: getVal(row, 'ANTIVIRUS', 'antivirus'),
    tiene_mouse: getVal(row, 'TIENE MOUSE', 'tiene_mouse'),
    tiene_teclado: getVal(row, 'TIENE TECLADO', 'tiene_teclado'),
    tiene_parlante: getVal(row, 'TIENE PARLANTE', 'tiene_parlante'),

    tipo_tarjeta_red: getVal(row, 'TIPO TARJETA RED', 'tipo_tarjeta_red'),
    ubicacion: getVal(row, 'UBICACION', 'UBICACIÓN', 'ubicacion'),

    fecha_inventario: getVal(row, 'FECHA DEL INVENTARIO', 'fecha_inventario'),
    responsable_inventario: getVal(row, 'RESPONSABLE DEL INVENTARIO', 'responsable_inventario'),
    fecha_mantenimiento: getVal(row, 'FECHA DEL MANTENIMIENTO', 'fecha_mantenimiento'),
    detalle_mantenimiento: getVal(row, 'DETALLE MANTENIMIENTO', 'detalle_mantenimiento'),

    activo: getVal(row, 'ACTIVO', 'activo'),
    observacion: getVal(row, 'OBSERVACIÓN', 'OBSERVACION', 'observacion'),
    observaciones: getVal(row, 'OBSERVACIONES', 'observaciones'),
    etiquetado: getVal(row, 'ETIQUETADO.', 'ETIQUETADO', 'etiquetado'),
  });
}

async function analyzeImportRows(connection: any, rows: any[]) {
  const readyToImport: any[] = [];
  const duplicates: any[] = [];
  const invalidRows: any[] = [];

  const seenSeries = new Map<string, number>();
  const seenMacs = new Map<string, number>();
  const seenHosts = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (isRowEmpty(row)) {
      invalidRows.push({
        rowIndex: i + 2,
        reason: 'Fila vacía',
        data: row,
      });
      continue;
    }

    const equipo = buildEquipoFromRow(row);

    if (!hasMinimumData(equipo)) {
      invalidRows.push({
        rowIndex: i + 2,
        reason: 'Sin datos mínimos válidos',
        equipo,
      });
      continue;
    }

    const serie = normalizeSerie(equipo.serie || equipo.no_serie);
    const mac = normalizeMac(equipo.mac_address || equipo.direccion_mac);
    const host = normalizeHost(equipo.nombre_host || equipo.nombre_pc);

    if (serie && !isPlaceholderValue(serie)) {
      if (seenSeries.has(serie)) {
        duplicates.push({
          rowIndex: i + 2,
          importKey: `${serie}||${mac || ''}||${host || ''}||${i + 2}`,
          duplicateReason: `serie repetida en el Excel (fila ${seenSeries.get(serie)})`,
          equipo,
          existing: { id: `Excel fila ${seenSeries.get(serie)}` },
        });
        continue;
      }
      seenSeries.set(serie, i + 2);
    } else if (mac && !isPlaceholderValue(mac)) {
      if (seenMacs.has(mac)) {
        duplicates.push({
          rowIndex: i + 2,
          importKey: `${serie || ''}||${mac}||${host || ''}||${i + 2}`,
          duplicateReason: `mac_address repetida en el Excel (fila ${seenMacs.get(mac)})`,
          equipo,
          existing: { id: `Excel fila ${seenMacs.get(mac)}` },
        });
        continue;
      }
      seenMacs.set(mac, i + 2);
    } else if (host && !isPlaceholderValue(host)) {
      if (seenHosts.has(host)) {
        duplicates.push({
          rowIndex: i + 2,
          importKey: `${serie || ''}||${mac || ''}||${host}||${i + 2}`,
          duplicateReason: `nombre_host repetido en el Excel (fila ${seenHosts.get(host)})`,
          equipo,
          existing: { id: `Excel fila ${seenHosts.get(host)}` },
        });
        continue;
      }
      seenHosts.set(host, i + 2);
    }

    const duplicate = await findDuplicateEquipo(connection, equipo);

    if (duplicate.exists) {
      duplicates.push({
        rowIndex: i + 2,
        importKey: `${serie || ''}||${mac || ''}||${host || ''}||${i + 2}`,
        duplicateReason: duplicate.reason,
        equipo,
        existing: duplicate.record,
      });
      continue;
    }

    readyToImport.push({
      rowIndex: i + 2,
      importKey: `${serie || ''}||${mac || ''}||${host || ''}||${i + 2}`,
      equipo,
    });
  }

  return { readyToImport, duplicates, invalidRows };
}

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const connection = await pool.getConnection();
    const [rows]: any = await connection.query(
      'SELECT * FROM usuarios WHERE username = ? AND activo = 1 LIMIT 1',
      [username]
    );
    connection.release();

    if (!rows.length) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error en login: ' + error.message });
  }
});

app.get('/api/me', verifyToken, (req: any, res) => {
  res.json({ user: req.user });
});

app.get('/api/script', verifyToken, requireAdmin, (_req, res) => {
  try {
    const scriptPath = path.resolve('C:/inventario_web/inventario_web/scripts/inventario_web.ps1');
    const script = fs.readFileSync(scriptPath, 'utf8');

    console.log('SCRIPT PATH:', scriptPath);
    console.log('SCRIPT LENGTH:', script.length);

    res.type('text/plain; charset=utf-8');
    res.send(script);
  } catch (error) {
    console.error('Error al leer el script:', error);
    res.status(500).json({ error: 'No se pudo cargar el script de PowerShell' });
  }
});

app.get('/api/equipos', async (req, res) => {
  try {
    const {
      q = '',
      page = '1',
      limit = '10',
      filterBy = 'all',
      sortBy = 'id',
      sortDir = 'desc',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(parseInt(page || '1', 10), 1);
    const limitNum = Math.max(parseInt(limit || '10', 10), 1);
    const offset = (pageNum - 1) * limitNum;

    const allowedFilters = [
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
      'all',
    ];

    const allowedSortFields = [
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
    ];

    const safeFilter = allowedFilters.includes(filterBy) ? filterBy : 'all';
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'id';
    const safeSortDir = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const connection = await pool.getConnection();

    try {
      let whereClause = '';
      const params: any[] = [];

      if (q && q.trim() !== '') {
        const searchValue = `%${q.trim()}%`;

        if (safeFilter === 'all') {
          whereClause = `
            WHERE
              nombre_pc LIKE ? OR
              nombre_host LIKE ? OR
              usuario LIKE ? OR
              responsable_equipo LIKE ? OR
              ip LIKE ? OR
              mac_address LIKE ? OR
              departamento LIKE ? OR
              area LIKE ? OR
              establecimiento LIKE ? OR
              serie LIKE ? OR
              marca LIKE ? OR
              modelo LIKE ? OR
              procesador LIKE ? OR
              tipo_recurso LIKE ? OR
              activo LIKE ? OR
              antivirus LIKE ? OR
              etiquetado LIKE ?
          `;
          for (let i = 0; i < 17; i++) params.push(searchValue);
        } else {
          whereClause = `WHERE ${safeFilter} LIKE ?`;
          params.push(searchValue);
        }
      }

      const [countRows]: any = await connection.query(
        `SELECT COUNT(*) as total FROM equipos ${whereClause}`,
        params
      );

      const total = countRows[0]?.total || 0;
      const totalPages = Math.max(Math.ceil(total / limitNum), 1);

      const [rows]: any = await connection.query(
        `
          SELECT *
          FROM equipos
          ${whereClause}
          ORDER BY ${safeSortBy} ${safeSortDir}
          LIMIT ? OFFSET ?
        `,
        [...params, limitNum, offset]
      );

      res.json({
        data: rows,
        total,
        totalPages,
        page: pageNum,
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error al listar equipos:', error);
    res.status(500).json({ error: 'Error al obtener equipos: ' + error.message });
  }
});

app.get('/api/equipos/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows]: any = await connection.query('SELECT * FROM equipos WHERE id = ?', [req.params.id]);
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json(rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener equipo: ' + error.message });
  }
});

app.post('/api/equipos', verifyToken, requireAdmin, async (req, res) => {
  try {
    const equipo = mapEquipo(req.body);

    if (!hasMinimumData(equipo)) {
      return res.status(400).json({ error: 'El equipo no tiene datos mínimos válidos' });
    }

    const connection = await pool.getConnection();
    try {
      const duplicate = await findDuplicateEquipo(connection, equipo);

      if (duplicate.exists) {
        return res.status(409).json({
          error: `Equipo duplicado detectado por ${duplicate.reason}`,
          duplicate,
        });
      }

      await connection.query('INSERT INTO equipos SET ?', [equipo]);
      res.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear equipo: ' + error.message });
  }
});

app.put('/api/equipos/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const equipo: any = mapEquipo(req.body);
    delete equipo.id;
    delete equipo.created_at;

    if (!hasMinimumData(equipo)) {
      return res.status(400).json({ error: 'El equipo no tiene datos mínimos válidos' });
    }

    const connection = await pool.getConnection();
    try {
      const duplicate = await findDuplicateEquipo(connection, equipo, req.params.id);

      if (duplicate.exists) {
        return res.status(409).json({
          error: `Conflicto con otro equipo por ${duplicate.reason}`,
          duplicate,
        });
      }

      await connection.query('UPDATE equipos SET ? WHERE id = ?', [equipo, req.params.id]);
      res.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar equipo: ' + error.message });
  }
});

app.delete('/api/equipos/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM equipos WHERE id = ?', [req.params.id]);
    connection.release();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar: ' + error.message });
  }
});

app.post('/api/importexcel/preview', verifyToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió archivo' });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: 'buffer',
      cellDates: true,
    });

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    const connection = await pool.getConnection();
    try {
      const result = await analyzeImportRows(connection, jsonData);

      res.json({
        success: true,
        totalRows: jsonData.length,
        readyToImport: result.readyToImport,
        duplicates: result.duplicates,
        invalidRows: result.invalidRows,
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('ERROR PREVIEW IMPORT:', error);
    res.status(500).json({ error: 'Error al previsualizar Excel: ' + error.message });
  }
});

app.post('/api/importexcel/confirm', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      readyToImport = [],
      selectedDuplicates = [],
    } = req.body || {};

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      let inserted = 0;
      let skipped = 0;
      const skippedItems: any[] = [];

      for (const item of readyToImport) {
        const equipo = mapEquipo(item.equipo || item);

        if (!hasMinimumData(equipo)) {
          skipped++;
          skippedItems.push({ reason: 'Sin datos mínimos', equipo });
          continue;
        }

        const duplicate = await findDuplicateEquipo(connection, equipo);
        if (duplicate.exists) {
          skipped++;
          skippedItems.push({ reason: `Duplicado por ${duplicate.reason}`, equipo });
          continue;
        }

        await connection.query('INSERT INTO equipos SET ?', [equipo]);
        inserted++;
      }

      for (const item of selectedDuplicates) {
        const equipo = mapEquipo(item.equipo || item);

        if (!hasMinimumData(equipo)) {
          skipped++;
          skippedItems.push({ reason: 'Sin datos mínimos', equipo });
          continue;
        }

        await connection.query('INSERT INTO equipos SET ?', [equipo]);
        inserted++;
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Importados ${inserted} registros. Omitidos ${skipped}.`,
        inserted,
        skipped,
        skippedItems,
      });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('ERROR CONFIRM IMPORT:', error);
    res.status(500).json({ error: 'Error al confirmar importación: ' + error.message });
  }
});

app.get('/api/export', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows]: any = await connection.query('SELECT * FROM equipos ORDER BY id ASC');
    connection.release();

    const cleanedRows = rows.filter((row: any) => {
      const equipo = mapEquipo(row);
      return hasMinimumData(equipo);
    });

    const worksheet = XLSX.utils.json_to_sheet(cleanedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipos');

    const cols = Object.keys(cleanedRows[0] || rows[0] || {}).map(() => ({ wch: 20 }));
    worksheet['!cols'] = cols;

    const rawBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const buffer = Buffer.from(rawBuffer);

    res.setHeader('Content-Disposition', 'attachment; filename="inventario_equipos.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al exportar: ' + error.message });
  }
});

app.get('/api/stats', async (_req, res) => {
  try {
    const connection = await pool.getConnection();

    const [[{ totalPcs }]]: any = await connection.query('SELECT COUNT(*) as totalPcs FROM equipos');
    const [[{ activos }]]: any = await connection.query("SELECT COUNT(*) as activos FROM equipos WHERE activo = 'SI'");
    const [[{ inactivos }]]: any = await connection.query(
      "SELECT COUNT(*) as inactivos FROM equipos WHERE activo = 'NO' OR activo IS NULL OR activo = ''"
    );

    const [[licencias]]: any = await connection.query(`
      SELECT
        SUM(tiene_licencia_windows = 'SI') as conLicenciaWindows,
        SUM(tiene_licencia_windows = 'NO') as sinLicenciaWindows,
        SUM(tiene_licencia_office = 'SI') as conLicenciaOffice,
        SUM(tiene_licencia_office = 'NO') as sinLicenciaOffice
      FROM equipos
    `);

    const [byTipoRecurso]: any = await connection.query(`
      SELECT tipo_recurso, COUNT(*) as count
      FROM equipos
      WHERE tipo_recurso IS NOT NULL AND tipo_recurso != ''
      GROUP BY tipo_recurso
      ORDER BY count DESC
    `);

    const [byArea]: any = await connection.query(`
      SELECT area, COUNT(*) as count
      FROM equipos
      WHERE area IS NOT NULL AND area != ''
      GROUP BY area
      ORDER BY count DESC
      LIMIT 10
    `);

    const [byOS]: any = await connection.query(`
      SELECT sistema_operativo, COUNT(*) as count
      FROM equipos
      WHERE sistema_operativo IS NOT NULL AND sistema_operativo != ''
      GROUP BY sistema_operativo
      ORDER BY count DESC
      LIMIT 10
    `);

    connection.release();
    res.json({ totalPcs, activos, inactivos, licencias, byTipoRecurso, byArea, byOS });
  } catch (error: any) {
    console.error('Error stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas: ' + error.message });
  }
});

async function startServer() {
  await initDb();
  const PORT = 5000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));

    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor en http://10.51.17.205:${PORT}`);
  });
}

startServer().catch(console.error);
