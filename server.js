const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./textiles.sqlite', (err) => {
  if (err) console.error('Error al abrir BD:', err.message);
  else console.log('Conectado a la base de datos SQLite de Ventas Textiles.');
});

db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON`);

  // TABLA MAESTRO: ordenes_venta (Empresas textiles clientes)
  db.run(`
    CREATE TABLE IF NOT EXISTS ordenes_venta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa TEXT NOT NULL,
      contacto TEXT NOT NULL,
      fecha TEXT NOT NULL,
      estado TEXT NOT NULL
    )
  `);

  // TABLA DETALLE: detalle_telas (Rollos/Metros de tela por orden)
  db.run(`
    CREATE TABLE IF NOT EXISTS detalle_telas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orden_id INTEGER NOT NULL,
      tipo_tela TEXT NOT NULL,
      color TEXT NOT NULL,
      metros REAL NOT NULL,
      precio_metro REAL NOT NULL,
      FOREIGN KEY (orden_id) REFERENCES ordenes_venta(id) ON DELETE CASCADE
    )
  `);

  // Datos iniciales de ejemplo si la base está vacía
  db.get(`SELECT COUNT(*) AS count FROM ordenes_venta`, (err, row) => {
    if (row && row.count === 0) {
      db.run(
        `INSERT INTO ordenes_venta (empresa, contacto, fecha, estado) VALUES ('Confecciones del Sur S.A.', 'Ing. Roberto Díaz', '2026-11-20', 'Entregado')`,
        function () {
          const o1 = this.lastID;
          db.run(`INSERT INTO detalle_telas (orden_id, tipo_tela, color, metros, precio_metro) VALUES (?, 'Mezclilla 14 oz', 'Azul Índigo', 150, 85.00)`, [o1]);
          db.run(`INSERT INTO detalle_telas (orden_id, tipo_tela, color, metros, precio_metro) VALUES (?, 'Popelina Algodón', 'Blanco Óptico', 80, 48.50)`, [o1]);
        }
      );
      db.run(
        `INSERT INTO ordenes_venta (empresa, contacto, fecha, estado) VALUES ('Textiles Teziutlán Maquila', 'Lic. Mariana Vargas', '2026-11-21', 'En Corte')`,
        function () {
          const o2 = this.lastID;
          db.run(`INSERT INTO detalle_telas (orden_id, tipo_tela, color, metros, precio_metro) VALUES (?, 'Gabardina Stretch', 'Negro', 200, 72.00)`, [o2]);
          db.run(`INSERT INTO detalle_telas (orden_id, tipo_tela, color, metros, precio_metro) VALUES (?, 'Felpa Afelpada', 'Gris Jaspe', 120, 64.00)`, [o2]);
        }
      );
    }
  });
});

// ================= RUTAS CRUD MAESTRO (ÓRDENES DE VENTA) =================

// CONSULTA (Read)
app.get('/api/ordenes', (req, res) => {
  const sql = `
    SELECT o.*, 
           COALESCE(SUM(d.metros), 0) AS total_metros,
           COALESCE(SUM(d.metros * d.precio_metro), 0) AS total_venta
    FROM ordenes_venta o
    LEFT JOIN detalle_telas d ON o.id = d.orden_id
    GROUP BY o.id
    ORDER BY o.id DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ALTA (Create)
app.post('/api/ordenes', (req, res) => {
  const { empresa, contacto, fecha, estado } = req.body;
  db.run(
    `INSERT INTO ordenes_venta (empresa, contacto, fecha, estado) VALUES (?, ?, ?, ?)`,
    [empresa, contacto, fecha, estado],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, empresa, contacto, fecha, estado });
    }
  );
});

// CAMBIO (Update)
app.put('/api/ordenes/:id', (req, res) => {
  const { empresa, contacto, fecha, estado } = req.body;
  db.run(
    `UPDATE ordenes_venta SET empresa = ?, contacto = ?, fecha = ?, estado = ? WHERE id = ?`,
    [empresa, contacto, fecha, estado, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// BAJA (Delete)
app.delete('/api/ordenes/:id', (req, res) => {
  db.run(`DELETE FROM ordenes_venta WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ================= RUTAS MAESTRO-DETALLE (TELAS POR ORDEN) =================

// CONSULTA MAESTRO-DETALLE
app.get('/api/ordenes/:id/detalles', (req, res) => {
  db.all(
    `SELECT * FROM detalle_telas WHERE orden_id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ALTA DETALLE (Agregar tela a la orden)
app.post('/api/ordenes/:id/detalles', (req, res) => {
  const { tipo_tela, color, metros, precio_metro } = req.body;
  db.run(
    `INSERT INTO detalle_telas (orden_id, tipo_tela, color, metros, precio_metro) VALUES (?, ?, ?, ?, ?)`,
    [req.params.id, tipo_tela, color, metros, precio_metro],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// BAJA DETALLE (Quitar tela de la orden)
app.delete('/api/detalles/:id', (req, res) => {
  db.run(`DELETE FROM detalle_telas WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});