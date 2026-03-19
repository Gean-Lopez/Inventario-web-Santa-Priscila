import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import faker from 'faker';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventario_web',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function sqlDate(daysAgoMax = 3650) {
  const date = faker.date.past(10);
  const limitedDate = new Date(
    Math.max(date.getTime(), Date.now() - daysAgoMax * 24 * 60 * 60 * 1000)
  );
  return limitedDate.toISOString().slice(0, 10);
}

function buildEquipo() {
  const marca = randomFrom(['Dell', 'HP', 'Lenovo', 'ASUS', 'Acer']);
  const modelo = `${marca} ${faker.commerce.productAdjective()} ${faker.random.alphaNumeric(4).toUpperCase()}`;
  const nombreHost = faker.internet.userName().replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
  const ram = randomFrom(['8 GB', '16 GB', '32 GB']);
  const disco = randomFrom(['256 GB SSD', '512 GB SSD', '1 TB HDD', '1 TB SSD']);
  const activo = randomFrom(['SI', 'NO']);

  return {
    empresa: 'Santa Priscila',
    establecimiento: faker.address.cityName(),
    departamento: randomFrom(['Sistemas', 'Finanzas', 'Talento Humano', 'Compras', 'Produccion']),
    area: randomFrom(['Infraestructura', 'Soporte', 'Administracion', 'Operaciones']),
    jefe_area: faker.name.findName(),
    responsable_equipo: faker.name.findName(),
    fecha_adquisicion: sqlDate(),
    fecha_instalacion: sqlDate(),
    proveedor: faker.company.companyName(),
    tipo_recurso: randomFrom(['LAPTOP', 'DESKTOP', 'AIO', 'NUC']),
    marca,
    modelo,
    modelo_pc: modelo,
    nombre_host: nombreHost,
    nombre_pc: nombreHost,
    active_directory: faker.internet.domainWord().toUpperCase(),
    dominio: faker.internet.domainWord().toUpperCase(),
    usuario: faker.internet.userName(),
    contrasena: null,
    sistema_operativo: randomFrom(['Windows 10', 'Windows 11']),
    tiene_licencia_windows: 'SI',
    codigo_licencia_windows: faker.random.alphaNumeric(20).toUpperCase(),
    tiene_licencia_office: randomFrom(['SI', 'NO']),
    mac_address: faker.internet.mac(),
    direccion_mac: faker.internet.mac(),
    mac_address2: faker.internet.mac(),
    ip: faker.internet.ip(),
    direccion_ip: faker.internet.ip(),
    ip_extendida: null,
    serie: faker.random.alphaNumeric(12).toUpperCase(),
    no_serie: faker.random.alphaNumeric(12).toUpperCase(),
    procesador: randomFrom([
      'Intel Core i5',
      'Intel Core i7',
      'AMD Ryzen 5',
      'AMD Ryzen 7',
    ]),
    ram,
    ram_gb: parseInt(ram, 10),
    disco,
    disco_gb: disco.includes('1 TB') ? 1024 : parseInt(disco, 10),
    antivirus: randomFrom(['Microsoft Defender', 'ESET', 'Kaspersky']),
    tiene_mouse: 'SI',
    tiene_teclado: 'SI',
    tiene_parlante: randomFrom(['SI', 'NO']),
    tipo_tarjeta_red: randomFrom(['Ethernet', 'Wi-Fi']),
    ubicacion: faker.address.cityName(),
    fecha_inventario: sqlDate(365),
    responsable_inventario: faker.name.findName(),
    fecha_mantenimiento: sqlDate(365),
    detalle_mantenimiento: faker.lorem.sentence(),
    activo,
    observacion: faker.lorem.sentence(),
    observaciones: faker.lorem.sentence(),
    etiquetado: activo === 'SI' ? 'OK' : 'PENDIENTE',
  };
}

async function seed(count: number) {
  const connection = await pool.getConnection();

  try {
    console.log(`Insertando ${count} equipos en MySQL...`);

    for (let i = 0; i < count; i += 1) {
      const equipo = buildEquipo();

      await connection.query(
        `
          INSERT INTO equipos (
            empresa, establecimiento, departamento, area, jefe_area, responsable_equipo,
            fecha_adquisicion, fecha_instalacion, proveedor, tipo_recurso, marca, modelo,
            modelo_pc, nombre_host, nombre_pc, active_directory, dominio, usuario, contrasena,
            sistema_operativo, tiene_licencia_windows, codigo_licencia_windows,
            tiene_licencia_office, mac_address, direccion_mac, mac_address2, ip, direccion_ip,
            ip_extendida, serie, no_serie, procesador, ram, ram_gb, disco, disco_gb, antivirus,
            tiene_mouse, tiene_teclado, tiene_parlante, tipo_tarjeta_red, ubicacion,
            fecha_inventario, responsable_inventario, fecha_mantenimiento,
            detalle_mantenimiento, activo, observacion, observaciones, etiquetado
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?
          )
        `,
        [
          equipo.empresa,
          equipo.establecimiento,
          equipo.departamento,
          equipo.area,
          equipo.jefe_area,
          equipo.responsable_equipo,
          equipo.fecha_adquisicion,
          equipo.fecha_instalacion,
          equipo.proveedor,
          equipo.tipo_recurso,
          equipo.marca,
          equipo.modelo,
          equipo.modelo_pc,
          equipo.nombre_host,
          equipo.nombre_pc,
          equipo.active_directory,
          equipo.dominio,
          equipo.usuario,
          equipo.contrasena,
          equipo.sistema_operativo,
          equipo.tiene_licencia_windows,
          equipo.codigo_licencia_windows,
          equipo.tiene_licencia_office,
          equipo.mac_address,
          equipo.direccion_mac,
          equipo.mac_address2,
          equipo.ip,
          equipo.direccion_ip,
          equipo.ip_extendida,
          equipo.serie,
          equipo.no_serie,
          equipo.procesador,
          equipo.ram,
          equipo.ram_gb,
          equipo.disco,
          equipo.disco_gb,
          equipo.antivirus,
          equipo.tiene_mouse,
          equipo.tiene_teclado,
          equipo.tiene_parlante,
          equipo.tipo_tarjeta_red,
          equipo.ubicacion,
          equipo.fecha_inventario,
          equipo.responsable_inventario,
          equipo.fecha_mantenimiento,
          equipo.detalle_mantenimiento,
          equipo.activo,
          equipo.observacion,
          equipo.observaciones,
          equipo.etiquetado,
        ]
      );
    }

    console.log('Seed completado.');
  } finally {
    connection.release();
    await pool.end();
  }
}

const count = parseInt(process.argv[2] || '100', 10);

seed(count).catch((error) => {
  console.error('Error al ejecutar seed:', error);
  process.exit(1);
});
