import Database from 'better-sqlite3';
import faker from 'faker';

// open the existing database (or create if not exists)
const db = new Database('inventario.db');

// helper to insert one row
function insertRandom() {
  const stmt = db.prepare(`
    INSERT INTO equipos (
      nombre_pc, usuario, dominio, direccion_ip, direccion_mac,
      tipo_tarjeta_red, sistema_operativo, ram_gb, procesador,
      disco_gb, modelo_pc, no_serie, ubicacion, observaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    faker.computer().name(),
    faker.internet().userName(),
    faker.internet().domainName(),
    faker.internet().ip(),
    faker.internet().mac(),
    faker.random.word(),
    faker.random.arrayElement(['Windows 10', 'Windows 11', 'Ubuntu', 'macOS']),
    faker.datatype.number({ min: 4, max: 64 }),
    faker.computer().processor(),
    faker.datatype.number({ min: 128, max: 2048 }),
    faker.computer().model(),
    faker.datatype.uuid(),
    faker.address.city(),
    faker.lorem.sentence()
  );
  return info.lastInsertRowid;
}

// insert a bunch of rows
const count = parseInt(process.argv[2] || '100', 10);
console.log(`Seeding ${count} equipos...`);
for (let i = 0; i < count; i++) {
  insertRandom();
}
console.log('Done');
