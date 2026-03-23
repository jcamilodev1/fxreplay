# 🚀 Mejoras Propuestas para FXReplay

A continuación se detallan las mejoras estratégicas recomendadas para optimizar el rendimiento y la experiencia del usuario de la plataforma:

---

### 💾 1. Caché Local Persistente (IndexedDB)
*   **Problema actual**: El rendimiento en RAM se resetea al cerrar o refrescar la pestaña del navegador.
*   **Propuesta**: Usar `IndexedDB` (vía `Dexie.js` o `idb`) para guardar los bloques `.json` descargados.
*   **Resultado**: Cargas instantáneas (0.0s de red) al volver a visualizar pares ya visitados y ahorro de ancho de banda del servidor.

### ☁️ 2. Persistencia de Dibujos en Base de Datos (Supabase)
*   **Problema actual**: Los dibujos (S/R, Fibonacci) se guardan en el estado del componente o `localStorage`.
*   **Propuesta**: Añadir una tabla `drawings` en Supabase vinculada al usuario y al símbolo.
*   **Resultado**: Visualización unificada del análisis técnico en múltiples dispositivos (Móvil, Portátil, PC).

### ⏱️ 3. Modo Multi-Timeframe Sincronizado (Side-by-Side)
*   **Problema actual**: El trader debe cambiar de pestaña o TF para ver la estructura.
*   **Propuesta**: Permitir 2 gráficos en pantalla vinculados por el *timestamp* del Replay.
*   **Resultado**: Facilita el análisis "Top-Down" (Estructura en M15 y ejecución en M1) simultáneo.

### 📈 4. Analíticas y Estadísticas de Backtest
*   **Problema actual**: El registro de órdenes es sólo un historial básico agrupado.
*   **Propuesta**: Algoritmo que calcule métricas clave:
    *   *Sharpe Ratio* y *Profit Factor*.
    *   *Max Drawdown* (mayor caída % de la cuenta).
    *   *Desglose Temporal*: Win-rate por sesión (Londres, Nueva York, etc).
*   **Resultado**: Permite al usuario estudiar matemáticamente su rentabilidad.

### ⏪ 5. Rebobinado Inteligente (Undo/Redo en Replay)
*   **Problema actual**: El avance es fluido pero el retroceso (`jumpTo`) resetea métricas para recalcular historial.
*   **Propuesta**: Gestión de histórico de operaciones como pila (*Stack*) para revertir acciones vela-a-vela limpiamente.
*   **Resultado**: Fluidez máxima para corregir errores al momento o repasar entradas fallidas.
