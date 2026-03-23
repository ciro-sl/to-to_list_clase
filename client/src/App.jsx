import { useState, useEffect, useMemo } from 'react'
import './App.css'

// Funciones API con mejor manejo de errores
const apiFetch = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

const apiPost = async (url, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

const apiPut = async (url, body) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

const apiDelete = async (url) => {
  const response = await fetch(url, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

function App() {
  const [tasks, setTasks] = useState([])
  const [lists, setLists] = useState([])
  const [selectedList, setSelectedList] = useState(1)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState('#3498db')
  const [showModal, setShowModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('baja')
  const [editingTask, setEditingTask] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPriority, setEditPriority] = useState('baja')
  const [filter, setFilter] = useState('todas')

  // Obtener todas las listas
  const fetchLists = async () => {
    try {
      const data = await apiFetch('/api/lists')
      setLists(data)
    } catch (error) {
      console.error('Error fetching lists:', error)
    }
  }

  // Obtener tareas de la lista seleccionada
  const fetchTasks = async () => {
    try {
      console.log('Obteniendo tareas para lista:', selectedList)
      const data = await apiFetch(`/api/tasks?list_id=${selectedList}`)
      console.log('Tareas obtenidas:', data)
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Cargando datos...')
        const listsData = await apiFetch('/api/lists')
        console.log('Listas cargadas:', listsData)
        setLists(listsData)
        
        const tasksData = await apiFetch(`/api/tasks?list_id=${selectedList}`)
        console.log('Tareas cargadas:', tasksData)
        setTasks(tasksData)
      } catch (error) {
        console.error('Error cargando datos:', error)
      }
    }
    loadData()
  }, [selectedList])

  // Estadísticas
  const stats = useMemo(() => {
    const total = tasks.length
    const completadas = tasks.filter(t => t.completed).length
    const pendientes = total - completadas
    return { total, completadas, pendientes }
  }, [tasks])

  // Filtrar tareas
  const filteredTasks = useMemo(() => {
    if (filter === 'pendientes') {
      return tasks.filter(t => !t.completed)
    } else if (filter === 'completadas') {
      return tasks.filter(t => t.completed)
    }
    return tasks
  }, [tasks, filter])

  // ================= VALIDACIONES =================

  const validarCrearLista = () => {
    if (!newListName.trim()) {
      alert('Por favor ingrese un nombre para la lista')
      return false
    }
    if (newListName.length > 20) {
      alert('El nombre de la lista no puede exceder 20 caracteres')
      return false
    }
    const caracteresEspeciales = /[*+\-\.´¿!@#$%^&(){}[\]\\|<>?/~`]/
    if (caracteresEspeciales.test(newListName)) {
      alert('El nombre no puede contener caracteres especiales como *+-´¿!@#$%^&()')
      return false
    }
    return true
  }

  const validarCrearTarea = () => {
    if (!newTaskTitle.trim()) {
      alert('Por favor ingrese un título para la tarea')
      return false
    }
    if (newTaskTitle.length > 50) {
      alert('El título no puede exceder 50 caracteres')
      return false
    }
    if (newTaskDesc.length > 200) {
      alert('La descripción no puede exceder 200 caracteres')
      return false
    }
    const caracteresEspeciales = /[*+\-\.´¿!@#$%^&(){}[\]\\|<>?/~`]/
    if (caracteresEspeciales.test(newTaskTitle)) {
      alert('El título no puede contener caracteres especiales como *+-´¿!@#$%^&()')
      return false
    }
    if (caracteresEspeciales.test(newTaskDesc)) {
      alert('La descripción no puede contener caracteres especiales como *+-´¿!@#$%^&()')
      return false
    }
    return true
  }

  const validarEditarTarea = () => {
    if (!editTitle.trim()) {
      alert('El título no puede estar vacío')
      return false
    }
    if (editTitle.length > 50) {
      alert('El título no puede exceder 50 caracteres')
      return false
    }
    if (editDesc.length > 200) {
      alert('La descripción no puede exceder 200 caracteres')
      return false
    }
    const caracteresEspeciales = /[*+\-\.´¿!@#$%^&(){}[\]\\|<>?/~`]/
    if (caracteresEspeciales.test(editTitle)) {
      alert('El título no puede contener caracteres especiales como *+-´¿!@#$%^&()')
      return false
    }
    if (caracteresEspeciales.test(editDesc)) {
      alert('La descripción no puede contener caracteres especiales como *+-´¿!@#$%^&()')
      return false
    }
    return true
  }

  // ================= FUNCIONES =================

  // Crear nueva lista
  const crearLista = async () => {
    if (!validarCrearLista()) return

    try {
      console.log('Creando lista:', newListName, newListColor)
      const result = await apiPost('/api/lists', { 
        name: newListName, 
        color: newListColor 
      })
      console.log('Lista creada:', result)
      setNewListName('')
      setNewListColor('#3498db')
      fetchLists()
    } catch (error) {
      console.error('Error creating list:', error)
      alert('Error al crear la lista')
    }
  }

  // Eliminar lista
  const eliminarLista = async (id) => {
    if (id === 1) {
      alert('No se puede eliminar la lista principal')
      return
    }
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta lista y todas sus tareas?')) {
      return
    }

    try {
      await apiDelete(`/api/lists/${id}`)
      setSelectedList(1)
      fetchLists()
      fetchTasks()
    } catch (error) {
      console.error('Error deleting list:', error)
      alert('Error al eliminar la lista')
    }
  }

  // Abrir/cerrar modal
  const openModal = () => {
    setNewTaskTitle('')
    setNewTaskDesc('')
    setNewTaskPriority('baja')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
  }

  // Agregar nueva tarea
  const agregarTarea = async () => {
    if (!validarCrearTarea()) return

    try {
      console.log('Creando tarea:', { 
        title: newTaskTitle, 
        description: newTaskDesc,
        priority: newTaskPriority,
        list_id: selectedList 
      })
      
      const result = await apiPost('/api/tasks', { 
        title: newTaskTitle, 
        description: newTaskDesc,
        priority: newTaskPriority,
        list_id: selectedList 
      })
      
      console.log('Tarea creada:', result)
      
      // Limpiar formulario
      setNewTaskTitle('')
      setNewTaskDesc('')
      setNewTaskPriority('baja')
      setShowModal(false)
      
      // Recargar tareas
      await fetchTasks()
      console.log('Tareas recargadas')
      
    } catch (error) {
      console.error('Error adding task:', error)
      alert('Error al agregar la tarea: ' + error.message)
    }
  }

  // Eliminar tarea
  const eliminarTarea = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
      return
    }

    try {
      await apiDelete(`/api/tasks/${id}`)
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Error al eliminar la tarea')
    }
  }

  // Completar/descompletar tarea
  const completarTarea = async (task) => {
    try {
      console.log('Completando tarea:', task.id, !task.completed)
      await apiPut(`/api/tasks/${task.id}/complete`, { completed: !task.completed })
      fetchTasks()
    } catch (error) {
      console.error('Error toggling task:', error)
      alert('Error al completar la tarea')
    }
  }

  // Iniciar edición
  const iniciarEditar = (task) => {
    setEditingTask(task.id)
    setEditTitle(task.title)
    setEditDesc(task.description || '')
    setEditPriority(task.priority || 'baja')
  }

  // Guardar edición
  const guardarEdicion = async (id) => {
    if (!validarEditarTarea()) return

    try {
      const task = tasks.find(t => t.id === id)
      await apiPut(`/api/tasks/${id}`, { 
        title: editTitle,
        description: editDesc,
        priority: editPriority,
        completed: task?.completed || false,
        list_id: selectedList
      })
      setEditingTask(null)
      setEditTitle('')
      setEditDesc('')
      setEditPriority('baja')
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Error al actualizar la tarea')
    }
  }

  // Cancelar edición
  const cancelarEdicion = () => {
    setEditingTask(null)
    setEditTitle('')
    setEditDesc('')
    setEditPriority('baja')
  }

  // Obtener nombre de la lista actual
  const listaActual = lists.find(l => l.id === selectedList)

  return (
    <>
      {/* Barra lateral */}
      <aside className="sidebar">
        <h2>📋 Mis Listas</h2>
        
        {/* Formulario para nueva lista */}
        <div className="formulario-lista">
          <input 
            type="text" 
            placeholder="Nueva lista..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && crearLista()}
            maxLength={20}
          />
          <input 
            type="color" 
            value={newListColor}
            onChange={(e) => setNewListColor(e.target.value)}
          />
          <button onClick={crearLista} className="boton-agregar-lista">+</button>
        </div>
        
        {/* Contenedor de listas */}
        <div className="contenedor-listas">
          {lists.map(list => (
            <div 
              key={list.id} 
              className={`lista-item ${selectedList === list.id ? 'lista-activa' : ''}`}
              onClick={() => setSelectedList(list.id)}
            >
              <div 
                className="lista-contenido" 
                style={{ borderLeftColor: list.color }}
              >
                <span className="lista-nombre">{list.name}</span>
              </div>
              {list.id !== 1 && (
                <button 
                  className="boton-eliminar-lista"
                  onClick={(e) => {
                    e.stopPropagation()
                    eliminarLista(list.id)
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="contenido-principal">
        {/* Header con título, filtros y stats */}
        <div className="content-header">
          <h1>📋 {listaActual?.name || 'Lista de Tareas'}</h1>
          
          <div className="controls-row">
            {/* Filtros */}
            <div className="filtros">
              <button 
                className={`filtro-btn ${filter === 'todas' ? 'active' : ''}`}
                onClick={() => setFilter('todas')}
              >
                📃 Todas
              </button>
              <button 
                className={`filtro-btn ${filter === 'pendientes' ? 'active' : ''}`}
                onClick={() => setFilter('pendientes')}
              >
                📝 Pendientes
              </button>
              <button 
                className={`filtro-btn ${filter === 'completadas' ? 'active' : ''}`}
                onClick={() => setFilter('completadas')}
              >
                ✅ Completadas
              </button>
            </div>

            {/* Stats badges */}
            <div className="stats-badges">
              <div className="stat-badge pending">
                📝 {stats.pendientes}
              </div>
              <div className="stat-badge completed">
                ✅ {stats.completadas}
              </div>
            </div>
          </div>
        </div>

        <ul id="listatareas">
          {filteredTasks.length === 0 ? (
            <li className="sin-tareas">
              <span>📭</span>
              {filter === 'todas' 
                ? 'No hay tareas en esta lista' 
                : filter === 'pendientes'
                ? '¡Todas las tareas están completadas!'
                : 'No hay tareas completadas aún'}
            </li>
          ) : (
            filteredTasks.map(task => (
              <li 
                key={task.id} 
                className={`tarea-item ${task.completed ? 'completada' : ''}`}
              >
                {editingTask === task.id ? (
                  <div className="editar-tarea-form">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                      maxLength={50}
                    />
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      maxLength={200}
                    />
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                    >
                      <option value="baja">🟢 Prioridad Baja</option>
                      <option value="media">🟡 Prioridad Media</option>
                      <option value="alta">🔴 Prioridad Alta</option>
                    </select>
                    <div className="botones-edicion">
                      <button className="guardar-btn" onClick={() => guardarEdicion(task.id)}>
                        💾 Guardar
                      </button>
                      <button className="cancelar-btn" onClick={cancelarEdicion}>
                        ✕ Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="tarea-contenido">
                      <span className="tarea-titulo">
                        {task.title}
                        {task.priority === 'alta' && (
                          <span className="prioridad prioridad-alta">🔴 Alta</span>
                        )}
                        {task.priority === 'media' && (
                          <span className="prioridad prioridad-media">🟡 Media</span>
                        )}
                        {task.priority === 'baja' && (
                          <span className="prioridad prioridad-baja">🟢 Baja</span>
                        )}
                      </span>
                      {task.description && (
                        <span className="tarea-descripcion">{task.description}</span>
                      )}
                    </div>
                    <div className="botones-container">
                      <button 
                        className={`boton-completar ${task.completed ? 'completado' : ''}`}
                        onClick={() => completarTarea(task)}
                      >
                        {task.completed ? '↩️' : '✓'}
                      </button>
                      <button 
                        className="boton-editar"
                        onClick={() => iniciarEditar(task)}
                      >
                        ✏️ edit
                      </button>
                      <button 
                        className="boton-eliminar"
                        onClick={() => eliminarTarea(task.id)}
                      >
                        🗑️ eliminar
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))
          )}
        </ul>

        {/* Botón flotante para agregar tarea */}
        <button className="floating-btn" onClick={openModal}>
          +
        </button>

        {/* Modal para agregar tarea */}
        <div className={`modal-overlay ${showModal ? 'active' : ''}`} onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Nueva Tarea</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-form">
              <input 
                type="text" 
                placeholder="Título de la tarea"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && agregarTarea()}
                autoFocus
                maxLength={50}
              />
              <textarea 
                placeholder="Descripción (opcional)"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                maxLength={200}
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
              >
                <option value="baja">🟢 Prioridad Baja</option>
                <option value="media">🟡 Prioridad Media</option>
                <option value="alta">🔴 Prioridad Alta</option>
              </select>
              <button className="modal-submit" onClick={agregarTarea}>
                Agregar Tarea
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default App
