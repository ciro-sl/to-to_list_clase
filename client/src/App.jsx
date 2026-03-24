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
  const [notification, setNotification] = useState(null)
  const [deleteModalTask, setDeleteModalTask] = useState(null)
  const [deleteListModal, setDeleteListModal] = useState(null)

  // Mostrar notificación
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

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

  // ================= VALIDACIONES CON ESTILOS =================

  const validarCrearLista = () => {
    if (!newListName.trim()) {
      showNotification('⚠️ Por favor ingrese un nombre para la lista', 'error')
      return false
    }
    if (newListName.length > 20) {
      showNotification('⚠️ El nombre de la lista no puede exceder los 20 caracteres', 'error')
      return false
    }
    showNotification('✅ Lista creada exitosamente', 'success')
    return true
  }

  const validarCrearTarea = () => {
    if (!newTaskTitle.trim()) {
      showNotification('⚠️ Por favor ingrese un título para la tarea', 'error')
      return false
    }
    if (newTaskTitle.length > 50) {
      showNotification('⚠️ El título no puede exceder los 50 caracteres', 'error')
      return false
    }
    if (newTaskDesc.length > 100) {
      showNotification('⚠️ La descripción no puede exceder los 100 caracteres', 'error')
      return false
    }
    // Validar que solo contenga letras y espacios (sin números ni caracteres especiales)
    const regexSoloLetrasYEspacios = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!regexSoloLetrasYEspacios.test(newTaskTitle.trim())) {
      showNotification('⚠️ El título solo puede contener letras y espacios', 'error')
      return false
    }
    return true
  }

  const validarEditarTarea = () => {
    if (!editTitle.trim()) {
      showNotification('⚠️ El título no puede estar vacío', 'error')
      return false
    }
    if (editTitle.length > 50) {
      showNotification('⚠️ El título no puede exceder los 50 caracteres', 'error')
      return false
    }
    if (editDesc.length > 100) {
      showNotification('⚠️ La descripción no puede exceder los 100 caracteres', 'error')
      return false
    }
    // Validar que solo contenga letras y espacios (sin números ni caracteres especiales)
    const regexSoloLetrasYEspacios = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!regexSoloLetrasYEspacios.test(editTitle.trim())) {
      showNotification('⚠️ El título solo puede contener letras y espacios', 'error')
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
      showNotification('❌ Error al crear la lista', 'error')
    }
  }

  // Eliminar lista
  const confirmarEliminarLista = (id) => {
    if (id === 1) {
      showNotification('⚠️ No se puede eliminar la lista principal', 'error')
      return
    }
    setDeleteListModal(id)
  }

  const eliminarLista = async () => {
    if (!deleteListModal) return

    try {
      await apiDelete(`/api/lists/${deleteListModal}`)
      setDeleteListModal(null)
      setSelectedList(1)
      fetchLists()
      fetchTasks()
      showNotification('✅ Lista eliminada exitosamente', 'success')
    } catch (error) {
      console.error('Error deleting list:', error)
      showNotification('❌ Error al eliminar la lista', 'error')
    }
  }

  const cancelarEliminarLista = () => {
    setDeleteListModal(null)
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
      showNotification('✅ Tarea creada exitosamente', 'success')
      
    } catch (error) {
      console.error('Error adding task:', error)
      showNotification('❌ Error al agregar la tarea: ' + error.message, 'error')
    }
  }

  // Eliminar tarea
  const confirmarEliminarTarea = (id) => {
    setDeleteModalTask(id)
  }

  const eliminarTarea = async () => {
    if (!deleteModalTask) return

    try {
      await apiDelete(`/api/tasks/${deleteModalTask}`)
      setDeleteModalTask(null)
      fetchTasks()
      showNotification('✅ Tarea eliminada exitosamente', 'success')
    } catch (error) {
      console.error('Error deleting task:', error)
      showNotification('❌ Error al eliminar la tarea', 'error')
    }
  }

  const cancelarEliminarTarea = () => {
    setDeleteModalTask(null)
  }

  // Completar/descompletar tarea
  const completarTarea = async (task) => {
    try {
      console.log('Completando tarea:', task.id, !task.completed)
      await apiPut(`/api/tasks/${task.id}/complete`, { completed: !task.completed })
      fetchTasks()
    } catch (error) {
      console.error('Error toggling task:', error)
      showNotification('❌ Error al completar la tarea', 'error')
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
      showNotification('✅ Tarea actualizada exitosamente', 'success')
    } catch (error) {
      console.error('Error updating task:', error)
      showNotification('❌ Error al actualizar la tarea', 'error')
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
          <div className="input-list-container">
            <input 
              type="text" 
              placeholder="Nueva lista..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && crearLista()}
              maxLength={20}
            />
            <span className="char-counter-list">{newListName.length}/20</span>
          </div>
          <div className="list-inputs-right">
            <input 
              type="color" 
              value={newListColor}
              onChange={(e) => setNewListColor(e.target.value)}
            />
            <button onClick={crearLista} className="boton-agregar-lista">+</button>
          </div>
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
                    confirmarEliminarLista(list.id)
                  }}
                  title="Eliminar lista"
                >
                  🗑️
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
                    <div className="input-with-counter">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        maxLength={50}
                        autoFocus
                      />
                      <span className="char-counter">{editTitle.length}/50</span>
                    </div>
                    <div className="input-with-counter">
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        maxLength={100}
                      />
                      <span className="char-counter">{editDesc.length}/100</span>
                    </div>
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
                        ✏️
                      </button>
                      <button 
                        className="boton-eliminar"
                        onClick={() => confirmarEliminarTarea(task.id)}
                      >
                        🗑️
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
              <div className="input-with-counter">
                <input 
                  type="text" 
                  placeholder="Título de la tarea"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && agregarTarea()}
                  maxLength={50}
                  autoFocus
                />
                <span className="char-counter">{newTaskTitle.length}/50</span>
              </div>
              <div className="input-with-counter">
                <textarea 
                  placeholder="Descripción (opcional)"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  maxLength={100}
                />
                <span className="char-counter">{newTaskDesc.length}/100</span>
              </div>
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

        {/* Modal de confirmación para eliminar tarea */}
        <div className={`modal-overlay delete-modal-overlay ${deleteModalTask ? 'active' : ''}`} onClick={cancelarEliminarTarea}>
          <div className="modal delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Confirmar Eliminación</h3>
              <button className="modal-close" onClick={cancelarEliminarTarea}>✕</button>
            </div>
            <div className="delete-modal-content">
              <p>¿Estás seguro de que deseas eliminar esta tarea?</p>
              <p className="delete-warning">Esta acción no se puede deshacer.</p>
            </div>
            <div className="delete-modal-buttons">
              <button className="cancelar-btn" onClick={cancelarEliminarTarea}>
                ✕ Cancelar
              </button>
              <button className="confirmar-eliminar-btn" onClick={eliminarTarea}>
                🗑️ Eliminar
              </button>
            </div>
          </div>
        </div>

        {/* Modal de confirmación para eliminar lista */}
        <div className={`modal-overlay delete-modal-overlay ${deleteListModal ? 'active' : ''}`} onClick={cancelarEliminarLista}>
          <div className="modal delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Eliminar Lista</h3>
              <button className="modal-close" onClick={cancelarEliminarLista}>✕</button>
            </div>
            <div className="delete-modal-content">
              <p>¿Estás seguro de que deseas eliminar esta lista?</p>
              <p className="delete-warning">Se eliminarán todas las tareas contenidas en ella. Esta acción no se puede deshacer.</p>
            </div>
            <div className="delete-modal-buttons">
              <button className="cancelar-btn" onClick={cancelarEliminarLista}>
                ✕ Cancelar
              </button>
              <button className="confirmar-eliminar-btn" onClick={eliminarLista}>
                🗑️ Eliminar Lista
              </button>
            </div>
          </div>
        </div>

        {/* Notificaciones */}
        {notification && (
          <div className={`notification notification-${notification.type}`}>
            {notification.message}
          </div>
        )}
      </main>
    </>
  )
}

export default App
