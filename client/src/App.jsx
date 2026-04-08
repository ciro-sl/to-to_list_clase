import { useState, useEffect, useMemo, useRef } from 'react'
import './App.css'

// ================= UTILIDADES DE FECHA Y HORA =================

const formatDate = (dateString) => {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatTime = (timeString) => {
  if (!timeString) return ''
  return timeString.substring(0, 5)
}

const formatTimeRemaining = (targetDate, targetTime) => {
  if (!targetDate || !targetTime) return null
  
  const now = new Date()
  const [year, month, day] = targetDate.split('-').map(Number)
  const [timeHours, timeMins] = targetTime.split(':').map(Number)
  
  const target = new Date(year, month - 1, day, timeHours, timeMins)
  const diff = target - now
  
  if (diff < 0) {
    const overdue = Math.abs(diff)
    const overdueHours = Math.floor(overdue / (1000 * 60 * 60))
    const overdueMins = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60))
    return { text: `${overdueHours}h ${overdueMins}m tardío`, overdue: true }
  }
  
  const diffHours = Math.floor(diff / (1000 * 60 * 60))
  const diffMins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (diffHours > 24) {
    const days = Math.floor(diffHours / 24)
    return { text: `${days}d ${diffHours % 24}h restante`, overdue: false, urgent: false }
  }
  
  return { 
    text: diffHours > 0 ? `${diffHours}h ${diffMins}m restante` : `${diffMins}m restante`, 
    overdue: false,
    urgent: diffHours < 1 
  }
}

const isValidTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return true
  return startTime < endTime
}

const isTaskOverdue = (task) => {
  if (!task.date || !task.endTime || task.completed) return false
  
  const now = new Date()
  const nowHours = now.getHours()
  const nowMinutes = now.getMinutes()
  const nowTotalMinutes = nowHours * 60 + nowMinutes
  
  const [year, month, day] = task.date.split('-').map(Number)
  const taskDate = new Date(year, month - 1, day)
  
  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const todayDay = today.getDate()
  
  if (taskDate > new Date(todayYear, todayMonth, todayDay)) return false
  
  const [endHours, endMinutes] = task.endTime.split(':').map(Number)
  const endTotalMinutes = endHours * 60 + endMinutes
  
  if (taskDate.getTime() === new Date(todayYear, todayMonth, todayDay).getTime()) {
    return nowTotalMinutes > endTotalMinutes
  }
  
  return true
}

const isTaskUrgent = (task) => {
  if (!task.date || !task.endTime || task.completed) return false
  
  const now = new Date()
  const [year, month, day] = task.date.split('-').map(Number)
  const [hours, minutes] = task.endTime.split(':').map(Number)
  
  const target = new Date(year, month - 1, day, hours, minutes)
  const diff = target - now
  
  return diff > 0 && diff <= 60 * 60 * 1000
}

// ================= COMPONENTE SISTEMA DE NOTIFICACIONES =================

const EnhancedNotificationSystem = ({ tasks, onTaskClick }) => {
  const [showPanel, setShowPanel] = useState(false)
  const [activeTab, setActiveTab] = useState('overdue')
  const [notificationHistory, setNotificationHistory] = useState([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastNotificationCount, setLastNotificationCount] = useState(0)
  const panelRef = useRef(null)
  
  useEffect(() => {
    if (!showPanel) return
    
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setShowPanel(false)
      }
    }
    
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPanel])
  
  const overdueTasks = useMemo(() => {
    return tasks.filter(task => isTaskOverdue(task))
  }, [tasks])
  
  const urgentTasks = useMemo(() => {
    return tasks.filter(task => isTaskUrgent(task) && !isTaskOverdue(task))
  }, [tasks])
  
  const recentCompleted = useMemo(() => {
    return tasks.filter(task => task.completed).slice(0, 10)
  }, [tasks])
  
  const totalNotifications = overdueTasks.length + urgentTasks.length
  
  useEffect(() => {
    if (totalNotifications > lastNotificationCount && soundEnabled) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
      } catch (e) {
        console.log('Audio not supported')
      }
    }
    setLastNotificationCount(totalNotifications)
  }, [totalNotifications, soundEnabled, lastNotificationCount])
  
  useEffect(() => {
    if (overdueTasks.length > 0) {
      const now = new Date()
      setNotificationHistory(prev => [{
        id: Date.now(),
        type: 'warning',
        message: `${overdueTasks.length} tarea${overdueTasks.length > 1 ? 's' : ''} vencida${overdueTasks.length > 1 ? 's' : ''}`,
        time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now
      }, ...prev.slice(0, 19)])
    }
  }, [overdueTasks.length])
  
  const togglePanel = () => setShowPanel(!showPanel)
  
  const handleTaskClick = (task) => {
    if (onTaskClick) onTaskClick(task)
    setShowPanel(false)
  }
  
  const getUrgencyColor = (task) => {
    if (isTaskOverdue(task)) return 'overdue'
    if (isTaskUrgent(task)) return 'urgent'
    return 'normal'
  }
  
  const getTimeInfo = (task) => {
    if (!task.date || !task.endTime) return null
    return formatTimeRemaining(task.date, task.endTime)
  }
  
  const clearHistory = () => setNotificationHistory([])
  
  const renderTaskItem = (task, isNotification = false) => {
    const urgency = getUrgencyColor(task)
    const timeInfo = getTimeInfo(task)
    
    return (
      <div 
        key={task.id} 
        className={`notification-item urgency-${urgency}`}
        onClick={() => handleTaskClick(task)}
      >
        <div className="notification-item-header">
          <div className="task-status-icon">
            {urgency === 'overdue' && <span className="icon-late">⏰</span>}
            {urgency === 'urgent' && <span className="icon-soon">⚡</span>}
            {urgency === 'normal' && task.completed && <span className="icon-done">✅</span>}
            {!task.completed && urgency === 'normal' && <span className="icon-pending">📋</span>}
          </div>
          <span className="notification-item-title">{task.title}</span>
          <div className="priority-indicator">
            {task.priority === 'alta' && <span className="priority-dot high">🔴</span>}
            {task.priority === 'media' && <span className="priority-dot medium">🟡</span>}
            {task.priority === 'baja' && <span className="priority-dot low">🟢</span>}
          </div>
        </div>
        
        {task.description && (
          <p className="notification-item-desc">{task.description}</p>
        )}
        
        <div className="notification-item-meta">
          <div className="meta-row">
            <span className="meta-date">📅 {formatDate(task.date) || 'Sin fecha'}</span>
            {(task.startTime || task.endTime) && (
              <span className="meta-time">🕐 {formatTime(task.startTime)} - {formatTime(task.endTime)}</span>
            )}
          </div>
          
          {timeInfo && (
            <div className={`time-remaining ${timeInfo.overdue ? 'overdue' : timeInfo.urgent ? 'urgent' : ''}`}>
              {timeInfo.overdue ? '⏰ ' : '⏳ '}
              {timeInfo.text}
            </div>
          )}
        </div>
        
        {isNotification && (
          <div className="notification-item-actions">
            <button 
              className="notification-action-btn view-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleTaskClick(task)
              }}
            >
              👁️ Ver
            </button>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="notification-bar">
      <button 
        className={`notification-bell ${totalNotifications > 0 ? 'has-notifications' : ''}`}
        onClick={togglePanel}
        title={totalNotifications > 0 ? `${totalNotifications} alerta${totalNotifications !== 1 ? 's' : ''}` : 'Sin alertas'}
      >
        <span className="bell-icon">{totalNotifications > 0 ? '🔔' : '🔕'}</span>
        {totalNotifications > 0 && (
          <span className="notification-count">{totalNotifications}</span>
        )}
      </button>
      
      <button 
        className={`sound-toggle ${soundEnabled ? 'enabled' : 'disabled'}`}
        onClick={() => setSoundEnabled(!soundEnabled)}
        title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>
      
      {showPanel && (
        <>
          <div className="notification-overlay" onClick={() => setShowPanel(false)} />
          <div className="notification-panel" ref={panelRef}>
            <div className="notification-panel-header">
              <h3>🔔 Centro de Alertas</h3>
              <div className="header-actions">
                <button className="clear-history-btn" onClick={clearHistory} title="Limpiar historial">🗑️</button>
                <button className="close-panel" onClick={() => setShowPanel(false)}>✕</button>
              </div>
            </div>
            
            <div className="notification-tabs">
              <button className={`tab-btn ${activeTab === 'overdue' ? 'active' : ''}`} onClick={() => setActiveTab('overdue')}>
                ⏰ Vencidas
                {overdueTasks.length > 0 && <span className="tab-badge danger">{overdueTasks.length}</span>}
              </button>
              <button className={`tab-btn ${activeTab === 'urgent' ? 'active' : ''}`} onClick={() => setActiveTab('urgent')}>
                ⚡ Próximas
                {urgentTasks.length > 0 && <span className="tab-badge warning">{urgentTasks.length}</span>}
              </button>
              <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                📜 Historial
              </button>
            </div>
            
            <div className="notification-panel-content">
              {activeTab === 'overdue' && (
                overdueTasks.length > 0 ? overdueTasks.map(task => renderTaskItem(task, true)) : (
                  <div className="empty-state"><span className="empty-icon">🎉</span><p>¡Sin tareas vencidas!</p></div>
                )
              )}
              
              {activeTab === 'urgent' && (
                urgentTasks.length > 0 ? urgentTasks.map(task => renderTaskItem(task, true)) : (
                  <div className="empty-state"><span className="empty-icon">😌</span><p>Sin tareas urgentes</p></div>
                )
              )}
              
              {activeTab === 'history' && (
                notificationHistory.length > 0 ? (
                  <div className="history-list">
                    {notificationHistory.map(item => (
                      <div key={item.id} className={`history-item ${item.type}`}>
                        <span className="history-time">{item.time}</span>
                        <span className="history-message">{item.message}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state"><span className="empty-icon">📝</span><p>Sin historial</p></div>
                )
              )}
            </div>
            
            <div className="notification-panel-footer">
              <div className="quick-stats">
                <span className="stat-item"><span className="stat-icon overdue">⏰</span><span className="stat-value">{overdueTasks.length}</span><span className="stat-label">Vencidas</span></span>
                <span className="stat-item"><span className="stat-icon urgent">⚡</span><span className="stat-value">{urgentTasks.length}</span><span className="stat-label">Urgentes</span></span>
                <span className="stat-item"><span className="stat-icon completed">✅</span><span className="stat-value">{recentCompleted.length}</span><span className="stat-label">Completadas</span></span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ================= COMPONENTE CALENDARIO =================

const EnhancedCalendar = ({ tasks, onSelectDate, selectedDate, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState('month')
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    const days = []
    for (let i = 0; i < startingDay; i++) {
      const prevDate = new Date(year, month, -startingDay + i + 1)
      days.push({ date: prevDate, currentMonth: false })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), currentMonth: true })
    }
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), currentMonth: false })
    }
    return days
  }
  
  const getTasksForDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    return tasks.filter(task => task.date === dateStr)
  }
  
  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }
  
  const isSelected = (date) => selectedDate && date.toDateString() === selectedDate.toDateString()
  
  const getDayStatus = (date) => {
    const dayTasks = getTasksForDate(date)
    const hasOverdue = dayTasks.some(t => isTaskOverdue(t))
    const hasUrgent = dayTasks.some(t => isTaskUrgent(t))
    const allCompleted = dayTasks.length > 0 && dayTasks.every(t => t.completed)
    return { hasOverdue, hasUrgent, allCompleted, count: dayTasks.length }
  }
  
  const handleDateClick = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    const tasksOnDate = getTasksForDate(date)
    
    if (tasksOnDate.length > 0) {
      onSelectDate(date)
    } else {
      alert(`📅 No hay tareas agendadas para el ${formatDate(dateStr)}`)
    }
  }
  
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  const goToToday = () => setCurrentMonth(new Date())
  
  const days = getDaysInMonth(currentMonth)
  
  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal calendar-modal enhanced" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📅 Calendario de Tareas</h3>
          <div className="header-legend">
            <span className="legend-item"><span className="dot overdue"></span> Con tareas</span>
            <span className="legend-item"><span className="dot urgent"></span> Tareas urgentes</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="calendar-container">
          <div className="calendar-header">
            <div className="calendar-nav">
              <button onClick={prevMonth}>◀</button>
              <h3>{`${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`}</h3>
              <button onClick={nextMonth}>▶</button>
            </div>
            <div className="calendar-controls">
              <button onClick={goToToday} className="today-btn">📍 Hoy</button>
              <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="view-mode-select">
                <option value="month">Mes</option>
              </select>
            </div>
          </div>
          
          <div className="calendar-grid">
            <div className="calendar-weekdays">
              {dayNames.map(day => <div key={day} className="weekday">{day}</div>)}
            </div>
          
            <div className="calendar-days">
              {days.map((dayInfo, index) => {
                const dayTasks = getTasksForDate(dayInfo.date)
                const status = getDayStatus(dayInfo.date)
                const hasTasks = dayTasks.length > 0
                const hasUrgentTasks = dayTasks.some(t => isTaskUrgent(t) && !t.completed)
                
                return (
                  <div 
                    key={index}
                    className={`calendar-day ${!dayInfo.currentMonth ? 'other-month' : ''} ${isToday(dayInfo.date) ? 'today' : ''} ${isSelected(dayInfo.date) ? 'selected' : ''} ${hasTasks ? 'has-tasks' : ''} ${hasUrgentTasks ? 'has-urgent' : ''}`}
                    onClick={() => handleDateClick(dayInfo.date)}
                    style={{ cursor: hasTasks ? 'pointer' : 'default' }}
                  >
                    <span className="day-number">{dayInfo.date.getDate()}</span>
                    {hasTasks && (
                      <div className="day-tasks-preview">
                        <div className="day-summary">
                          <span className="summary-total">{dayTasks.length}</span>
                          {status.hasOverdue && <span className="summary-overdue">⏰</span>}
                          {status.hasUrgent && <span className="summary-urgent">⚡</span>}
                        </div>
                        <div className="task-preview-mini">
                          {dayTasks.slice(0, 2).map(task => (
                            <div key={task.id} className="mini-task" title={task.title}>
                              {task.title.substring(0, 10)}...
                            </div>
                          ))}
                          {dayTasks.length > 2 && <div className="more-tasks">+{dayTasks.length - 2}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="calendar-footer">
            <div className="calendar-tip">
              💡 <strong>Tip:</strong> Haz clic en un día con tareas para verlas en la lista principal
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ================= COMPONENTE REPORTE =================

const EnhancedReportModal = ({ tasks, onClose }) => {
  const currentTime = new Date()
  
  const violatedTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.date || !task.endTime || task.completed) return false
      
      const now = new Date()
      const nowHours = now.getHours()
      const nowMinutes = now.getMinutes()
      const nowTotalMinutes = nowHours * 60 + nowMinutes
      
      const [year, month, day] = task.date.split('-').map(Number)
      const taskDate = new Date(year, month - 1, day)
      
      const today = new Date()
      const todayYear = today.getFullYear()
      const todayMonth = today.getMonth()
      const todayDay = today.getDate()
      
      if (taskDate > new Date(todayYear, todayMonth, todayDay)) return false
      
      const [endHours, endMinutes] = task.endTime.split(':').map(Number)
      const endTotalMinutes = endHours * 60 + endMinutes
      
      if (taskDate.getTime() === new Date(todayYear, todayMonth, todayDay).getTime()) {
        return nowTotalMinutes > endTotalMinutes
      }
      
      return true
    })
  }, [tasks])
  
  const getOverdueTime = (task) => {
    if (!task.date || !task.endTime) return null
    return formatTimeRemaining(task.date, task.endTime)
  }
  
  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal report-modal enhanced" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📊 Reporte de Incumplimientos</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="report-info">
          <div className="info-cards">
            <div className="info-card total">
              <span className="card-icon">📋</span>
              <div className="card-content">
                <span className="card-value">{tasks.length}</span>
                <span className="card-label">Total Tareas</span>
              </div>
            </div>
            <div className="info-card violated">
              <span className="card-icon">⏰</span>
              <div className="card-content">
                <span className="card-value">{violatedTasks.length}</span>
                <span className="card-label">Incumplidas</span>
              </div>
            </div>
            <div className="info-card time">
              <span className="card-icon">🕐</span>
              <div className="card-content">
                <span className="card-value">{currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="card-label">Hora Actual</span>
              </div>
            </div>
          </div>
        </div>
        
        {violatedTasks.length > 0 ? (
          <div className="report-table-container">
            <table className="report-table">
              <thead>
                <tr><th>Prioridad</th><th>Tarea</th><th>Fecha</th><th>Horario</th><th>Tiempo Vencido</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {violatedTasks.map(task => {
                  const overdueTime = getOverdueTime(task)
                  return (
                    <tr key={task.id} className={`priority-row ${task.priority}`}>
                      <td><span className={`priority-badge ${task.priority}`}>{task.priority === 'alta' && '🔴'}{task.priority === 'media' && '🟡'}{task.priority === 'baja' && '🟢'}{task.priority}</span></td>
                      <td>{task.title}</td>
                      <td>{formatDate(task.date)}</td>
                      <td>{formatTime(task.startTime)} - {formatTime(task.endTime)}</td>
                      <td className="overdue-time">{overdueTime && <span className="overdue-badge">⏰ {overdueTime.text}</span>}</td>
                      <td className="status-violated">❌ INCUMPLIDA</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-violations"><span className="checkmark">🎉</span><p>¡No hay tareas incumplidas!</p></div>
        )}
      </div>
    </div>
  )
}

// ================= PERSISTENCIA LOCAL =================

const STORAGE_KEY_TASKS = 'todo_tasks'
const STORAGE_KEY_LISTS = 'todo_lists'
const STORAGE_KEY_LAST_ID_TASK = 'todo_last_id_task'
const STORAGE_KEY_LAST_ID_LIST = 'todo_last_id_list'

const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : defaultValue
  } catch (error) {
    console.error('Error loading from storage:', error)
    return defaultValue
  }
}

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Error saving to storage:', error)
  }
}

const generateId = (key) => {
  const lastId = parseInt(localStorage.getItem(key) || '0', 10)
  const newId = lastId + 1
  localStorage.setItem(key, newId.toString())
  return newId
}

const initializeIds = (existingLists = []) => {
  if (!localStorage.getItem(STORAGE_KEY_LAST_ID_TASK)) {
    localStorage.setItem(STORAGE_KEY_LAST_ID_TASK, '1')
  }
  let maxListId = 1
  existingLists.forEach(list => {
    if (list.id > maxListId) maxListId = list.id
  })
  if (!localStorage.getItem(STORAGE_KEY_LAST_ID_LIST)) {
    localStorage.setItem(STORAGE_KEY_LAST_ID_LIST, maxListId.toString())
  } else {
    const currentLastId = parseInt(localStorage.getItem(STORAGE_KEY_LAST_ID_LIST), 10)
    if (currentLastId < maxListId) {
      localStorage.setItem(STORAGE_KEY_LAST_ID_LIST, maxListId.toString())
    }
  }
}

// ================= COMPONENTE PRINCIPAL APP =================

function App() {
  const initialLists = loadFromStorage(STORAGE_KEY_LISTS, [
    { id: 1, name: 'Tareas Generales', color: '#3498db' }
  ])
  
  initializeIds(initialLists)
  
  const [tasks, setTasks] = useState(() => loadFromStorage(STORAGE_KEY_TASKS, []))
  const [lists, setLists] = useState(initialLists)
  const [selectedList, setSelectedList] = useState(1)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState('#3498db')
  const [showModal, setShowModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('baja')
  const [newTaskDate, setNewTaskDate] = useState('')
  const [newTaskStartTime, setNewTaskStartTime] = useState('')
  const [newTaskEndTime, setNewTaskEndTime] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPriority, setEditPriority] = useState('baja')
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [filter, setFilter] = useState('todas')
  const [notification, setNotification] = useState(null)
  const [deleteModalTask, setDeleteModalTask] = useState(null)
  const [deleteListModal, setDeleteListModal] = useState(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [liveClock, setLiveClock] = useState(new Date())
  const [showScheduledOnly, setShowScheduledOnly] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [trendView, setTrendView] = useState('week')
  
  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Función para mover tareas programadas a Tareas Generales
  const moveScheduledTasksToGeneral = () => {
    const today = new Date().toISOString().split('T')[0]
    let movedCount = 0
    const movedTasks = []
    
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => {
        if (task.isScheduled && task.scheduledFor && task.scheduledFor <= today) {
          movedCount++
          movedTasks.push(task.title)
          return {
            ...task,
            isScheduled: false,
            scheduledFor: null,
            list_id: 1
          }
        }
        return task
      })
      
      if (movedTasks.length > 0) {
        setTimeout(() => {
          showNotification(`📅 ${movedTasks.length} tarea(s) programada(s) llegaron a su fecha y están disponibles en "Tareas Generales"`, 'info')
        }, 100)
      }
      
      return updatedTasks
    })
  }
  
  // Ejecutar al cargar la app y cada hora
  useEffect(() => {
    moveScheduledTasksToGeneral()
    const interval = setInterval(moveScheduledTasksToGeneral, 3600000)
    return () => clearInterval(interval)
  }, [])
  
  useEffect(() => {
    moveScheduledTasksToGeneral()
  }, [tasks.length])

  useEffect(() => {
    saveToStorage(STORAGE_KEY_TASKS, tasks)
  }, [tasks])
  
  useEffect(() => {
    saveToStorage(STORAGE_KEY_LISTS, lists)
  }, [lists])
  
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }
  
  // Tareas a mostrar
  const displayedTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    
    if (showScheduledOnly) {
      return tasks
        .filter(t => t.isScheduled && t.scheduledFor && t.scheduledFor > today)
        .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
    }
    
    let result = tasks.filter(t => t.list_id === selectedList)
    
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0]
      result = result.filter(t => t.date === dateStr)
    } else {
      result = result.filter(t => {
        if (!t.isScheduled) return true
        if (t.isScheduled && t.scheduledFor && t.scheduledFor <= today) return true
        return false
      })
    }
    
    if (filter === 'pendientes') {
      result = result.filter(t => !t.completed)
    } else if (filter === 'completadas') {
      result = result.filter(t => t.completed)
    } else if (filter === 'vencidas') {
      result = result.filter(t => isTaskOverdue(t))
    } else if (filter === 'urgentes') {
      result = result.filter(t => isTaskUrgent(t))
    }
    
    return result
  }, [tasks, selectedList, filter, selectedDate, showScheduledOnly])
  
  // Estadísticas
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const activeTasks = tasks.filter(t => !(t.isScheduled && t.scheduledFor && t.scheduledFor > today))
    const listActiveTasks = activeTasks.filter(t => t.list_id === selectedList)
    const total = listActiveTasks.length
    const completadas = listActiveTasks.filter(t => t.completed).length
    const pendientes = total - completadas
    const conFecha = listActiveTasks.filter(t => t.date).length
    const incumplidas = listActiveTasks.filter(t => isTaskOverdue(t)).length
    const urgentes = listActiveTasks.filter(t => isTaskUrgent(t)).length
    const scheduledCount = tasks.filter(t => t.isScheduled && t.scheduledFor && t.scheduledFor > today).length
    return { total, completadas, pendientes, conFecha, incumplidas, urgentes, scheduledCount }
  }, [tasks, selectedList, liveClock])
  
  // Datos para gráfica de tendencia semanal
  const weeklyTrendData = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const completed = new Array(7).fill(0)
    const pending = new Array(7).fill(0)
    
    tasks.forEach(task => {
      if (!task.date) return
      const taskDate = new Date(task.date)
      const dayOfWeek = taskDate.getDay() === 0 ? 6 : taskDate.getDay() - 1
      
      if (task.completed) {
        completed[dayOfWeek]++
      } else {
        pending[dayOfWeek]++
      }
    })
    
    const maxValue = Math.max(...completed, ...pending, 1)
    
    return days.map((day, index) => ({
      day,
      completed: completed[index],
      pending: pending[index],
      total: completed[index] + pending[index],
      completedPercent: maxValue > 0 ? (completed[index] / maxValue) * 60 : 0,
      pendingPercent: maxValue > 0 ? (pending[index] / maxValue) * 60 : 0
    }))
  }, [tasks])
  
  // Datos para gráfica de tendencia mensual (últimas 4 semanas)
  const monthlyTrendData = useMemo(() => {
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4']
    const completed = new Array(4).fill(0)
    const pending = new Array(4).fill(0)
    const now = new Date()
    
    tasks.forEach(task => {
      if (!task.date || !task.completed) return
      const taskDate = new Date(task.date)
      const diffDays = Math.floor((now - taskDate) / (1000 * 60 * 60 * 24))
      const weekIndex = Math.floor(diffDays / 7)
      if (weekIndex >= 0 && weekIndex < 4) {
        completed[weekIndex]++
      }
    })
    
    return weeks.map((week, index) => ({
      week,
      completed: completed[index],
      maxValue: Math.max(...completed, 1)
    }))
  }, [tasks])
  
  // Validaciones
  const validarCrearLista = () => {
    if (!newListName.trim()) {
      showNotification('⚠️ Por favor ingrese un nombre para la lista', 'error')
      return false
    }
    if (newListName.length > 20) {
      showNotification('⚠️ El nombre de la lista no puede exceder los 20 caracteres', 'error')
      return false
    }
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
    if (newTaskDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const selectedDateObj = new Date(newTaskDate + 'T00:00:00')
      if (selectedDateObj < today) {
        showNotification('⚠️ No se puede seleccionar una fecha anterior a la actual', 'error')
        return false
      }
    }
    if (newTaskStartTime && newTaskEndTime && !isValidTimeRange(newTaskStartTime, newTaskEndTime)) {
      showNotification('⚠️ La hora de fin debe ser posterior a la hora de inicio', 'error')
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
    if (editStartTime && editEndTime && !isValidTimeRange(editStartTime, editEndTime)) {
      showNotification('⚠️ La hora de fin debe ser posterior a la hora de inicio', 'error')
      return false
    }
    return true
  }
  
  // Funciones CRUD
  const crearLista = () => {
    if (!validarCrearLista()) return
    
    const newListId = generateId(STORAGE_KEY_LAST_ID_LIST)
    const newList = { id: newListId, name: newListName, color: newListColor }
    
    setLists(prev => [...prev, newList])
    setNewListName('')
    showNotification('✅ Lista creada exitosamente', 'success')
  }
  
  const eliminarLista = (id) => {
    if (id === 1) {
      showNotification('⚠️ No se puede eliminar la lista principal', 'error')
      return
    }
    setTasks(prev => prev.filter(t => t.list_id !== id))
    setLists(prev => prev.filter(l => l.id !== id))
    if (selectedList === id) setSelectedList(1)
    showNotification('✅ Lista eliminada exitosamente', 'success')
    setDeleteListModal(null)
  }
  
  const openModal = () => {
    setNewTaskTitle('')
    setNewTaskDesc('')
    setNewTaskPriority('baja')
    setNewTaskDate('')
    setNewTaskStartTime('')
    setNewTaskEndTime('')
    setShowModal(true)
  }
  
  const closeModal = () => setShowModal(false)
  
  const agregarTarea = () => {
    if (!validarCrearTarea()) return
    
    const today = new Date().toISOString().split('T')[0]
    const isFutureTask = newTaskDate && newTaskDate > today
    
    const newTask = {
      id: generateId(STORAGE_KEY_LAST_ID_TASK),
      title: newTaskTitle,
      description: newTaskDesc,
      priority: newTaskPriority,
      list_id: isFutureTask ? 1 : selectedList,
      date: newTaskDate || null,
      startTime: newTaskStartTime || null,
      endTime: newTaskEndTime || null,
      completed: false,
      createdAt: new Date().toISOString(),
      isScheduled: isFutureTask,
      scheduledFor: isFutureTask ? newTaskDate : null
    }
    
    setTasks(prev => [...prev, newTask])
    
    if (isFutureTask) {
      showNotification(`📅 Tarea programada para ${formatDate(newTaskDate)}. Aparecerá en "Tareas Programadas"`, 'info')
    } else {
      showNotification('✅ Tarea creada exitosamente', 'success')
    }
    
    closeModal()
  }
  
  const eliminarTarea = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    setDeleteModalTask(null)
    showNotification('✅ Tarea eliminada exitosamente', 'success')
  }
  
  const completarTarea = (task) => {
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, completed: !t.completed } : t
    ))
    if (!task.completed) showNotification('🎉 ¡Tarea completada!', 'success')
  }
  
  const iniciarEditar = (task) => {
    setEditingTask(task.id)
    setEditTitle(task.title)
    setEditDesc(task.description || '')
    setEditPriority(task.priority || 'baja')
    setEditDate(task.date || '')
    setEditStartTime(task.startTime || '')
    setEditEndTime(task.endTime || '')
  }
  
  const guardarEdicion = (id) => {
    if (!validarEditarTarea()) return
    
    setTasks(prev => prev.map(t => 
      t.id === id ? { 
        ...t,
        title: editTitle,
        description: editDesc,
        priority: editPriority,
        date: editDate || null,
        startTime: editStartTime || null,
        endTime: editEndTime || null
      } : t
    ))
    setEditingTask(null)
    showNotification('✅ Tarea actualizada exitosamente', 'success')
  }
  
  const cancelarEdicion = () => setEditingTask(null)
  
  const handleDateSelect = (date) => {
    setShowCalendar(false)
    setShowScheduledOnly(false)
    setFilter('todas')
    setSelectedDate(date)
    
    const dateStr = date.toISOString().split('T')[0]
    const tasksOnDate = tasks.filter(t => t.date === dateStr)
    
    if (tasksOnDate.length > 0) {
      setSelectedList(tasksOnDate[0].list_id)
      showNotification(`📅 Mostrando ${tasksOnDate.length} tarea(s) del ${formatDate(dateStr)}`, 'info')
    } else {
      showNotification(`📅 No hay tareas para el ${formatDate(dateStr)}`, 'info')
    }
    
    setTimeout(() => {
      const tasksContainer = document.getElementById('listatareas')
      if (tasksContainer) {
        tasksContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 200)
  }
  
  const clearDateFilter = () => setSelectedDate(null)
  
  const showScheduledTasksList = () => {
    setShowScheduledOnly(true)
    setSelectedList(null)
    setFilter('todas')
    setSelectedDate(null)
  }
  
  const showNormalList = (listId) => {
    setShowScheduledOnly(false)
    setSelectedList(listId)
  }
  
  const listaActual = lists.find(l => l.id === selectedList)
  
  const getTimeInfo = (task) => {
    if (!task.date || !task.endTime || task.completed) return null
    return formatTimeRemaining(task.date, task.endTime)
  }
  
  return (
    <>
      <EnhancedNotificationSystem 
        tasks={tasks}
        onTaskClick={(task) => {
          setShowScheduledOnly(false)
          setSelectedList(task.list_id)
          setTimeout(() => {
            const taskElement = document.querySelector(`[data-task-id="${task.id}"]`)
            if (taskElement) {
              taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
              taskElement.classList.add('highlight-task')
              setTimeout(() => taskElement.classList.remove('highlight-task'), 2000)
            }
          }, 100)
        }}
      />
      
      <aside className="sidebar">
        <h2>📋 Mis Listas</h2>
        
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
            <input type="color" value={newListColor} onChange={(e) => setNewListColor(e.target.value)} />
            <button onClick={crearLista} className="boton-agregar-lista">+</button>
          </div>
        </div>

       {/* Botón de Estadísticas/Gráficas - Toggle */}
          <div className="stats-sidebar-section">
            <button 
              className={`stats-btn ${showStats ? 'active' : ''}`} 
              onClick={() => setShowStats(!showStats)}
                 >
              {showStats ? '📊 Ocultar Estadísticas' : '📊 Ver Estadísticas'}
            </button>
          </div>
        
        <div className="contenedor-listas">
          {lists.map(list => (
            <div 
              key={list.id} 
              className={`lista-item ${!showScheduledOnly && selectedList === list.id ? 'lista-activa' : ''}`}
              onClick={() => showNormalList(list.id)}
            >
              <div className="lista-contenido" style={{ borderLeftColor: list.color }}>
                <span className="lista-nombre">{list.name}</span>
              </div>
              {list.id !== 1 && (
                <button className="boton-eliminar-lista" onClick={(e) => {
                  e.stopPropagation()
                  setDeleteListModal(list.id)
                }}>🗑️</button>
              )}
            </div>
          ))}
        </div>
        
        {/* Botón Tareas Programadas */}
        <div className="scheduled-sidebar-section">
          <button 
            className={`scheduled-btn ${showScheduledOnly ? 'active' : ''}`}
            onClick={showScheduledTasksList}
            title="Ver todas las tareas programadas para fechas futuras"
          >
            📆 Tareas Programadas
            {stats.scheduledCount > 0 && (
              <span className="scheduled-badge">{stats.scheduledCount}</span>
            )}
          </button>
        </div>
        
        <div className="calendar-sidebar-section">
          <button className={`calendar-toggle-btn ${showCalendar ? 'active' : ''}`} onClick={() => setShowCalendar(!showCalendar)}>
            📅 {showCalendar ? 'Ocultar Calendario' : 'Ver Calendario'}
          </button>
        </div>
        
        <div className="reports-sidebar-section">
          <button className="report-btn" onClick={() => setShowReport(true)}>
            📊 Generar Reporte
          </button>
        </div>
        
        <div className="clock-widget">
          <div className="clock-time">{liveClock.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="clock-date">{liveClock.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
        </div>
      </aside>
      
      <main className="contenido-principal">
        <div className="content-header">
          <h1>
            📋 {showScheduledOnly ? '📆 Tareas Programadas' : (listaActual?.name || 'Lista de Tareas')}
            {selectedDate && (
              <span className="date-filter-badge">
                📅 {formatDate(selectedDate.toISOString().split('T')[0])}
              </span>
            )}
            {selectedDate && (
              <button 
                className="clear-date-badge" 
                onClick={clearDateFilter}
                title="Limpiar filtro de fecha"
              >
                ✖️
              </button>
            )}
          </h1>
        </div>
        
        <div className="controls-row">
          <div className="filtros">
            <button className={`filtro-btn ${filter === 'todas' ? 'active' : ''}`} onClick={() => setFilter('todas')}>📃 Todas</button>
            <button className={`filtro-btn ${filter === 'pendientes' ? 'active' : ''}`} onClick={() => setFilter('pendientes')}>📝 Pendientes</button>
            <button className={`filtro-btn ${filter === 'completadas' ? 'active' : ''}`} onClick={() => setFilter('completadas')}>✅ Completadas</button>
            <button className={`filtro-btn ${filter === 'vencidas' ? 'active' : ''}`} onClick={() => setFilter('vencidas')}>⏰ Vencidas</button>
            <button className={`filtro-btn ${filter === 'urgentes' ? 'active' : ''}`} onClick={() => setFilter('urgentes')}>⚡ Urgentes</button>
            {selectedDate && (
              <button className="filtro-btn clear-date-btn" onClick={clearDateFilter}>
                ✖️ Limpiar fecha: {formatDate(selectedDate.toISOString().split('T')[0])}
              </button>
            )}
          </div>
          
          <div className="stats-badges">
            <div className="stat-badge pending">📝 {stats.pendientes}</div>
            <div className="stat-badge completed">✅ {stats.completadas}</div>
            {stats.conFecha > 0 && <div className="stat-badge scheduled">📅 {stats.conFecha}</div>}
            {stats.urgentes > 0 && <div className="stat-badge urgent">⚡ {stats.urgentes}</div>}
            {stats.incumplidas > 0 && <div className="stat-badge violated">⏰ {stats.incumplidas}</div>}
          </div>
        </div>
        
        {showCalendar && (
          <EnhancedCalendar tasks={tasks} onSelectDate={handleDateSelect} selectedDate={selectedDate} onClose={() => setShowCalendar(false)} />
        )}
        
        <ul id="listatareas">
          {displayedTasks.length === 0 ? (
            <li className="sin-tareas">
              <span>📭</span>
              {showScheduledOnly ? 'No hay tareas programadas para fechas futuras' : 
                selectedDate ? 'No hay tareas para este día' : 'No hay tareas en esta lista'}
            </li>
          ) : (
            displayedTasks.map(task => {
              const timeInfo = getTimeInfo(task)
              const isOverdue = isTaskOverdue(task)
              const isUrgent = isTaskUrgent(task)
              
              return (
                <li key={task.id} data-task-id={task.id} className={`tarea-item ${task.completed ? 'completada' : ''} ${isOverdue ? 'overdue' : ''} ${isUrgent ? 'urgent' : ''}`}>
                  {editingTask === task.id ? (
                    <div className="editar-tarea-form">
                      <div className="input-with-counter">
                        <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={50} autoFocus />
                        <span className="char-counter">{editTitle.length}/50</span>
                      </div>
                      <div className="input-with-counter">
                        <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={100} />
                        <span className="char-counter">{editDesc.length}/100</span>
                      </div>
                      <div className="datetime-inputs">
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="date-input" />
                        <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="time-input" placeholder="Inicio" />
                        <span className="time-separator">-</span>
                        <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="time-input" placeholder="Fin" />
                      </div>
                      <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                        <option value="baja">🟢 Prioridad Baja</option>
                        <option value="media">🟡 Prioridad Media</option>
                        <option value="alta">🔴 Prioridad Alta</option>
                      </select>
                      <div className="botones-edicion">
                        <button className="guardar-btn" onClick={() => guardarEdicion(task.id)}>💾 Guardar</button>
                        <button className="cancelar-btn" onClick={cancelarEdicion}>✕ Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="tarea-content-wrapper">
                      <div className="tarea-contenido">
                        <span className="tarea-titulo">
                          {task.title}
                          {task.priority === 'alta' && <span className="prioridad prioridad-alta">🔴 Alta</span>}
                          {task.priority === 'media' && <span className="prioridad prioridad-media">🟡 Media</span>}
                          {task.priority === 'baja' && <span className="prioridad prioridad-baja">🟢 Baja</span>}
                          {isOverdue && <span className="overdue-badge">⏰ VENCIDA</span>}
                          {isUrgent && !isOverdue && <span className="urgent-badge">⚡ URGENTE</span>}
                          {task.isScheduled && task.scheduledFor && (
                            <span className="scheduled-badge-task">📅 Programada: {formatDate(task.scheduledFor)}</span>
                          )}
                        </span>
                        {task.description && <span className="tarea-descripcion">{task.description}</span>}
                        {(task.date || task.startTime || task.endTime) && (
                          <span className="tarea-datetime">
                            📅 {task.date ? formatDate(task.date) : 'Sin fecha'}
                            {(task.startTime || task.endTime) && (
                              <span className="time-range">🕐 {formatTime(task.startTime)} - {formatTime(task.endTime)}</span>
                            )}
                          </span>
                        )}
                        {timeInfo && !task.completed && (
                          <span className={`time-remaining-badge ${timeInfo.overdue ? 'overdue' : timeInfo.urgent ? 'urgent' : ''}`}>
                            {timeInfo.overdue ? '⏰ ' : '⏳ '}{timeInfo.text}
                          </span>
                        )}
                      </div>
                      <div className="botones-container">
                        <button className={`boton-completar ${task.completed ? 'completado' : ''}`} onClick={() => completarTarea(task)} title={task.completed ? 'Desmarcar' : 'Completar'}>
                          {task.completed ? '↩️' : '✓'}
                        </button>
                        <button className="boton-editar" onClick={() => iniciarEditar(task)} title="Editar">✏️</button>
                        <button className="boton-eliminar" onClick={() => setDeleteModalTask(task.id)} title="Eliminar">🗑️</button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })
          )}
        </ul>
        
        {/* Botón flotante moderno para agregar tarea */}
        <button className="floating-btn" onClick={openModal}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
        
        {/* ================= MODAL DE CREAR TAREA CORREGIDO ================= */}
<div className={`modal-overlay ${showModal ? 'active' : ''}`} onClick={closeModal}>
  <div className="modal task-modal enhanced" onClick={e => e.stopPropagation()}>
    <div className="modal-header">
      <h3>
        <span className="modal-icon">✨</span>
        Crear Nueva Tarea
      </h3>
      <button className="modal-close" onClick={closeModal}>✕</button>
    </div>
    <div className="modal-form modern-form">
      
      {/* Campo Título - con placeholder=" " para que flote */}
      <div className="input-group floating">
        <input 
          type="text" 
          id="taskTitle"
          placeholder=" "
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          maxLength={50}
          autoFocus
        />
        <label htmlFor="taskTitle">📝 Título de la tarea</label>
        <span className="char-counter">{newTaskTitle.length}/50</span>
      </div>
      
      {/* Campo Descripción - con placeholder=" " */}
      <div className="input-group floating">
        <textarea 
          id="taskDesc"
          placeholder=" "
          value={newTaskDesc}
          onChange={(e) => setNewTaskDesc(e.target.value)}
          maxLength={100}
          rows="3"
        />
        <label htmlFor="taskDesc">📄 Descripción (opcional)</label>
        <span className="char-counter">{newTaskDesc.length}/100</span>
      </div>
      
      {/* Fila de fecha y prioridad */}
      <div className="form-row-modern">
        <div className="input-group floating half">
          <input 
            type="date" 
            id="taskDate"
            value={newTaskDate}
            onChange={(e) => setNewTaskDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          <label htmlFor="taskDate">📅 Fecha</label>
        </div>
        
        <div className="priority-selector">
          <label>🎯 Prioridad</label>
          <div className="priority-buttons">
            <button 
              type="button"
              className={`priority-option baja ${newTaskPriority === 'baja' ? 'active' : ''}`}
              onClick={() => setNewTaskPriority('baja')}
            >
              🟢 Baja
            </button>
            <button 
              type="button"
              className={`priority-option media ${newTaskPriority === 'media' ? 'active' : ''}`}
              onClick={() => setNewTaskPriority('media')}
            >
              🟡 Media
            </button>
            <button 
              type="button"
              className={`priority-option alta ${newTaskPriority === 'alta' ? 'active' : ''}`}
              onClick={() => setNewTaskPriority('alta')}
            >
              🔴 Alta
            </button>
          </div>
        </div>
      </div>
      
      {/* Fila de horas */}
      <div className="form-row-modern">
        <div className="input-group floating half">
          <input 
            type="time" 
            id="startTime"
            placeholder=" "
            value={newTaskStartTime}
            onChange={(e) => setNewTaskStartTime(e.target.value)}
            step="600"
          />
          <label htmlFor="startTime">⏰ Hora inicio</label>
        </div>
        <div className="input-group floating half">
          <input 
            type="time" 
            id="endTime"
            placeholder=" "
            value={newTaskEndTime}
            onChange={(e) => setNewTaskEndTime(e.target.value)}
            step="600"
          />
          <label htmlFor="endTime">⏰ Hora fin</label>
        </div>
      </div>
      
      {/* Error de hora */}
      {(newTaskStartTime && newTaskEndTime && newTaskStartTime >= newTaskEndTime) && (
        <div className="time-error-modern">
          ⚠️ La hora de fin debe ser posterior a la hora de inicio
        </div>
      )}
      
      {/* Botón crear */}
      <button className="modal-submit modern" onClick={agregarTarea}>
        <span>✨</span>
        Crear Tarea
        <span>→</span>
      </button>
    </div>
  </div>
</div>
        
        {/* Modal Eliminar Tarea */}
        <div className={`modal-overlay delete-modal-overlay ${deleteModalTask ? 'active' : ''}`} onClick={() => setDeleteModalTask(null)}>
          <div className="modal delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>⚠️ Confirmar Eliminación</h3><button className="modal-close" onClick={() => setDeleteModalTask(null)}>✕</button></div>
            <div className="delete-modal-content"><p>¿Estás seguro de que deseas eliminar esta tarea?</p><p className="delete-warning">Esta acción no se puede deshacer.</p></div>
            <div className="delete-modal-buttons">
              <button className="cancelar-btn" onClick={() => setDeleteModalTask(null)}>✕ Cancelar</button>
              <button className="confirmar-eliminar-btn" onClick={() => eliminarTarea(deleteModalTask)}>🗑️ Eliminar</button>
            </div>
          </div>
        </div>
        
        {/* Modal Eliminar Lista */}
        <div className={`modal-overlay delete-modal-overlay ${deleteListModal ? 'active' : ''}`} onClick={() => setDeleteListModal(null)}>
          <div className="modal delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>⚠️ Eliminar Lista</h3><button className="modal-close" onClick={() => setDeleteListModal(null)}>✕</button></div>
            <div className="delete-modal-content"><p>¿Estás seguro de que deseas eliminar esta lista?</p><p className="delete-warning">Se eliminarán todas las tareas contenidas en ella. Esta acción no se puede deshacer.</p></div>
            <div className="delete-modal-buttons">
              <button className="cancelar-btn" onClick={() => setDeleteListModal(null)}>✕ Cancelar</button>
              <button className="confirmar-eliminar-btn" onClick={() => eliminarLista(deleteListModal)}>🗑️ Eliminar Lista</button>
            </div>
          </div>
        </div>
        
        {showReport && <EnhancedReportModal tasks={tasks} onClose={() => setShowReport(false)} />}
        
        {notification && <div className={`notification notification-${notification.type}`}>{notification.message}</div>}

        {/* ================= MODAL DE ESTADÍSTICAS CON GRÁFICAS DE TENDENCIA ================= */}
        {showStats && (
          <div className="modal-overlay active" onClick={() => setShowStats(false)}>
            <div className="modal stats-modal enhanced" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📊 Panel de Estadísticas</h3>
                <div className="trend-toggle">
                  <button 
                    className={`trend-btn ${trendView === 'week' ? 'active' : ''}`}
                    onClick={() => setTrendView('week')}
                  >
                    📅 Semanal
                  </button>
                  <button 
                    className={`trend-btn ${trendView === 'month' ? 'active' : ''}`}
                    onClick={() => setTrendView('month')}
                  >
                    📆 Mensual
                  </button>
                </div>
                <button className="modal-close" onClick={() => setShowStats(false)}>✕</button>
              </div>
              <div className="stats-container">
                
                {/* Tarjetas de resumen */}
                <div className="stats-cards">
                  <div className="stat-card total">
                    <div className="stat-icon">📋</div>
                    <div className="stat-info">
                      <span className="stat-number">{tasks.length}</span>
                      <span className="stat-label">Total Tareas</span>
                    </div>
                  </div>
                  <div className="stat-card completed">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                      <span className="stat-number">{tasks.filter(t => t.completed).length}</span>
                      <span className="stat-label">Completadas</span>
                    </div>
                  </div>
                  <div className="stat-card pending">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-info">
                      <span className="stat-number">{tasks.filter(t => !t.completed && !isTaskOverdue(t)).length}</span>
                      <span className="stat-label">Pendientes</span>
                    </div>
                  </div>
                  <div className="stat-card overdue">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-info">
                      <span className="stat-number">{tasks.filter(t => isTaskOverdue(t)).length}</span>
                      <span className="stat-label">Vencidas</span>
                    </div>
                  </div>
                </div>

                {/* Gráfica de tendencia en espiral (evolución) */}
                <div className="trend-chart-section">
                  <h4>📈 Evolución de Tareas {trendView === 'week' ? 'Semanal' : 'Mensual'}</h4>
                  <div className="spiral-trend">
                    {trendView === 'week' ? (
                      <div className="weekly-spiral">
                        {weeklyTrendData.map((item, idx) => (
                          <div key={idx} className="spiral-bar-group">
                            <div className="spiral-bars">
                              <div 
                                className="spiral-bar completed-bar" 
                                style={{ height: `${item.completedPercent}px` }}
                                title={`Completadas: ${item.completed}`}
                              >
                                <span className="bar-value">{item.completed}</span>
                              </div>
                              <div 
                                className="spiral-bar pending-bar" 
                                style={{ height: `${item.pendingPercent}px` }}
                                title={`Pendientes: ${item.pending}`}
                              >
                                <span className="bar-value">{item.pending}</span>
                              </div>
                            </div>
                            <span className="spiral-label">{item.day}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="monthly-spiral">
                        {monthlyTrendData.map((item, idx) => {
                          const height = (item.completed / item.maxValue) * 80 || 0
                          return (
                            <div key={idx} className="month-bar-group">
                              <div 
                                className="month-bar" 
                                style={{ height: `${height}px` }}
                                title={`${item.week}: ${item.completed} tareas completadas`}
                              >
                                <span className="month-value">{item.completed}</span>
                              </div>
                              <span className="month-label">{item.week}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="trend-legend">
                    <span className="legend-dot completed-dot"></span>
                    <span>Completadas</span>
                    <span className="legend-dot pending-dot"></span>
                    <span>Pendientes</span>
                  </div>
                </div>

                {/* Gráfica de barras de progreso */}
                <div className="chart-section">
                  <h4>📊 Progreso General</h4>
                  <div className="progress-bar-container">
                    <div className="progress-label">
                      <span>✅ Completadas</span>
                      <span>{Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) || 0}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill completed-fill"
                        style={{ width: `${(tasks.filter(t => t.completed).length / tasks.length) * 100 || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-label">
                      <span>⏳ Pendientes</span>
                      <span>{Math.round((tasks.filter(t => !t.completed && !isTaskOverdue(t)).length / tasks.length) * 100) || 0}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill pending-fill"
                        style={{ width: `${(tasks.filter(t => !t.completed && !isTaskOverdue(t)).length / tasks.length) * 100 || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-label">
                      <span>⚠️ Vencidas</span>
                      <span>{Math.round((tasks.filter(t => isTaskOverdue(t)).length / tasks.length) * 100) || 0}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill overdue-fill"
                        style={{ width: `${(tasks.filter(t => isTaskOverdue(t)).length / tasks.length) * 100 || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Estadísticas por prioridad */}
                <div className="priority-stats">
                  <h4>🎯 Tareas por Prioridad</h4>
                  <div className="priority-bars">
                    <div className="priority-item alta">
                      <span>🔴 Alta</span>
                      <div className="priority-bar-bg">
                        <div className="priority-bar-fill" style={{ width: `${(tasks.filter(t => t.priority === 'alta').length / tasks.length) * 100 || 0}%` }}></div>
                      </div>
                      <span className="priority-count">{tasks.filter(t => t.priority === 'alta').length}</span>
                    </div>
                    <div className="priority-item media">
                      <span>🟡 Media</span>
                      <div className="priority-bar-bg">
                        <div className="priority-bar-fill" style={{ width: `${(tasks.filter(t => t.priority === 'media').length / tasks.length) * 100 || 0}%` }}></div>
                      </div>
                      <span className="priority-count">{tasks.filter(t => t.priority === 'media').length}</span>
                    </div>
                    <div className="priority-item baja">
                      <span>🟢 Baja</span>
                      <div className="priority-bar-bg">
                        <div className="priority-bar-fill" style={{ width: `${(tasks.filter(t => t.priority === 'baja').length / tasks.length) * 100 || 0}%` }}></div>
                      </div>
                      <span className="priority-count">{tasks.filter(t => t.priority === 'baja').length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default App