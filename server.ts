import express from 'express';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';
import { stringify } from 'csv-stringify/sync';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventario_web',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create table if not exists
async function initDb() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS equipos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_pc VARCHAR(100) NOT NULL,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('📊 Tabla "equipos" verificada/creada correctamente');
  } catch (error) {
    console.error('❌ Error al crear tabla:', error);
  } finally {
    connection.release();
  }
}

const app = express();
app.use(express.json());

// API Routes
app.get('/api/equipos', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.q as string || '';

    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM equipos';
      let countQuery = 'SELECT COUNT(*) as total FROM equipos';
      const params: any[] = [];

      if (search) {
        const searchCondition = ` WHERE nombre_pc LIKE ? OR direccion_ip LIKE ? OR ubicacion LIKE ?`;
        query += searchCondition;
        countQuery += searchCondition;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
      
      const [countResult]: any = await connection.query(countQuery, params);
      const total = countResult[0].total;
      
      const [items] = await connection.query(query, [...params, limit, offset]);

      res.json({
        data: items,
        total: total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error en GET /api/equipos:', error);
    res.status(500).json({ error: 'Error al obtener equipos' });
  }
});

app.post('/api/equipos', async (req, res) => {
  try {
    const {
      nombre_pc, usuario, dominio, direccion_ip, direccion_mac,
      tipo_tarjeta_red, sistema_operativo, ram_gb, procesador,
      disco_gb, modelo_pc, no_serie, ubicacion, observaciones
    } = req.body;

    const connection = await pool.getConnection();
    try {
      const [result]: any = await connection.query(
        `INSERT INTO equipos (
          nombre_pc, usuario, dominio, direccion_ip, direccion_mac,
          tipo_tarjeta_red, sistema_operativo, ram_gb, procesador,
          disco_gb, modelo_pc, no_serie, ubicacion, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre_pc, usuario, dominio, direccion_ip, direccion_mac,
          tipo_tarjeta_red, sistema_operativo, ram_gb, procesador,
          disco_gb, modelo_pc, no_serie, ubicacion, observaciones
        ]
      );
      res.json({ id: result.insertId });
      console.log('✅ Equipo guardado:', nombre_pc);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error en POST /api/equipos:', error);
    res.status(500).json({ error: 'Error al guardar equipo' });
  }
});

app.get('/api/equipos/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const [items]: any = await connection.query(
        'SELECT * FROM equipos WHERE id = ?',
        [req.params.id]
      );
      if (items.length > 0) {
        res.json(items[0]);
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error en GET /api/equipos/:id:', error);
    res.status(500).json({ error: 'Error al obtener equipo' });
  }
});

app.put('/api/equipos/:id', async (req, res) => {
  try {
    const {
      nombre_pc, usuario, dominio, direccion_ip, direccion_mac,
      tipo_tarjeta_red, sistema_operativo, ram_gb, procesador,
      disco_gb, modelo_pc, no_serie, ubicacion, observaciones
    } = req.body;

    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE equipos SET
          nombre_pc = ?, usuario = ?, dominio = ?, direccion_ip = ?, direccion_mac = ?,
          tipo_tarjeta_red = ?, sistema_operativo = ?, ram_gb = ?, procesador = ?,
          disco_gb = ?, modelo_pc = ?, no_serie = ?, ubicacion = ?, observaciones = ?
        WHERE id = ?`,
        [
          nombre_pc, usuario, dominio, direccion_ip, direccion_mac,
          tipo_tarjeta_red, sistema_operativo, ram_gb, procesador,
          disco_gb, modelo_pc, no_serie, ubicacion, observaciones,
          req.params.id
        ]
      );
      res.json({ success: true });
      console.log('✅ Equipo actualizado:', nombre_pc);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error en PUT /api/equipos/:id:', error);
    res.status(500).json({ error: 'Error al actualizar equipo' });
  }
});

app.delete('/api/equipos/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('DELETE FROM equipos WHERE id = ?', [req.params.id]);
      res.json({ success: true });
      console.log('✅ Equipo eliminado:', req.params.id);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error en DELETE /api/equipos/:id:', error);
    res.status(500).json({ error: 'Error al eliminar equipo' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const [[totalPcsResult]]: any = await connection.query(
        'SELECT COUNT(*) as count FROM equipos'
      );
      const totalPcs = totalPcsResult.count;

      const [[totalRamResult]]: any = await connection.query(
        'SELECT SUM(ram_gb) as total FROM equipos'
      );
      const totalRam = totalRamResult.total || 0;

      const [byLocation]: any = await connection.query(
        'SELECT ubicacion, COUNT(*) as count FROM equipos GROUP BY ubicacion'
      );

      res.json({ totalPcs, totalRam, byLocation });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error en GET /api/stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

app.get('/api/export', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const [items]: any = await connection.query(
        'SELECT * FROM equipos ORDER BY id DESC'
      );
      const csv = stringify(items, { header: true });
      res.header('Content-Type', 'text/csv');
      res.attachment('inventario.csv');
      res.send(csv);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error en GET /api/export:', error);
    res.status(500).json({ error: 'Error al exportar datos' });
  }
});

async function startServer() {
  const PORT = 5000;

  // Inicializar base de datos
  await initDb();

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
    console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
    console.log(`🌐 Accesible en: http://10.51.17.205:${PORT}`);
    console.log(`📌 Base de datos: ${process.env.DB_NAME || 'inventario'}`);
  });
}

startServer().catch(console.error);
