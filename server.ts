import express from 'express';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

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
  queueLimit: 0
});

async function initDb() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS equipos (
        id INT AUTO_INCREMENT PRIMARY KEY,
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
        nombre_pc VARCHAR(100) NULL,
        active_directory VARCHAR(100),
        usuario VARCHAR(100),
        contrasena VARCHAR(100),
        sistema_operativo VARCHAR(100),
        tiene_licencia_windows VARCHAR(10),
        codigo_licencia_windows VARCHAR(150),
        tiene_licencia_office VARCHAR(10),
        mac_address VARCHAR(50),
        mac_address2 VARCHAR(50),
        ip VARCHAR(45),
        ip_extendida VARCHAR(50),
        serie VARCHAR(100),
        procesador VARCHAR(255),
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
        etiquetado VARCHAR(100),
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
app.use(express.json());
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

// 1. Obtener equipos (búsqueda + paginación)
app.get('/api/equipos', async (req, res) => {
  try {
    const page   = parseInt(req.query.page  as string) || 1;
    const limit  = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 10), 20); // ✅ aquí dentro
    const offset = (page - 1) * limit;
    const search = (req.query.q as string) || '';

    const connection = await pool.getConnection();
    try {
      let query      = 'SELECT * FROM equipos';
      let countQuery = 'SELECT COUNT(*) as total FROM equipos';
      const params: any[] = [];

      if (search) {
        const cond = ` WHERE nombre_pc LIKE ? OR nombre_host LIKE ? OR usuario LIKE ? OR ip LIKE ?`;
        query      += cond;
        countQuery += cond;
        const p = `%${search}%`;
        params.push(p, p, p, p);
      }

      query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
      const [counts]: any = await connection.query(countQuery, params);
      const [rows]   = await connection.query(query, [...params, limit, offset]);

      res.json({
        data:       rows,
        total:      counts[0].total,
        page,
        totalPages: Math.ceil(counts[0].total / limit)
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

// 2. Obtener un equipo por ID
app.get('/api/equipos/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows]: any = await connection.query('SELECT * FROM equipos WHERE id = ?', [req.params.id]);
    connection.release();
    if (rows.length === 0) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener equipo' });
  }
});

// 3. Crear equipo
app.post('/api/equipos', async (req, res) => {
  try {
    const body = req.body;
    const equipo: any = {
      empresa:                body.empresa || 'Santa Priscila',
      establecimiento:        body.establecimiento || null,
      departamento:           body.departamento || null,
      area:                   body.area || null,
      jefe_area:              body.jefe_area || null,
      responsable_equipo:     body.responsable_equipo || null,
      proveedor:              body.proveedor || null,
      tipo_recurso:           body.tipo_recurso || null,
      marca:                  body.marca || null,
      modelo:                 body.modelo || body.modelo_pc || null,
      nombre_host:            body.nombre_host || body.nombre_pc || null,
      nombre_pc:              body.nombre_pc || body.nombre_host || 'SIN NOMBRE',
      active_directory:       body.active_directory || body.dominio || null,
      usuario:                body.usuario || null,
      contrasena:             body.contrasena || null,
      sistema_operativo:      body.sistema_operativo || null,
      tiene_licencia_windows: body.tiene_licencia_windows || null,
      codigo_licencia_windows:body.codigo_licencia_windows || null,
      tiene_licencia_office:  body.tiene_licencia_office || null,
      mac_address:            body.mac_address || body.direccion_mac || null,
      mac_address2:           body.mac_address2 || null,
      ip:                     body.ip || body.direccion_ip || null,
      ip_extendida:           body.ip_extendida || null,
      serie:                  body.serie || body.no_serie || null,
      procesador:             body.procesador || null,
      ram:                    body.ram || (body.ram_gb != null ? `${body.ram_gb}GB` : null),
      disco:                  body.disco || (body.disco_gb != null ? `${body.disco_gb}GB` : null),
      antivirus:              body.antivirus || null,
      tiene_mouse:            body.tiene_mouse || null,
      tiene_teclado:          body.tiene_teclado || null,
      tiene_parlante:         body.tiene_parlante || null,
      responsable_inventario: body.responsable_inventario || null,
      detalle_mantenimiento:  body.detalle_mantenimiento || null,
      activo:                 body.activo || 'SI',
      observacion:            body.observacion || body.observaciones || null,
      etiquetado:             body.etiquetado || null,
      fecha_adquisicion:      formatDate(body.fecha_adquisicion),
      fecha_instalacion:      formatDate(body.fecha_instalacion),
      fecha_inventario:       formatDate(body.fecha_inventario),
      fecha_mantenimiento:    formatDate(body.fecha_mantenimiento),
    };

    const connection = await pool.getConnection();
    await connection.query('INSERT INTO equipos SET ?', [equipo]);
    connection.release();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear equipo: ' + error.message });
  }
});

// 4. Editar equipo
app.put('/api/equipos/:id', async (req, res) => {
  try {
    const body = req.body;
    const equipo = {
      ...body,
      fecha_adquisicion:   formatDate(body.fecha_adquisicion),
      fecha_instalacion:   formatDate(body.fecha_instalacion),
      fecha_inventario:    formatDate(body.fecha_inventario),
      fecha_mantenimiento: formatDate(body.fecha_mantenimiento),
      nombre_pc: body.nombre_pc || body.nombre_host || 'SIN NOMBRE',
    };
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

// 5. Eliminar equipo
app.delete('/api/equipos/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM equipos WHERE id = ?', [req.params.id]);
    connection.release();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// 6. Importar Excel
app.post('/api/importexcel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió archivo' });

    const workbook  = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const row of jsonData) {
        const equipo: any = {
          empresa:                row['EMPRESA'] || 'Santa Priscila',
          establecimiento:        row['ESTABLECIMIENTO'] || null,
          departamento:           row['DEPARTAMENTO'] || null,
          area:                   row['AREA'] || null,
          jefe_area:              row['JEFE AREA'] || null,
          responsable_equipo:     row['RESPONSABLE DEL EQUIPO'] || null,
          fecha_adquisicion:      formatDate(row['FECHA DE ADQUISICION']),
          fecha_instalacion:      formatDate(row['FECHA DE INSTALACION']),
          proveedor:              row['PROVEEDOR'] || null,
          tipo_recurso:           row['TIPO RECURSO (CPU/NUC/LAPTOP)'] || null,
          marca:                  row['MARCA'] || null,
          modelo:                 row['MODELO'] || null,
          nombre_host:            row['NOMBRE HOST'] || null,
          nombre_pc:              row['NOMBRE HOST'] || 'SIN NOMBRE',
          active_directory:       row['ACTIVE DIRECTORY'] || null,
          usuario:                row['USUARIO'] || null,
          contrasena:             row['CONTRASEÑA'] || null,
          sistema_operativo:      row['SISTEMA OPERATIVO'] || null,
          tiene_licencia_windows: row['TIENE LICENCIA WINDOWS'] || null,
          codigo_licencia_windows:row['CODIGO DE LICENCIA DE WINDOWS'] || null,
          tiene_licencia_office:  row['TIENE LICENCIA OFFICE'] || null,
          mac_address:            row['MAC ADDRESS'] || null,
          mac_address2:           row['MAC ADDRESS 2'] || null,
          ip:                     row['IP'] || null,
          ip_extendida:           row['IP-EXTENDIDA'] || null,
          serie:                  row['SERIE'] || null,
          procesador:             row['PROCESADOR'] || null,
          ram:                    row['RAM'] ? String(row['RAM']) : null,
          disco:                  row['DISCO'] ? String(row['DISCO']) : null,
          antivirus:              row['ANTIVIRUS'] || null,
          tiene_mouse:            row['TIENE MOUSE'] || null,
          tiene_teclado:          row['TIENE TECLADO'] || null,
          tiene_parlante:         row['TIENE PARLANTE'] || null,
          fecha_inventario:       formatDate(row['FECHA DEL INVENTARIO']),
          responsable_inventario: row['RESPONSABLE DEL INVENTARIO'] || null,
          fecha_mantenimiento:    formatDate(row['FECHA DEL MANTENIMIENTO']),
          detalle_mantenimiento:  row['DETALLE MANTENIMIENTO'] || null,
          activo:                 row['ACTIVO'] || 'SI',
          observacion:            row['OBSERVACIÓN'] || null,
          etiquetado:             row['ETIQUETADO.'] || null,
        };
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

// 7. Exportar Excel
app.get('/api/export', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows]: any = await connection.query('SELECT * FROM equipos ORDER BY id ASC');
    connection.release();

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipos');

    const cols = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
    worksheet['!cols'] = cols;

    const rawBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const buffer    = Buffer.from(rawBuffer);

    res.setHeader('Content-Disposition', 'attachment; filename="inventario_equipos.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Error al exportar' });
  }
});

// 8. Script PowerShell
app.get('/api/script', (req, res) => {
  const script = `# URL del servidor web
$UrlApi = 'http://10.51.17.205:5000/api/equipos'

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

$datos = @{
    nombre_pc         = $pc
    usuario           = $usuario
    dominio           = $dominio
    direccion_ip      = $ip
    direccion_mac     = $mac
    tipo_tarjeta_red  = $tipoNIC
    sistema_operativo = $so
    ram_gb            = $ramGB
    procesador        = $cpu
    disco_gb          = $discoGB
    modelo_pc         = $modelo
    no_serie          = $serial
    tipo_recurso      = $tipoRecurso
    marca             = $marcaHw
    ubicacion         = 'Por definir'
    observaciones     = ''
    fecha_inventario  = (Get-Date -Format 'yyyy-MM-dd')
}

$json = $datos | ConvertTo-Json -Compress
Write-Host "🌐 Enviando a: $UrlApi" -ForegroundColor Cyan
Write-Host "📦 Datos JSON: $json" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $UrlApi -Method POST -Body $json -ContentType 'application/json' -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Datos enviados correctamente" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Respuesta inesperada: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 DATOS RECOPILADOS:" -ForegroundColor Cyan
Write-Host "  PC     : $pc"
Write-Host "  Usuario: $usuario"
Write-Host "  IP     : $ip"
Write-Host "  MAC    : $mac"
Write-Host "  SO     : $so"
Write-Host "  RAM    : \${ramGB}GB"
Write-Host "  CPU    : $cpu"
Write-Host "  Disco  : \${discoGB}GB"
Write-Host "  Modelo : $modelo"
Write-Host "  Serial : $serial"
Write-Host ""

Read-Host "Presiona ENTER para cerrar"`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(script);
});

// 9. Estadísticas
app.get('/api/stats', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [[{ totalPcs }]]: any = await connection.query('SELECT COUNT(*) as totalPcs FROM equipos');
    const [[{ activos }]]: any  = await connection.query("SELECT COUNT(*) as activos FROM equipos WHERE activo = 'SI'");
    const [[{ inactivos }]]: any = await connection.query("SELECT COUNT(*) as inactivos FROM equipos WHERE activo = 'NO' OR activo IS NULL OR activo = ''");

    const [[licencias]]: any = await connection.query(`
      SELECT
        SUM(tiene_licencia_windows = 'SI') as conLicenciaWindows,
        SUM(tiene_licencia_windows = 'NO') as sinLicenciaWindows,
        SUM(tiene_licencia_office  = 'SI') as conLicenciaOffice,
        SUM(tiene_licencia_office  = 'NO') as sinLicenciaOffice
      FROM equipos
    `);

    const [byTipoRecurso]: any = await connection.query(`
      SELECT tipo_recurso, COUNT(*) as count FROM equipos
      WHERE tipo_recurso IS NOT NULL AND tipo_recurso != ''
      GROUP BY tipo_recurso ORDER BY count DESC
    `);

    const [byArea]: any = await connection.query(`
      SELECT area, COUNT(*) as count FROM equipos
      WHERE area IS NOT NULL AND area != ''
      GROUP BY area ORDER BY count DESC LIMIT 10
    `);

    const [byOS]: any = await connection.query(`
      SELECT sistema_operativo, COUNT(*) as count FROM equipos
      WHERE sistema_operativo IS NOT NULL AND sistema_operativo != ''
      GROUP BY sistema_operativo ORDER BY count DESC LIMIT 10
    `);

    connection.release();
    res.json({ totalPcs, activos, inactivos, licencias, byTipoRecurso, byArea, byOS });
  } catch (error: any) {
    console.error('Error stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas: ' + error.message });
  }
});

// ── INICIO SERVIDOR ────────────────────────────────────────────
async function startServer() {
  await initDb();
  const PORT = 5000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor en http://10.51.17.205:${PORT}`);
  });
}

startServer().catch(console.error);
