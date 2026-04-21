# Sistema de Notificaciones - Cenit App

## Estado: ✅ Mejorado y Robusto

---

## Nuevo Sistema de Notificaciones (Versión Mejorada)

El sistema ha sido reescrito para mayor confiabilidad y funcionalidad similar a las grandes apps.

### Mejoras Realizadas:

1. **Canales de notificaciones separados**:
   - `Cenit Tareas`: Notificaciones normales
   - `Cenit Urgentes`: Notificaciones de alta prioridad

2. **Importancia máxima** (importance: 5 - MAX)
   - Sonarán incluso en modo "No molestar"
   - Prioridad más alta en la bandeja de notificaciones

3. **Permitir mientras inactivo** (`allowWhileIdle: true`)
   - Las notificaciones se muestran incluso con la pantalla apagada
   - Mejor funcionamiento en segundo plano

4. **Wake Lock** (mantiene el dispositivo activo para notificaciones)
   - Previene que Android cierre el proceso

5. **Múltiples recordatorios**:
   - 24 horas antes (para tareas al día siguiente)
   - 1 hora antes
   - 5 minutos antes
   - Hora exacta

6. **Notificaciones de alta prioridad**:
   - Las tareas con prioridad "alta" usan un canal separado
   - Configuración más agresivo para asegurar entrega

7. **Listeners de eventos**:
   - Detecta cuando el usuario recibe o interactúa con notificaciones

---

## Recordatorios por Prioridad:

| Tiempo Restante | Notificación Normal | Alta Prioridad |
|---------------|----------------|-------------|
| 24 horas antes | 📅 [tarea] programada para mañana | 📅🔴 [tarea] programada para mañana |
| 1 hora antes  | 📅 Recordatorio: [tarea] | 📅🔴 Recordatorio: [tarea] |
| 5 min antes  | ⏰ [tarea] | ⏰🔴 [tarea] |
| Hora exacta  | ⏰ [tarea] | ⏰🔴 [tarea] |

---

## Configuración en el Teléfono (IMPORTANTE)

### 1. Permisos de app:
- **Ajustes > Apps > Cenit > Permisos > Notificaciones**: Permitir
- **Ajustes > Apps > Cenit > Permisos > Alarmas**: Permitir

### 2. Sin restricciones de batería:
- **Ajustes > Apps > Cenit > Batería > Sin restricciones** (Ocludedo)
- **Ajustes > Batería > Optimización de batería > Cenit**: No optimizar

### 3. Inicio automático (requerido en algunas marcas):
- **Ajustes > Aplicaciones > Inicio automático > Cenit**: Activar

### 4. Permisos especiales:
- **Ajustes > Apps > Cenit > Permisos > Agregar a confianza**

### 5. En Samsung:
- **Ajustes > Apps > Cenit > Batería > Activity optimization**: Desactivar

### 6. En Xiaomi/MIUI:
- **Seguridad > Permisos > Autoinicio**: Activar
- **Seguridad > Batería > App > Cenit > Sin restricciones**

### 7. En Huawei/EMUI:
- **Ajustes > Batería > Inicio automático**: Administrar manualmente > Activar
- **Ajustes > Apps > Cenit > Lanzar > Ejecutar en segundo plano**: Siempre mostrar

### 8. En OnePlus/OxygenOS:
- **Ajustes > Batería > Optimización de batería > Cenit**: No optimizar
- **Ajustes > Apps > Administrar aplicaciones > Cenit > Auto-launch**: Activar

---

## Construcción

```bash
cd client
npm run build
```

Para construir la app Android:
```bash
npx cap sync android
npx cap run android
```

---

## Solución de Problemas

### Si las notificaciones no funcionan:

1. **Verificar permisos en Ajustes**:
   - Ajustes > Apps > Cenit > Permisos
   - Asegúrate que Notificaciones esté permitido

2. **Verificar canal de notificaciones**:
   - Busca en logs: "Sistema de notificaciones inicializado"

3. **Probar con tarea de alta prioridad**:
   - Crea una tarea con prioridad "alta"
   - Estas tienen configuración más robusta

4. **Verificar fecha y hora**:
   - La tarea debe tener fecha y hora futuras
   - Mínimo 5 minutos en el futuro

5. **Verificar que no esté completada**:
   - Las tareas completadas no suenan

### Para probar:
1. Crea una tarea con fecha y hora futura (5-10 minutos)
2. Pon prioridad "alta"
3. Espera a que llegue la notificación
4. Verifica que suene y muestre el título de la tarea

### Notas importantes:

- Las notificaciones locales funcionan mejor cuando la app está al menos en segundo plano
- Android puede limitar notificaciones si la batería está muy baja
- Desactivar "No molestar" en el teléfono
- Algunas marcas tienen restricciones muy agresivas (ver arriba)

---

## Diferencia con Notificaciones Push (Firebase)

El sistema actual usa **notificaciones locales programadas**, que funcionan:
- ✅ Cuando la app está ABIERTA
- ✅ Cuando la app está en segundo plano
- ⚠️ Limitado cuando la app está CERRADA (varies by device)

Para notificaciones como Facebook/Instagram (que funcionan con app cerrada),
se requeriría Firebase Cloud Messaging (FCM) con un servidor backend.