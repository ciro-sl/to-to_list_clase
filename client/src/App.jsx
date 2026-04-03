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

// Función para formatear tiempo restante
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

// Verificar si una tarea está por vencer (dentro de 1 hora)
const isTaskUrgent = (task) => {
  if (!task.date || !task.endTime || task.completed) return false
  
  const now = new Date()
  const [year, month, day] = task.date.split('-').map(Number)
  const [hours, minutes] = task.endTime.split(':').map(Number)
  
  const target = new Date(year, month - 1, day, hours, minutes)
  const diff = target - now
  
  return diff > 0 && diff <= 60 * 60 * 1000
}

// ================= COMPONENTE SISTEMA DE NOTIFICACIONES MEJORADO =================

const EnhancedNotificationSystem = ({ tasks, onTaskClick }) => {
  const [showPanel, setShowPanel] = useState(false)
  const [activeTab, setActiveTab] = useState('overdue')
  const [notificationHistory, setNotificationHistory] = useState([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastNotificationCount, setLastNotificationCount] = useState(0)
  const audioRef = useRef(null)
  
  // Obtener tareas vencidas
  const overdueTasks = useMemo(() => {
    return tasks.filter(task => isTaskOverdue(task))
  }, [tasks])
  
  // Obtener tareas por vencer (urgentes)
  const urgentTasks = useMemo(() => {
    return tasks.filter(task => isTaskUrgent(task) && !isTaskOverdue(task))
  }, [tasks])
  
  // Obtener tareas completadas recientemente
  const recentCompleted = useMemo(() => {
    return tasks.filter(task => task.completed).slice(0, 10)
  }, [tasks])
  
  const totalNotifications = overdueTasks.length + urgentTasks.length
  
  // Reproducir sonido de notificación
  useEffect(() => {
    if (totalNotifications > lastNotificationCount && soundEnabled) {
      // Crear un beep simple usando Web Audio API
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
  
  // Agregar a historial cuando cambia el conteo
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
  
  const togglePanel = () => {
    setShowPanel(!showPanel)
  }
  
  const handleTaskClick = (task) => {
    if (onTaskClick) {
      onTaskClick(task)
    }
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
  
  const clearHistory = () => {
    setNotificationHistory([])
  }
  
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
            <span className="meta-date">
              📅 {formatDate(task.date) || 'Sin fecha'}
            </span>
            {(task.startTime || task.endTime) && (
              <span className="meta-time">
                🕐 {formatTime(task.startTime)} - {formatTime(task.endTime)}
              </span>
            )}
          </div>
          
          {timeInfo && (
            <div className={`time-remaining ${timeInfo.overdue ? 'overdue' : timeInfo.urgent ? 'urgent' : ''}`}>
              {timeInfo.overdue ? '⏰ ' : '⏳ '}
              {timeInfo.text}
            </div>
          )}
        </div>
        
        <div className="notification-item-actions">
          {isNotification && (
            <>
              <button 
                className="notification-action-btn view-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleTaskClick(task)
                }}
              >
                👁️ Ver
              </button>
              {urgency !== 'overdue' && !task.completed && (
                <button 
                  className="notification-action-btn complete-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Completar tarea desde notificación
                  }}
                >
                  ✓ Completar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className="notification-bar">
      <button 
        className={`notification-bell ${totalNotifications > 0 ? 'has-notifications' : ''} ${totalNotifications > 0 ? 'bell-ring' : ''}`}
        onClick={togglePanel}
        title={totalNotifications > 0 ? `${totalNotifications} alerta${totalNotifications !== 1 ? 's' : ''}` : 'Sin alertas'}
      >
        <span className="bell-icon">
          {totalNotifications > 0 ? '🔔' : '🔕'}
        </span>
        {totalNotifications > 0 && (
          <span className="notification-count">{totalNotifications}</span>
        )}
      </button>
      
      {/* Botón de sonido */}
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
          <div className="notification-panel">
            <div className="notification-panel-header">
              <h3>
                🔔 Centro de Alertas
                {totalNotifications > 0 && (
                  <span className="header-badge">{totalNotifications}</span>
                )}
              </h3>
              <div className="header-actions">
                <button 
                  className="clear-history-btn"
                  onClick={clearHistory}
                  title="Limpiar historial"
                >
                  🗑️
                </button>
                <button className="close-panel" onClick={() => setShowPanel(false)}>✕</button>
              </div>
            </div>
            
            {/* Tabs de navegación */}
            <div className="notification-tabs">
              <button 
                className={`tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
                onClick={() => setActiveTab('overdue')}
              >
                ⏰ Vencidas
                {overdueTasks.length > 0 && (
                  <span className="tab-badge danger">{overdueTasks.length}</span>
                )}
              </button>
              <button 
                className={`tab-btn ${activeTab === 'urgent' ? 'active' : ''}`}
                onClick={() => setActiveTab('urgent')}
              >
                ⚡ Próximas
                {urgentTasks.length > 0 && (
                  <span className="tab-badge warning">{urgentTasks.length}</span>
                )}
              </button>
              <button 
                className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                📜 Historial
                {notificationHistory.length > 0 && (
                  <span className="tab-badge">{notificationHistory.length}</span>
                )}
              </button>
            </div>
            
            <div className="notification-panel-content">
              {activeTab === 'overdue' && (
                overdueTasks.length > 0 ? (
                  overdueTasks.map(task => renderTaskItem(task, true))
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon">🎉</span>
                    <p>¡Sin tareas vencidas!</p>
                    <span className="empty-subtext">Todo está al día</span>
                  </div>
                )
              )}
              
              {activeTab === 'urgent' && (
                urgentTasks.length > 0 ? (
                  urgentTasks.map(task => renderTaskItem(task, true))
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon">😌</span>
                    <p>Sin tareas urgentes</p>
                    <span className="empty-subtext">Tienes tiempo de sobra</span>
                  </div>
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
                  <div className="empty-state">
                    <span className="empty-icon">📝</span>
                    <p>Sin historial</p>
                    <span className="empty-subtext">Las alertas aparecerán aquí</span>
                  </div>
                )
              )}
            </div>
            
            <div className="notification-panel-footer">
              <div className="quick-stats">
                <span className="stat-item">
                  <span className="stat-icon overdue">⏰</span>
                  <span className="stat-value">{overdueTasks.length}</span>
                  <span className="stat-label">Vencidas</span>
                </span>
                <span className="stat-item">
                  <span className="stat-icon urgent">⚡</span>
                  <span className="stat-value">{urgentTasks.length}</span>
                  <span className="stat-label">Urgentes</span>
                </span>
                <span className="stat-item">
                  <span className="stat-icon completed">✅</span>
                  <span className="stat-value">{recentCompleted.length}</span>
                  <span className="stat-label">Completadas</span>
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ================= COMPONENTE CALENDARIO MEJORADO =================

const EnhancedCalendar = ({ tasks, onSelectDate, selectedDate, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState('month')
  const [selectedTask, setSelectedTask] = useState(null)
  
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
  
  const getWeekDays = (date) => {
    const days = []
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
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
  
  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
  }
  
  const getDayStatus = (date) => {
    const dayTasks = getTasksForDate(date)
    const hasOverdue = dayTasks.some(t => isTaskOverdue(t))
    const hasUrgent = dayTasks.some(t => isTaskUrgent(t))
    const allCompleted = dayTasks.length > 0 && dayTasks.every(t => t.completed)
    
    return { hasOverdue, hasUrgent, allCompleted, count: dayTasks.length }
  }
  
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }
  
  const goToToday = () => {
    setCurrentMonth(new Date())
  }
  
  const days = getDaysInMonth(currentMonth)
  const weekDays = getWeekDays(currentMonth)
  
  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal calendar-modal enhanced" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📅 Calendario de Tareas</h3>
          <div className="header-legend">
            <span className="legend-item"><span className="dot overdue"></span> Vencidas</span>
            <span className="legend-item"><span className="dot urgent"></span> Urgentes</span>
            <span className="legend-item"><span className="dot completed"></span> Completadas</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="calendar-container">
          <div className="calendar-header">
            <div className="calendar-nav">
              <button onClick={viewMode === 'month' ? prevMonth : () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                ◀
              </button>
              <h3>
                {viewMode === 'month' 
                  ? `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`
                  : `${monthNames[weekDays[0].getMonth()]} ${weekDays[0].getDate()} - ${monthNames[weekDays[6].getMonth()]} ${weekDays[6].getDate()}`}
              </h3>
              <button onClick={viewMode === 'month' ? nextMonth : () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                ▶
              </button>
            </div>
            <div className="calendar-controls">
              <button onClick={goToToday} className="today-btn">📍 Hoy</button>
              <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="view-mode-select">
                <option value="month">Mes</option>
                <option value="week">Semana</option>
              </select>
            </div>
          </div>
          
          <div className="calendar-grid">
            <div className="calendar-weekdays">
              {dayNames.map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>
          
            {viewMode === 'month' ? (
              <div className="calendar-days">
                {days.map((dayInfo, index) => {
                  const dayTasks = getTasksForDate(dayInfo.date)
                  const status = getDayStatus(dayInfo.date)
                  return (
                    <div 
                      key={index}
                      className={`calendar-day ${!dayInfo.currentMonth ? 'other-month' : ''} ${isToday(dayInfo.date) ? 'today' : ''} ${isSelected(dayInfo.date) ? 'selected' : ''} ${status.hasOverdue ? 'has-overdue' : ''} ${status.hasUrgent ? 'has-urgent' : ''} ${status.allCompleted ? 'all-completed' : ''}`}
                      onClick={() => onSelectDate(dayInfo.date)}
                    >
                      <span className="day-number">{dayInfo.date.getDate()}</span>
                      {dayTasks.length > 0 && (
                        <div className="day-tasks-preview">
                          {dayTasks.slice(0, 3).map(task => (
                            <div 
                              key={task.id} 
                              className={`task-preview ${task.completed ? 'completed' : ''} ${isTaskOverdue(task) ? 'overdue' : ''} ${isTaskUrgent(task) ? 'urgent' : ''}`}
                              title={task.title}
                            >
                              {isTaskOverdue(task) && '⏰ '}
                              {isTaskUrgent(task) && '⚡ '}
                              {task.title.substring(0, 8)}...
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <div className="more-tasks">+{dayTasks.length - 3} más</div>
                          )}
                          <div className="day-summary">
                            <span className="summary-total">{dayTasks.length}</span>
                            {status.hasOverdue && <span className="summary-overdue">⏰</span>}
                            {status.hasUrgent && <span className="summary-urgent">⚡</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="calendar-week">
                {weekDays.map((day, index) => {
                  const dayTasks = getTasksForDate(day)
                  return (
                    <div 
                      key={index}
                      className={`week-day ${isToday(day) ? 'today' : ''} ${isSelected(day) ? 'selected' : ''}`}
                      onClick={() => onSelectDate(day)}
                    >
                      <div className="week-day-header">
                        <span className="week-day-name">{dayNames[index]}</span>
                        <span className="week-day-number">{day.getDate()}</span>
                      </div>
                      <div className="week-day-tasks">
                        {dayTasks.map(task => (
                          <div 
                            key={task.id}
                            className={`week-task ${task.completed ? 'completed' : ''} ${isTaskOverdue(task) ? 'overdue' : ''} ${isTaskUrgent(task) ? 'urgent' : ''}`}
                            title={`${task.title}\n${formatTime(task.startTime)} - ${formatTime(task.endTime)}`}
                          >
                            <span className="week-task-time">{formatTime(task.startTime)}</span>
                            <span className="week-task-title">{task.title}</span>
                            {isTaskOverdue(task) && <span className="task-status-badge">⏰</span>}
                            {isTaskUrgent(task) && <span className="task-status-badge">⚡</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ================= COMPONENTE REPORTE DE INCUMPLIMIENTO MEJORADO =================

const EnhancedReportModal = ({ tasks, onClose }) => {
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(5)
  const [showFilters, setShowFilters] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState('all')
  const intervalRef = useRef(null)
  const currentTime = new Date()
  
  const violatedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
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
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter)
    }
    
    return filtered.sort((a, b) => {
      // Ordenar por prioridad y luego por fecha
      const priorityOrder = { alta: 0, media: 1, baja: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }, [tasks, priorityFilter])
  
  // Auto-refresh logic
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        setAutoRefresh(false)
        setTimeout(() => setAutoRefresh(true), 100)
      }, refreshInterval * 60 * 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, refreshInterval])
  
  const generateReportHTML = () => {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Incumplimientos</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #e74c3c; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #e74c3c; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .status { color: #e74c3c; font-weight: bold; }
          .info { color: #666; margin-top: 20px; }
          .priority-high { color: #e74c3c; }
          .priority-medium { color: #f39c12; }
          .priority-low { color: #27ae60; }
        </style>
      </head>
      <body>
        <h1>📋 Reporte de Tareas Incumplidas</h1>
        <p class="info"><strong>Fecha de generación:</strong> ${currentTime.toLocaleString('es-ES')}</p>
        <p class="info"><strong>Total de incumplimientos:</strong> ${violatedTasks.length}</p>
        <table>
          <thead>
            <tr>
              <th>Tarea</th>
              <th>Prioridad</th>
              <th>Fecha Programada</th>
              <th>Hora Inicio</th>
              <th>Hora Fin</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
    `
    
    violatedTasks.forEach(task => {
      const priorityClass = `priority-${task.priority}`
      html += `
        <tr>
          <td>${task.title}</td>
          <td class="${priorityClass}">${task.priority.toUpperCase()}</td>
          <td>${formatDate(task.date)}</td>
          <td>${formatTime(task.startTime)}</td>
          <td>${formatTime(task.endTime)}</td>
          <td class="status">❌ INCUMPLIDA</td>
        </tr>
      `
    })
    
    html += `
          </tbody>
        </table>
      </body>
      </html>
    `
    return html
  }
  
  const exportReport = () => {
    const html = generateReportHTML()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_incumplimientos_${currentTime.toISOString().split('T')[0]}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  const copyToClipboard = () => {
    const text = violatedTasks.map(task => 
      `• ${task.title} | Prioridad: ${task.priority} | Fecha: ${formatDate(task.date)} | Horario: ${formatTime(task.startTime)} - ${formatTime(task.endTime)} | Estado: INCUMPLIDA`
    ).join('\n')
    navigator.clipboard.writeText(`REPORTE DE INCUMPLIMIENTOS\nGenerado: ${currentTime.toLocaleString('es-ES')}\n\n${text}`)
  }
  
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
        
        <div className="report-controls">
          <div className="controls-row">
            <div className="auto-refresh-control">
              <label className="control-label">
                <input 
                  type="checkbox" 
                  checked={autoRefresh} 
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span>Auto-refresh</span>
              </label>
              <select 
                value={refreshInterval} 
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                disabled={!autoRefresh}
                className="interval-select"
              >
                <option value={1}>1 min</option>
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
              </select>
            </div>
            
            <div className="filter-control">
              <button 
                className={`filter-toggle ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                🔍 Filtros {showFilters ? '▲' : '▼'}
              </button>
              {showFilters && (
                <div className="filter-dropdown">
                  <label>
                    <input 
                      type="radio" 
                      name="priority" 
                      value="all" 
                      checked={priorityFilter === 'all'}
                      onChange={() => setPriorityFilter('all')}
                    />
                    Todas
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="priority" 
                      value="alta" 
                      checked={priorityFilter === 'alta'}
                      onChange={() => setPriorityFilter('alta')}
                    />
                    🔴 Alta
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="priority" 
                      value="media" 
                      checked={priorityFilter === 'media'}
                      onChange={() => setPriorityFilter('media')}
                    />
                    🟡 Media
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="priority" 
                      value="baja" 
                      checked={priorityFilter === 'baja'}
                      onChange={() => setPriorityFilter('baja')}
                    />
                    🟢 Baja
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {violatedTasks.length > 0 ? (
          <div className="report-table-container">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Prioridad</th>
                  <th>Tarea</th>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Tiempo Vencido</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {violatedTasks.map(task => {
                  const overdueTime = getOverdueTime(task)
                  return (
                    <tr key={task.id} className={`priority-row ${task.priority}`}>
                      <td>
                        <span className={`priority-badge ${task.priority}`}>
                          {task.priority === 'alta' && '🔴'}
                          {task.priority === 'media' && '🟡'}
                          {task.priority === 'baja' && '🟢'}
                          {task.priority}
                        </span>
                      </td>
                      <td>{task.title}</td>
                      <td>{formatDate(task.date)}</td>
                      <td>{formatTime(task.startTime)} - {formatTime(task.endTime)}</td>
                      <td className="overdue-time">
                        {overdueTime && (
                          <span className="overdue-badge">
                            ⏰ {overdueTime.text}
                          </span>
                        )}
                      </td>
                      <td className="status-violated">❌ INCUMPLIDA</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-violations">
            <span className="checkmark">🎉</span>
            <p>¡No hay tareas incumplidas!</p>
            <p className="subtext">Todas las tareas con hora de fin pasada han sido completadas.</p>
          </div>
        )}
        
        <div className="report-actions">
          <button onClick={exportReport} className="export-btn" disabled={violatedTasks.length === 0}>
            📥 Exportar HTML
          </button>
          <button onClick={copyToClipboard} className="copy-btn" disabled={violatedTasks.length === 0}>
            📋 Copiar al portapapeles
          </button>
        </div>
      </div>
    </div>
  )
}

// ================= PERSISTENCIA LOCAL =================

const STORAGE_KEY_TASKS = 'todo_tasks'
const STORAGE_KEY_LISTS = 'todo_lists'
const STORAGE_KEY_LAST_ID_TASK = 'todo_last_id_task'
const STORAGE_KEY_LAST_ID_LIST = 'todo_last_id_list'

// Cargar desde localStorage
const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : defaultValue
  } catch (error) {
    console.error('Error loading from storage:', error)
    return defaultValue
  }
}

// Guardar en localStorage
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Error saving to storage:', error)
  }
}

// Generar ID único
const generateId = (key) => {
  const lastId = parseInt(localStorage.getItem(key) || '0', 10)
  const newId = lastId + 1
  localStorage.setItem(key, newId.toString())
  return newId
}

// ================= COMPONENTE PRINCIPAL APP =================

function App() {
  const [tasks, setTasks] = useState(() => loadFromStorage(STORAGE_KEY_TASKS, []))
  const [lists, setLists] = useState(() => loadFromStorage(STORAGE_KEY_LISTS, [
    { id: 1, name: 'Tareas Generales', color: '#3498db' }
  ]))
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
  
  // Reloj en tiempo real para actualizar estados de tareas
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date())
    }, 60000) // Actualizar cada minuto
    return () => clearInterval(timer)
  }, [])

  // Persistir tareas en localStorage cada vez que cambien
  useEffect(() => {
    saveToStorage(STORAGE_KEY_TASKS, tasks)
  }, [tasks])
  
  // Persistir listas en localStorage cada vez que cambien
  useEffect(() => {
    saveToStorage(STORAGE_KEY_LISTS, lists)
  }, [lists])
  
  // Mostrar notificación
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }
  
  // Filtrar tareas por lista seleccionada
  const listTasks = useMemo(() => {
    return tasks.filter(t => t.list_id === selectedList)
  }, [tasks, selectedList])
  
  // Estadísticas basadas en tareas de la lista actual
  const stats = useMemo(() => {
    const total = listTasks.length
    const completadas = listTasks.filter(t => t.completed).length
    const pendientes = total - completadas
    const conFecha = listTasks.filter(t => t.date).length
    const incumplidas = listTasks.filter(t => isTaskOverdue(t)).length
    const urgentes = listTasks.filter(t => isTaskUrgent(t)).length
    return { total, completadas, pendientes, conFecha, incumplidas, urgentes }
  }, [listTasks, liveClock])
  
  // Filtrar tareas de la lista actual
  const filteredTasks = useMemo(() => {
    let result = listTasks
    
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0]
      result = result.filter(t => t.date === dateStr)
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
  }, [listTasks, filter, selectedDate, liveClock])
  
  // ================= VALIDACIONES MEJORADAS =================
  
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
    if (newTaskStartTime && newTaskEndTime && !isValidTimeRange(newTaskStartTime, newTaskEndTime)) {
      showNotification('⚠️ La hora de fin debe ser posterior a la hora de inicio', 'error')
      return false
    }
    const regexSoloLetrasYEspacios = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
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
    if (editStartTime && editEndTime && !isValidTimeRange(editStartTime, editEndTime)) {
      showNotification('⚠️ La hora de fin debe ser posterior a la hora de inicio', 'error')
      return false
    }
    const regexSoloLetrasYEspacios = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
    if (!regexSoloLetrasYEspacios.test(editTitle.trim())) {
      showNotification('⚠️ El título solo puede contener letras y espacios', 'error')
      return false
    }
    return true
  }
  
  // ================= FUNCIONES LOCALES =================
  
  // Crear nueva lista
  const crearLista = () => {
    if (!validarCrearLista()) return
    
    const newList = {
      id: generateId(STORAGE_KEY_LAST_ID_LIST),
      name: newListName,
      color: newListColor
    }
    
    setLists(prev => [...prev, newList])
    setNewListName('')
    setNewListColor('#3498db')
    showNotification('✅ Lista creada exitosamente', 'success')
  }
  
  // Eliminar lista
  const confirmarEliminarLista = (id) => {
    if (id === 1) {
      showNotification('⚠️ No se puede eliminar la lista principal', 'error')
      return
    }
    setDeleteListModal(id)
  }
  
  const eliminarLista = () => {
    if (!deleteListModal) return
    
    // Eliminar tareas de esa lista
    setTasks(prev => prev.filter(t => t.list_id !== deleteListModal))
    // Eliminar la lista
    setLists(prev => prev.filter(l => l.id !== deleteListModal))
    setDeleteListModal(null)
    setSelectedList(1)
    showNotification('✅ Lista eliminada exitosamente', 'success')
  }
  
  const cancelarEliminarLista = () => {
    setDeleteListModal(null)
  }
  
  // Abrir/cerrar modal
  const openModal = () => {
    setNewTaskTitle('')
    setNewTaskDesc('')
    setNewTaskPriority('baja')
    setNewTaskDate('')
    setNewTaskStartTime('')
    setNewTaskEndTime('')
    setShowModal(true)
  }
  
  const closeModal = () => {
    setShowModal(false)
  }
  
  // Agregar nueva tarea
  const agregarTarea = () => {
    if (!validarCrearTarea()) return
    
    const newTask = {
      id: generateId(STORAGE_KEY_LAST_ID_TASK),
      title: newTaskTitle,
      description: newTaskDesc,
      priority: newTaskPriority,
      list_id: selectedList,
      date: newTaskDate || null,
      startTime: newTaskStartTime || null,
      endTime: newTaskEndTime || null,
      completed: false,
      createdAt: new Date().toISOString()
    }
    
    setTasks(prev => [...prev, newTask])
    setNewTaskTitle('')
    setNewTaskDesc('')
    setNewTaskPriority('baja')
    setNewTaskDate('')
    setNewTaskStartTime('')
    setNewTaskEndTime('')
    setShowModal(false)
    showNotification('✅ Tarea creada exitosamente', 'success')
  }
  
  // Eliminar tarea
  const confirmarEliminarTarea = (id) => {
    setDeleteModalTask(id)
  }
  
  const eliminarTarea = () => {
    if (!deleteModalTask) return
    
    setTasks(prev => prev.filter(t => t.id !== deleteModalTask))
    setDeleteModalTask(null)
    showNotification('✅ Tarea eliminada exitosamente', 'success')
  }
  
  const cancelarEliminarTarea = () => {
    setDeleteModalTask(null)
  }
  
  // Completar/descompletar tarea
  const completarTarea = (task) => {
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, completed: !t.completed } : t
    ))
    if (!task.completed) {
      showNotification('🎉 ¡Tarea completada!', 'success')
    }
  }
  
  // Iniciar edición
  const iniciarEditar = (task) => {
    setEditingTask(task.id)
    setEditTitle(task.title)
    setEditDesc(task.description || '')
    setEditPriority(task.priority || 'baja')
    setEditDate(task.date || '')
    setEditStartTime(task.startTime || '')
    setEditEndTime(task.endTime || '')
  }
  
  // Guardar edición
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
    setEditTitle('')
    setEditDesc('')
    setEditPriority('baja')
    setEditDate('')
    setEditStartTime('')
    setEditEndTime('')
    showNotification('✅ Tarea actualizada exitosamente', 'success')
  }
  
  // Cancelar edición
  const cancelarEdicion = () => {
    setEditingTask(null)
    setEditTitle('')
    setEditDesc('')
    setEditPriority('baja')
    setEditDate('')
    setEditStartTime('')
    setEditEndTime('')
  }
  
  // Seleccionar fecha del calendario
  const handleDateSelect = (date) => {
    if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
      setSelectedDate(null)
    } else {
      setSelectedDate(date)
    }
  }
  
  const clearDateFilter = () => {
    setSelectedDate(null)
  }
  
  // Obtener nombre de la lista actual
  const listaActual = lists.find(l => l.id === selectedList)
  
  // Obtener tiempo restante para una tarea
  const getTimeInfo = (task) => {
    if (!task.date || !task.endTime || task.completed) return null
    return formatTimeRemaining(task.date, task.endTime)
  }
  
  return (
    <>
      {/* Sistema de Notificaciones Mejorado */}
      <EnhancedNotificationSystem 
        tasks={tasks}
        onTaskClick={(task) => {
          const taskElement = document.querySelector(`[data-task-id="${task.id}"]`)
          if (taskElement) {
            taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            taskElement.classList.add('highlight-task')
            setTimeout(() => taskElement.classList.remove('highlight-task'), 2000)
          }
        }}
      />
      
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
        
        {/* Sección de Calendario */}
        <div className="calendar-sidebar-section">
          <button 
            className={`calendar-toggle-btn ${showCalendar ? 'active' : ''}`}
            onClick={() => setShowCalendar(!showCalendar)}
          >
            📅 {showCalendar ? 'Ocultar Calendario' : 'Ver Calendario'}
          </button>
        </div>
        
        {/* Sección de Reportes */}
        <div className="reports-sidebar-section">
          <button 
            className="report-btn"
            onClick={() => setShowReport(true)}
          >
            📊 Reporte de Incumplimientos
            {stats.incumplidas > 0 && (
              <span className="violation-badge">{stats.incumplidas}</span>
            )}
          </button>
        </div>
        
        {/* Widget de reloj */}
        <div className="clock-widget">
          <div className="clock-time">
            {liveClock.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="clock-date">
            {liveClock.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
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
              <button 
                className={`filtro-btn ${filter === 'vencidas' ? 'active' : ''}`}
                onClick={() => setFilter('vencidas')}
              >
                ⏰ Vencidas
              </button>
              <button 
                className={`filtro-btn ${filter === 'urgentes' ? 'active' : ''}`}
                onClick={() => setFilter('urgentes')}
              >
                ⚡ Urgentes
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
              {stats.conFecha > 0 && (
                <div className="stat-badge scheduled">
                  📅 {stats.conFecha}
                </div>
              )}
              {stats.urgentes > 0 && (
                <div className="stat-badge urgent">
                  ⚡ {stats.urgentes}
                </div>
              )}
              {stats.incumplidas > 0 && (
                <div className="stat-badge violated">
                  ⏰ {stats.incumplidas}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Calendario Modal */}
        {showCalendar && (
          <EnhancedCalendar 
            tasks={tasks} 
            onSelectDate={handleDateSelect}
            selectedDate={selectedDate}
            onClose={() => setShowCalendar(false)}
          />
        )}
        
        {/* Lista de tareas */}
        <ul id="listatareas">
          {filteredTasks.length === 0 ? (
            <li className="sin-tareas">
              <span>📭</span>
              {selectedDate 
                ? 'No hay tareas programadas para este día'
                : filter === 'todas' 
                ? 'No hay tareas en esta lista' 
                : filter === 'pendientes'
                ? '¡Todas las tareas están completadas!'
                : filter === 'completadas'
                ? 'No hay tareas completadas aún'
                : filter === 'vencidas'
                ? '¡No hay tareas vencidas!'
                : filter === 'urgentes'
                ? '¡No hay tareas urgentes!'
                : 'No hay tareas'}
            </li>
          ) : (
            filteredTasks.map(task => {
              const timeInfo = getTimeInfo(task)
              const isOverdue = isTaskOverdue(task)
              const isUrgent = isTaskUrgent(task)
              
              return (
                <li 
                  key={task.id}
                  data-task-id={task.id}
                  className={`tarea-item ${task.completed ? 'completada' : ''} ${isOverdue ? 'overdue' : ''} ${isUrgent ? 'urgent' : ''}`}
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
                      
                      {/* Campos de fecha y hora en edición */}
                      <div className="datetime-inputs">
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="date-input"
                        />
                        <input
                          type="time"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          className="time-input"
                          placeholder="Inicio"
                        />
                        <span className="time-separator">-</span>
                        <input
                          type="time"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          className="time-input"
                          placeholder="Fin"
                        />
                      </div>
                      {(editStartTime || editEndTime) && editStartTime && editEndTime && !isValidTimeRange(editStartTime, editEndTime) && (
                        <span className="time-error">⚠️ La hora fin debe ser posterior</span>
                      )}
                      
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
                          {isOverdue && (
                            <span className="overdue-badge">⏰ VENCIDA</span>
                          )}
                          {isUrgent && !isOverdue && (
                            <span className="urgent-badge">⚡ URGENTE</span>
                          )}
                        </span>
                        {task.description && (
                          <span className="tarea-descripcion">{task.description}</span>
                        )}
                        {/* Mostrar fecha y hora si existen */}
                        {(task.date || task.startTime || task.endTime) && (
                          <span className="tarea-datetime">
                            📅 {task.date ? formatDate(task.date) : 'Sin fecha'}
                            {(task.startTime || task.endTime) && (
                              <span className="time-range">
                                🕐 {formatTime(task.startTime)} - {formatTime(task.endTime)}
                              </span>
                            )}
                          </span>
                        )}
                        {/* Mostrar tiempo restante */}
                        {timeInfo && !task.completed && (
                          <span className={`time-remaining-badge ${timeInfo.overdue ? 'overdue' : timeInfo.urgent ? 'urgent' : ''}`}>
                            {timeInfo.overdue ? '⏰ ' : '⏳ '}
                            {timeInfo.text}
                          </span>
                        )}
                      </div>
                      <div className="botones-container">
                        <button 
                          className={`boton-completar ${task.completed ? 'completado' : ''}`}
                          onClick={() => completarTarea(task)}
                          title={task.completed ? 'Desmarcar' : 'Completar'}
                        >
                          {task.completed ? '↩️' : '✓'}
                        </button>
                        <button 
                          className="boton-editar"
                          onClick={() => iniciarEditar(task)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button 
                          className="boton-eliminar"
                          onClick={() => confirmarEliminarTarea(task.id)}
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </li>
              )
            })
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
              
              {/* Campos de fecha y hora */}
              <div className="datetime-inputs">
                <label className="datetime-label">📅 Fecha:</label>
                <input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="date-input"
                />
              </div>
              <div className="datetime-inputs">
                <label className="datetime-label">🕐 Horario:</label>
                <input
                  type="time"
                  value={newTaskStartTime}
                  onChange={(e) => setNewTaskStartTime(e.target.value)}
                  className="time-input"
                  placeholder="Inicio"
                />
                <span className="time-separator">-</span>
                <input
                  type="time"
                  value={newTaskEndTime}
                  onChange={(e) => setNewTaskEndTime(e.target.value)}
                  className="time-input"
                  placeholder="Fin"
                />
              </div>
              {(newTaskStartTime || newTaskEndTime) && newTaskStartTime && newTaskEndTime && !isValidTimeRange(newTaskStartTime, newTaskEndTime) && (
                <span className="time-error">⚠️ La hora de fin debe ser posterior a la hora de inicio</span>
              )}
              
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
        
        {/* Modal de Reporte de Incumplimientos */}
        {showReport && (
          <EnhancedReportModal 
            tasks={tasks} 
            onClose={() => setShowReport(false)} 
          />
        )}
        
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
