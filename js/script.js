// Variable global para rastrear la lista actual
let listaActual = 1;

// Función para cargar listas al iniciar
window.onload = function() {
    cargarListas();
    loadTasks();
};

// =================
// FUNCIONES DE LISTAS
// =================

// Cargar todas las listas
function cargarListas() {
    fetch('/api/lists')
        .then(res => res.json())
        .then(listas => {
            const contenedor = document.getElementById('contenedor-listas');
            contenedor.innerHTML = '';
            
            listas.forEach(lista => {
                const elementoLista = document.createElement('div');
                elementoLista.className = 'lista-item';
                elementoLista.dataset.id = lista.id;
                
                if (lista.id === listaActual) {
                    elementoLista.classList.add('lista-activa');
                }
                
                // Construir HTML de la lista
                let html = `
                    <div class="lista-contenido" style="border-left-color: ${lista.color}">
                        <span class="lista-nombre">${lista.name}</span>
                    </div>
                `;
                
                // Agregar botón de eliminar solo si no es la lista principal
                if (lista.id !== 1) {
                    html += `<button class="boton-eliminar-lista" data-id="${lista.id}">✕</button>`;
                }
                
                elementoLista.innerHTML = html;
                
                // Evento para seleccionar lista (click en el contenido)
                const contenido = elementoLista.querySelector('.lista-contenido');
                if (contenido) {
                    contenido.addEventListener('click', function(e) {
                        e.stopPropagation();
                        seleccionarLista(lista.id, lista.name);
                    });
                }
                
                // Evento para eliminar lista
                const botonEliminar = elementoLista.querySelector('.boton-eliminar-lista');
                if (botonEliminar) {
                    botonEliminar.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const id = parseInt(this.dataset.id);
                        eliminarLista(id);
                    });
                }
                
                contenedor.appendChild(elementoLista);
            });
        })
        .catch(err => console.error('Error cargando listas:', err));
}

// Crear una nueva lista
function crearLista() {
    const nombreInput = document.getElementById('nueva-lista');
    const colorInput = document.getElementById('color-lista');
    const nombre = nombreInput.value;
    const color = colorInput.value;
    
    if (!nombre || nombre.trim() === '') {
        alert('Por favor ingrese un nombre para la lista');
        return;
    }
    
    fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nombre, color: color })
    })
    .then(res => res.json())
    .then(lista => {
        nombreInput.value = '';
        cargarListas();
        seleccionarLista(lista.id, lista.name);
    })
    .catch(err => console.error('Error creando lista:', err));
}

// Seleccionar una lista
function seleccionarLista(id, nombre) {
    listaActual = id;
    
    // Actualizar clase activa en la UI
    document.querySelectorAll('.lista-item').forEach(item => {
        item.classList.remove('lista-activa');
        if (parseInt(item.dataset.id) === id) {
            item.classList.add('lista-activa');
        }
    });
    
    // Actualizar título
    document.getElementById('titulo-lista-actual').textContent = nombre;
    
    // Cargar tareas de esta lista
    loadTasks();
}

// Eliminar una lista
function eliminarLista(id) {
    if (id === 1) {
        alert('No se puede eliminar la lista principal');
        return;
    }
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta lista y todas sus tareas?')) {
        return;
    }
    
    fetch(`/api/lists/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => {
            // Si se eliminó la lista actual, cambiar a la lista principal
            if (listaActual === id) {
                listaActual = 1;
                document.getElementById('titulo-lista-actual').textContent = 'General';
            }
            cargarListas();
            loadTasks();
        })
        .catch(err => console.error('Error eliminando lista:', err));
}

// =================
// FUNCIONES DE TAREAS
// =================

// Cargar tareas de la lista actual
function loadTasks() {
    fetch(`/api/tasks?list_id=${listaActual}`)
        .then(res => res.json())
        .then(tasks => {
            const listaTareas = document.getElementById('listatareas');
            listaTareas.innerHTML = '';
            
            tasks.forEach(task => {
                displayTask(task);
            });
        })
        .catch(err => console.error('Error cargando tareas:', err));
}

// Agregar una nueva tarea
function agregarTarea() {
    const tituloInput = document.getElementById("nueva-tarea");
    const descripcionInput = document.getElementById("descripcion-tarea");
    const titulo = tituloInput.value;
    const descripcion = descripcionInput.value;
    
    if (titulo.trim() === "") {
        alert("Por favor ingrese un título para la tarea");
        return;
    }
    
    fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title: titulo, 
            description: descripcion,
            list_id: listaActual
        })
    })
    .then(res => res.json())
    .then(task => {
        tituloInput.value = "";
        descripcionInput.value = "";
        loadTasks();
    })
    .catch(err => console.error('Error agregando tarea:', err));
}

// Mostrar una tarea en el DOM
function displayTask(task) {
    let nuevaTarea = document.createElement("li");
    nuevaTarea.className = "tarea-item";
    nuevaTarea.dataset.id = task.id;
    
    if (task.completed) {
        nuevaTarea.classList.add("tarea-completada");
    }
    
    let contenidoTarea = `
        <div class="tarea-contenido">
            <strong class="tarea-titulo">${task.title}</strong>
            ${task.description ? `<p class="tarea-descripcion">${task.description}</p>` : ""}
        </div>
    `;
    nuevaTarea.innerHTML = contenidoTarea;
    
    // Contenedor para los botones de acción
    let botonesContainer = document.createElement("div");
    botonesContainer.className = "botones-container";
    
    // Botón para completar
    let botonCompletar = document.createElement("button");
    botonCompletar.textContent = task.completed ? "Deshacer" : "✓ Listo";
    botonCompletar.className = "boton-completar";
    botonCompletar.title = task.completed ? "Marcar como no completada" : "Marcar como completada";
    botonCompletar.onclick = function() {
        toggleComplete(task.id, !task.completed);
    };
    botonesContainer.appendChild(botonCompletar);
    
    // Botón para editar
    let botonEditar = document.createElement("button");
    botonEditar.textContent = "Editar";
    botonEditar.className = "boton-editar";
    botonEditar.title = "Editar tarea";
    botonEditar.onclick = function() {
        editarTarea(task.id, task.title, task.description, task.completed);
    };
    botonesContainer.appendChild(botonEditar);
    
    // Botón para eliminar
    let botonEliminar = document.createElement("button");
    botonEliminar.textContent = "Eliminar";
    botonEliminar.className = "boton-eliminar";
    botonEliminar.title = "Eliminar tarea";
    botonEliminar.onclick = function() {
        deleteTask(task.id);
    };
    botonesContainer.appendChild(botonEliminar);
    
    nuevaTarea.appendChild(botonesContainer);
    
    document.getElementById("listatareas").appendChild(nuevaTarea);
}

// Marcar/desmarcar tarea como completada
function toggleComplete(id, completed) {
    fetch(`/api/tasks/${id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: completed })
    })
    .then(res => res.json())
    .then(updatedTask => {
        loadTasks();
    })
    .catch(err => console.error('Error completando tarea:', err));
}

// Editar una tarea
function editarTarea(id, tituloActual, descripcionActual, completadoActual) {
    let nuevoTitulo = prompt("Editar título:", tituloActual);
    
    if (nuevoTitulo === null) return;
    
    if (nuevoTitulo.trim() === "") {
        alert("El título no puede estar vacío");
        return;
    }
    
    let nuevaDescripcion = prompt("Editar descripción:", descripcionActual || "");
    if (nuevaDescripcion === null) nuevaDescripcion = descripcionActual;
    
    fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title: nuevoTitulo, 
            description: nuevaDescripcion,
            completed: completadoActual,
            list_id: listaActual
        })
    })
    .then(res => res.json())
    .then(updatedTask => {
        loadTasks();
    })
    .catch(err => console.error('Error editando tarea:', err));
}

// Eliminar una tarea
function deleteTask(id) {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarea?")) {
        return;
    }
    
    fetch(`/api/tasks/${id}`, { method: 'DELETE' })
        .then(() => {
            loadTasks();
        })
        .catch(err => console.error('Error eliminando tarea:', err));
}
