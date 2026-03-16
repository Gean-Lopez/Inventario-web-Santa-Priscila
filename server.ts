import express from 'express';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
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
        sistema_operativo VARCHAR(50),
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
app.use(express.json({ limit: '10mb' }));
const upload = multer({ storage: multer.memoryStorage() });

function formatDate(val: any): string | null {
  if (!val || val === '') return null;
  if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  return val || null;
}

function numberFromText(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const n = parseInt(String(val).replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

function cleanEmpty(val: any) {
  return val === '' || val === undefined ? null : val;
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

    ram: cleanEmpty(body.ram) || (body.ram_gb != null ? `${body.ram_gb}GB` : null),
    ram_gb: body.ram_gb != null ? numberFromText(body.ram_gb) : numberFromText(body.ram),

    disco: cleanEmpty(body.disco) || (body.disco_gb != null ? `${body.disco_gb}GB` : null),
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
      { expiresIn: '8h' }
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

app.get('/api/equipos', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 10), 50);
    const offset = (page - 1) * limit;
    const search = (req.query.q as string)?.trim() || '';
    const filterBy = (req.query.filterBy as string)?.trim() || 'all';

    const allowedFilters = [
      'nombre_pc',
      'nombre_host',
      'usuario',
      'responsable_equipo',
      'ip',
      'direccion_ip',
      'mac_address',
      'direccion_mac',
      'departamento',
      'serie',
      'no_serie',
      'marca',
      'modelo',
      'modelo_pc',
      'tipo_recurso',
      'activo',
      'empresa',
      'area',
      'establecimiento',
      'sistema_operativo',
      'procesador',
      'antivirus',
      'etiquetado',
      'ubicacion',
      'tipo_tarjeta_red',
    ];

    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM equipos';
      let countQuery = 'SELECT COUNT(*) as total FROM equipos';
      const params: any[] = [];

      if (search) {
        const p = `%${search}%`;

        if (filterBy !== 'all' && allowedFilters.includes(filterBy)) {
          const cond = ` WHERE ${filterBy} LIKE ? `;
          query += cond;
          countQuery += cond;
          params.push(p);
        } else {
          const cond = `
            WHERE nombre_pc LIKE ?
            OR nombre_host LIKE ?
            OR usuario LIKE ?
            OR responsable_equipo LIKE ?
            OR ip LIKE ?
            OR direccion_ip LIKE ?
            OR mac_address LIKE ?
            OR direccion_mac LIKE ?
            OR departamento LIKE ?
            OR serie LIKE ?
            OR no_serie LIKE ?
            OR marca LIKE ?
            OR modelo LIKE ?
            OR modelo_pc LIKE ?
            OR tipo_recurso LIKE ?
            OR empresa LIKE ?
            OR area LIKE ?
            OR establecimiento LIKE ?
            OR sistema_operativo LIKE ?
            OR procesador LIKE ?
            OR antivirus LIKE ?
            OR etiquetado LIKE ?
            OR ubicacion LIKE ?
            OR tipo_tarjeta_red LIKE ?
          `;
          query += cond;
          countQuery += cond;
          params.push(
            p, p, p, p, p, p, p, p, p, p, p, p,
            p, p, p, p, p, p, p, p, p, p, p, p
          );
        }
      }

      query += ' ORDER BY id DESC LIMIT ? OFFSET ?';

      const [counts]: any = await connection.query(countQuery, params);
      const [rows]: any = await connection.query(query, [...params, limit, offset]);

      res.json({
        data: rows,
        total: counts[0].total,
        page,
        totalPages: Math.ceil(counts[0].total / limit),
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener datos: ' + error.message });
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

app.post('/api/equipos', async (req, res) => {
  try {
    const equipo = mapEquipo(req.body);

    const connection = await pool.getConnection();
    await connection.query('INSERT INTO equipos SET ?', [equipo]);
    connection.release();

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear equipo: ' + error.message });
  }
});

app.put('/api/equipos/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const equipo: any = mapEquipo(req.body);
    delete equipo.id;
    delete equipo.created_at;

    const connection = await pool.getConnection();
    await connection.query('UPDATE equipos SET ? WHERE id = ?', [equipo, req.params.id]);
    connection.release();

    res.json({ success: true });
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

app.post('/api/importexcel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió archivo' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const row of jsonData) {
        const equipo = mapEquipo({
          empresa: row['EMPRESA'],
          establecimiento: row['ESTABLECIMIENTO'],
          departamento: row['DEPARTAMENTO'],
          area: row['AREA'],
          jefe_area: row['JEFE AREA'],
          responsable_equipo: row['RESPONSABLE DEL EQUIPO'],
          fecha_adquisicion: row['FECHA DE ADQUISICION'],
          fecha_instalacion: row['FECHA DE INSTALACION'],
          proveedor: row['PROVEEDOR'],
          tipo_recurso: row['TIPO RECURSO (CPU/NUC/LAPTOP)'] || row['TIPO RECURSO'],
          marca: row['MARCA'],
          modelo: row['MODELO'],
          modelo_pc: row['MODELO PC'],
          nombre_host: row['NOMBRE HOST'],
          nombre_pc: row['NOMBRE PC'] || row['NOMBRE HOST'],
          active_directory: row['ACTIVE DIRECTORY'],
          dominio: row['DOMINIO'],
          usuario: row['USUARIO'],
          contrasena: row['CONTRASEÑA'] || row['CONTRASENA'],
          sistema_operativo: row['SISTEMA OPERATIVO'],
          tiene_licencia_windows: row['TIENE LICENCIA WINDOWS'],
          codigo_licencia_windows: row['CODIGO DE LICENCIA DE WINDOWS'] || row['CODIGO LICENCIA WINDOWS'],
          tiene_licencia_office: row['TIENE LICENCIA OFFICE'],
          mac_address: row['MAC ADDRESS'],
          direccion_mac: row['DIRECCION MAC'],
          mac_address2: row['MAC ADDRESS 2'],
          ip: row['IP'],
          direccion_ip: row['DIRECCION IP'],
          ip_extendida: row['IP-EXTENDIDA'] || row['IP EXTENDIDA'],
          serie: row['SERIE'],
          no_serie: row['NO SERIE'],
          procesador: row['PROCESADOR'],
          ram: row['RAM'],
          ram_gb: row['RAM GB'],
          disco: row['DISCO'],
          disco_gb: row['DISCO GB'],
          antivirus: row['ANTIVIRUS'],
          tiene_mouse: row['TIENE MOUSE'],
          tiene_teclado: row['TIENE TECLADO'],
          tiene_parlante: row['TIENE PARLANTE'],
          tipo_tarjeta_red: row['TIPO TARJETA RED'],
          ubicacion: row['UBICACION'] || row['UBICACIÓN'],
          fecha_inventario: row['FECHA DEL INVENTARIO'],
          responsable_inventario: row['RESPONSABLE DEL INVENTARIO'],
          fecha_mantenimiento: row['FECHA DEL MANTENIMIENTO'],
          detalle_mantenimiento: row['DETALLE MANTENIMIENTO'],
          activo: row['ACTIVO'],
          observacion: row['OBSERVACIÓN'] || row['OBSERVACION'],
          observaciones: row['OBSERVACIONES'],
          etiquetado: row['ETIQUETADO.'] || row['ETIQUETADO'],
        });

        await connection.query('INSERT INTO equipos SET ?', [equipo]);
      }

      await connection.commit();
      res.json({ success: true, message: `Importados ${jsonData.length} registros correctamente.` });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('ERROR DETALLADO:', error);
    res.status(500).json({ error: 'Error al importar Excel: ' + error.message });
  }
});

app.get('/api/export', async (_req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows]: any = await connection.query('SELECT * FROM equipos ORDER BY id ASC');
    connection.release();

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipos');

    const cols = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
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

app.get('/api/script', (_req, res) => {
  const script = `# URL del servidor web
$UrlApi = 'http://10.51.17.205:5000/api/equipos'

function Leer-SiNo($mensaje) {
    do {
        $valor = (Read-Host "$mensaje (SI/NO)").Trim().ToUpper()
        if ($valor -eq '') { return $null }
    } while ($valor -ne 'SI' -and $valor -ne 'NO')
    return $valor
}

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host " INVENTARIO DE EQUIPOS" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$pc       = $env:COMPUTERNAME
$usuario  = $env:USERNAME
$dominio  = $env:USERDOMAIN

$ipObj = Get-NetIPAddress -AddressFamily IPv4 |
         Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' } |
         Select-Object -First 1
$ip = if ($ipObj) { $ipObj.IPAddress } else { 'Sin_IP' }

$adaptador = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
if ($adaptador) {
    $mac = $adaptador.MacAddress
    if ($adaptador.InterfaceDescription -match 'USB') { $tipoNIC = 'Externa USB' }
    elseif ($adaptador.InterfaceDescription -match 'Wi-Fi|Wireless') { $tipoNIC = 'Integrada WiFi' }
    else { $tipoNIC = 'Integrada Ethernet' }
} else {
    $mac = 'Sin_MAC'
    $tipoNIC = 'Desconocida'
}

$so      = (Get-CimInstance Win32_OperatingSystem).Caption
$ram     = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB
$ramGB   = [math]::Round($ram, 0)
$cpu     = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name
$discoC  = (Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq 'C:' }).Size / 1GB
$discoGB = [math]::Round($discoC, 0)
$pcInfo  = Get-CimInstance Win32_ComputerSystem
$modelo  = $pcInfo.Model
$marcaHw = $pcInfo.Manufacturer
$serial  = (Get-CimInstance Win32_BIOS).SerialNumber

if ($modelo -match 'NUC') { $tipoRecurso = 'NUC' }
elseif ($modelo -match 'LAPTOP|NOTEBOOK|BOOK|ThinkPad|EliteBook|Latitude' -or $pcInfo.PCSystemType -eq 2) { $tipoRecurso = 'LAPTOP' }
elseif ($modelo -match 'TABLET|MOBILE|PHONE') { $tipoRecurso = 'DISPOSITIVO MOVIL' }
else { $tipoRecurso = 'CPU' }

Write-Host ""
Write-Host "Complete los datos administrativos del equipo:" -ForegroundColor Yellow
Write-Host ""

$establecimiento        = Read-Host "Establecimiento"
$departamento           = Read-Host "Departamento"
$area                   = Read-Host "Area"
$jefeArea               = Read-Host "Jefe de area"
$responsableEquipo      = Read-Host "Responsable del equipo"
$contrasena             = Read-Host "Contrasena"
$tieneLicenciaWindows   = Leer-SiNo "Tiene licencia Windows"
$codigoLicenciaWindows  = Read-Host "Codigo licencia Windows"
$tieneLicenciaOffice    = Leer-SiNo "Tiene licencia Office"
$antivirus              = Read-Host "Antivirus"
$tieneMouse             = Leer-SiNo "Tiene mouse"
$tieneTeclado           = Leer-SiNo "Tiene teclado"
$tieneParlante          = Leer-SiNo "Tiene parlante"
$ubicacion              = Read-Host "Ubicacion"
$etiquetado             = Read-Host "Etiquetado"
$observacion            = Read-Host "Observacion"

$datos = @{
    nombre_pc               = $pc
    nombre_host             = $pc
    usuario                 = $usuario
    dominio                 = $dominio
    active_directory        = $dominio
    direccion_ip            = $ip
    ip                      = $ip
    direccion_mac           = $mac
    mac_address             = $mac
    tipo_tarjeta_red        = $tipoNIC
    sistema_operativo       = $so
    ram_gb                  = $ramGB
    ram                     = "$($ramGB)GB"
    procesador              = $cpu
    disco_gb                = $discoGB
    disco                   = "$($discoGB)GB"
    modelo_pc               = $modelo
    modelo                  = $modelo
    no_serie                = $serial
    serie                   = $serial
    tipo_recurso            = $tipoRecurso
    marca                   = $marcaHw

    establecimiento         = $establecimiento
    departamento            = $departamento
    area                    = $area
    jefe_area               = $jefeArea
    responsable_equipo      = $responsableEquipo
    contrasena              = $contrasena
    tiene_licencia_windows  = $tieneLicenciaWindows
    codigo_licencia_windows = $codigoLicenciaWindows
    tiene_licencia_office   = $tieneLicenciaOffice
    antivirus               = $antivirus
    tiene_mouse             = $tieneMouse
    tiene_teclado           = $tieneTeclado
    tiene_parlante          = $tieneParlante
    ubicacion               = $ubicacion
    etiquetado              = $etiquetado
    observacion             = $observacion
    observaciones           = $observacion
    fecha_inventario        = (Get-Date -Format 'yyyy-MM-dd')
    activo                  = 'SI'
    empresa                 = 'Santa Priscila'
}

$json = $datos | ConvertTo-Json -Compress
Write-Host "🌐 Enviando a: $UrlApi" -ForegroundColor Cyan
Write-Host "📦 Datos JSON: $json" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $UrlApi -Method POST -Body $json -ContentType 'application/json' -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        Write-Host "✅ Datos enviados correctamente" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Respuesta inesperada: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 DATOS RECOPILADOS:" -ForegroundColor Cyan
Write-Host "  PC           : $pc"
Write-Host "  Usuario      : $usuario"
Write-Host "  IP           : $ip"
Write-Host "  MAC          : $mac"
Write-Host "  SO           : $so"
Write-Host "  RAM          : $($ramGB)GB"
Write-Host "  CPU          : $cpu"
Write-Host "  Disco        : $($discoGB)GB"
Write-Host "  Modelo       : $modelo"
Write-Host "  Serial       : $serial"
Write-Host "  Departamento : $departamento"
Write-Host "  Area         : $area"
Write-Host "  Responsable  : $responsableEquipo"
Write-Host ""

Read-Host "Presiona ENTER para cerrar"`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(script);
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
