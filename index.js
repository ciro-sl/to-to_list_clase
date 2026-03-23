// 'express' - Framework para crear el servidor web
const express = require('express');
// 'sqlite3' - Driver para conectar con la base de datos SQLite
const sqlite3 = require('sqlite3').verbose();

// 2. CREAR LA APLICACIÓN EXPRESS
const app = express();

// 3. DEFINIR EL PUERTO DEL SERVIDOR
const PORT = 5000;

// CONECTAR A LA BASE DE DATOS SQLite.
const db = new sqlite3.Database('./tareas.db', (err) => {
  if (err) {
    console.error('Error conectando a SQLite:', err.message);
  } else {
    console.log('Conectado a SQLite (base de datos local)');
    
    // Crear tabla de listas
    db.run(`CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3498db',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Crear tabla de tareas (con referencia a lista)
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'low',
      list_id INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES lists(id)
    )`);
    
    // Agregar columna priority si no existe (manejando error si ya existe)
    db.run(`ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'low'`, (err) => {
      // Ignorar error si la columna ya existe
    });
    
    // Insertar lista por defecto si no existe
    db.get('SELECT COUNT(*) as count FROM lists', (err, row) => {
      if (row.count === 0) {
        db.run("INSERT INTO lists (name, color) VALUES ('General', '#3498db')");
      }
    });
  }
});

// express.json() - Permite recibir y procesar datos en formato JSON
app.use(express.json());

// =================
// FUNCIONES DE VALIDACIÓN
// =================

// Validar nombre de lista (máximo 20 caracteres, sin caracteres especiales)
const validarNombreLista = (nombre) => {
  if (!nombre || nombre.trim() === '') {
    return { valido: false, error: 'El nombre de la lista es requerido' };
  }
  if (nombre.length > 20) {
    return { valido: false, error: 'El nombre de la lista no puede exceder 20 caracteres' };
  }
  const caracteresEspeciales = /[*+\-\.´¿!@#$%^&(){}[\]\\|<>?/~`]/;
  if (caracteresEspeciales.test(nombre)) {
    return { valido: false, error: 'El nombre no puede contener caracteres especiales como *+-´¿!@#$%^&()' };
  }
  return { valido: true };
};

// Validar tarea (título máximo 50 caracteres, descripción máximo 200 caracteres, sin caracteres especiales)
const validarTarea = (titulo, descripcion) => {
  if (!titulo || titulo.trim() === '') {
    return { valido: false, error: 'El título de la tarea es requerido' };
  }
  if (titulo.length > 50) {
    return { valido: false, error: 'El título no puede exceder 50 caracteres' };
  }
  if (descripcion && descripcion.length > 200) {
    return { valido: false, error: 'La descripción no puede exceder 200 caracteres' };
  }
  const caracteresEspeciales = /[*+\-\.´¿!@#$%^&(){}[\]\\|<>?/~`]/;
  if (caracteresEspeciales.test(titulo)) {
    return { valido: false, error: 'El título no puede contener caracteres especiales como *+-´¿!@#$%^&()' };
  }
  if (descripcion && caracteresEspeciales.test(descripcion)) {
    return { valido: false, error: 'La descripción no puede contener caracteres especiales como *+-´¿!@#$%^&()' };
  }
  return { valido: true };
};

// =================
// RUTAS DE LISTAS
// =================

// GET /api/lists - Obtener todas las listas
app.get('/api/lists', (req, res) => {
  db.all('SELECT * FROM lists ORDER BY createdAt ASC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// POST /api/lists - Crear una nueva lista
app.post('/api/lists', (req, res) => {
  const { name, color = '#3498db' } = req.body;
  
  // Validar nombre de la lista
  const validacion = validarNombreLista(name);
  if (!validacion.valido) {
    res.status(400).json({ error: validacion.error });
    return;
  }
  
  const stmt = db.prepare('INSERT INTO lists (name, color) VALUES (?, ?)');
  stmt.run(name.trim(), color, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, name: name.trim(), color });
  });
  stmt.finalize();
});

// PUT /api/lists/:id - Editar una lista
app.put('/api/lists/:id', (req, res) => {
  const { name, color } = req.body;
  
  // Validar nombre de la lista
  const validacion = validarNombreLista(name);
  if (!validacion.valido) {
    res.status(400).json({ error: validacion.error });
    return;
  }
  
  db.run('UPDATE lists SET name = ?, color = ? WHERE id = ?', 
    [name.trim(), color, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    db.get('SELECT * FROM lists WHERE id = ?', [req.params.id], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(row);
    });
  });
});

// DELETE /api/lists/:id - Eliminar una lista
app.delete('/api/lists/:id', (req, res) => {
  const listId = parseInt(req.params.id);
  
  // No permitir eliminar la lista por defecto (ID 1)
  if (listId === 1) {
    res.status(400).json({ error: 'No se puede eliminar la lista principal' });
    return;
  }
  
  // Primero eliminar todas las tareas de la lista
  db.run('DELETE FROM tasks WHERE list_id = ?', [listId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Luego eliminar la lista
    db.run('DELETE FROM lists WHERE id = ?', [listId], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Lista eliminada' });
    });
  });
});

// =================
// RUTAS DE TAREAS
// =================

// GET /api/tasks - Obtener todas las tareas (opcionalmente filtrar por lista)
app.get('/api/tasks', (req, res) => {
  const listId = req.query.list_id;
  
  let query = 'SELECT * FROM tasks';
  let params = [];
  
  if (listId) {
    query += ' WHERE list_id = ?';
    params.push(listId);
  }
  
  query += ' ORDER BY createdAt DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const tasks = rows.map(task => ({...task, completed: Boolean(task.completed)}));
    res.json(tasks);
  });
});

// POST /api/tasks - Crear una nueva tarea
app.post('/api/tasks', (req, res) => {
  const { title, description, completed = false, priority = 'low', list_id = 1 } = req.body;
  
  // Validar tarea
  const validacion = validarTarea(title, description);
  if (!validacion.valido) {
    res.status(400).json({ error: validacion.error });
    return;
  }
  
  const stmt = db.prepare('INSERT INTO tasks (title, description, completed, priority, list_id) VALUES (?, ?, ?, ?, ?)');
  stmt.run(title.trim(), description || '', completed ? 1 : 0, priority, list_id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, title: title.trim(), description, completed, priority, list_id });
  });
  stmt.finalize();
});

// DELETE /api/tasks/:id - Eliminar una tarea
app.delete('/api/tasks/:id', (req, res) => {
  db.run('DELETE FROM tasks WHERE id = ?', req.params.id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Tarea eliminada' });
  });
});

// PUT /api/tasks/:id/complete - Marcar tarea como completada o no
app.put('/api/tasks/:id/complete', (req, res) => {
  const { completed } = req.body;
  const completedValue = completed ? 1 : 0;
  
  db.run('UPDATE tasks SET completed = ? WHERE id = ?', [completedValue, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      row.completed = Boolean(row.completed);
      res.json(row);
    });
  });
});

// PUT /api/tasks/:id - Editar una tarea
app.put('/api/tasks/:id', (req, res) => {
  const { title, description, completed, priority, list_id } = req.body;
  const completedValue = completed ? 1 : 0;
  
  // Validar tarea
  const validacion = validarTarea(title, description);
  if (!validacion.valido) {
    res.status(400).json({ error: validacion.error });
    return;
  }
  
  db.run('UPDATE tasks SET title = ?, description = ?, completed = ?, priority = ?, list_id = ? WHERE id = ?', 
    [title, description, completedValue, priority || 'low', list_id || 1, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      row.completed = Boolean(row.completed);
      res.json(row);
    });
  });
});

// express.static('.') - Sirve archivos estáticos (HTML, CSS, JS)
app.use(express.static('.'));

// Ruta principal - Sirve el archivo x.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/x.html');
});

// 7. INICIAR EL SERVIDOR
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
