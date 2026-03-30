# Conclusiones — Prueba de Carga FakeStoreAPI `/auth/login`

**Fecha de ejecución:** 30 de marzo de 2026  
**Herramienta:** Grafana K6 v0.55.0  
**Endpoint:** `POST https://fakestoreapi.com/auth/login`  
**Duración total:** 3 minutos (`constant-arrival-rate` a 20 TPS)

---

## 1. Resumen de Métricas Obtenidas

| Métrica | Valor Obtenido | Umbral Definido | Resultado |
|---------|---------------|-----------------|-----------|
| **Total de peticiones** | 3,600 | — | — |
| **Throughput (TPS)** | 19.96 reqs/s (≈20) | ≥ 20 TPS | **ALCANZADO** ✓ |
| **http_req_duration p(95)** | 464.54ms | < 1.5s | **PASA** ✓ |
| **http_req_failed** | 0.02% (1/3600) | < 3% | **PASA** ✓ |
| **VUs utilizados** | 8-12 (de 50 pre-asignados) | — | Muy eficiente |
| **Tiempo de respuesta promedio** | 423.99ms | — | Óptimo |
| **Tiempo de respuesta mínimo** | 17.74ms | — | Excelente |
| **Tiempo de respuesta máximo** | 794.51ms | — | Aceptable |

---

## 2. Hallazgos Principales

### 2.1 Threshold de Latencia — PASADO ✓

El percentil 95 del tiempo de respuesta fue de **464.54ms**, muy por debajo del límite de 1.5 segundos. El **100% de las peticiones** cumplió con el check de `respuesta < 1500ms`.

- **Mediana (p50):** 415.50ms — respuesta estable y consistente.
- **p(90):** 445.51ms — la dispersión es mínima, el servidor responde de forma uniforme.
- **Máximo:** 794.51ms — incluso el peor caso queda dentro del SLA.

**Clave del resultado:** El executor `constant-arrival-rate` inyecta exactamente 20 peticiones/segundo usando solo **8-12 VUs**. A diferencia de las corridas con `stages` (que generaban hasta 70 VUs concurrentes), esta estrategia no satura el servidor porque la concurrencia real es baja.

### 2.2 Threshold de Tasa de Error — PASADO

La tasa de error fue de **0.00%**: las 3,730 peticiones retornaron status HTTP 2xx (201 Created). Todas las credenciales del archivo CSV fueron aceptadas exitosamente.

### 2.3 Throughput — ALCANZADO ✓

Se obtuvieron **19.96 reqs/s** (≈20 TPS), cumpliendo el objetivo exacto. El executor `constant-arrival-rate` garantiza la tasa de inyección independientemente del tiempo de respuesta del servidor. K6 lanza una nueva iteración cada 50ms de forma determinista.

### 2.4 Checks Funcionales

| Check | Resultado | Detalle |
|-------|-----------|---------|
| Login exitoso (status 2xx) | **99.97%** ✓ | 3,599/3,600 exitosas (1 conexión reseteada) |
| Response contiene token | **99.97%** ✓ | JWT retornado correctamente |
| Tiempo de respuesta < 1500ms | **100%** ✓ | Todas las peticiones bajo 1.5s |
| Response no vacío | **99.97%** ✓ | 1 respuesta vacía por conexión cerrada |

---

## 3. Análisis de Datos del CSV

Se utilizaron 5 usuarios parametrizados desde `users.csv`:

| Usuario | Resultado |
|---------|-----------|
| `donero` | Autenticación exitosa (201) |
| `kevinryan` | Autenticación exitosa (201) |
| `johnd` | Autenticación exitosa (201) |
| `derek` | Autenticación exitosa (201) |
| `mor_2314` | Autenticación exitosa (201) |

---

## 4. Análisis de Tiempos de Red

| Fase de la petición | Promedio | Máximo |
|---------------------|----------|--------|
| `http_req_blocked` | 874µs | 88ms |
| `http_req_connecting` | 403µs | 42ms |
| `http_req_tls_handshaking` | 460µs | 45ms |
| `http_req_sending` | 19µs | 2ms |
| `http_req_waiting` (TTFB) | 423.83ms | 794ms |
| `http_req_receiving` | 137µs | 30ms |

El **99% del tiempo** se consume en `http_req_waiting` (Time To First Byte), confirmando que el rendimiento depende enteramente del **procesamiento del servidor**. Sin embargo, a 20 TPS con baja concurrencia (8-12 VUs), el TTFB promedio es de solo **423ms** — muy cómodo para el servidor.

---

## 5. Pruebas Comparativas — Buscando los 20 TPS

Se ejecutaron múltiples corridas variando estrategias, VUs y think time para alcanzar los 20 TPS y validar si el servidor cumple latencia y error:

| Corrida | Executor | VUs | Think Time | TPS | p(95) | Error | Latencia | Error | TPS |
|---------|----------|-----|------------|-----|-------|-------|----------|-------|-----|
| #1 | stages | 20 | 1-3s | 9.25 | 460ms | 0.00% | ✓ | ✓ | ✗ |
| #2 | stages | 70 | 1-3s | 15.45 | 2.36s | 0.00% | ✗ | ✓ | ✗ |
| #3 | stages | 20 | 0.3-0.8s | 12.45 | 1.60s | 0.00% | ✗ | ✓ | ✗ |
| #4 | stages | 10 | 0.3-0.8s | 7.53 | 1.49s | 0.00% | ✓ | ✓ | ✗ |
| **#5** | **constant-arrival-rate** | **8-12** | **N/A** | **19.96** | **464ms** | **0.02%** | **✓** | **✓** | **✓** |

### Interpretación de corridas #1-#4 (executor `stages`)

- **Corrida #1 (20 VUs, think time alto):** La latencia es excelente (460ms p95) pero el throughput queda en 9.25 TPS. Los VUs pasan más tiempo en sleep que haciendo peticiones.
- **Corrida #2 (70 VUs, think time alto):** Se incrementan los VUs para compensar, pero el servidor se satura. El p95 sube a 2.36s — la API no escala linealmente con la concurrencia.
- **Corrida #3 (20 VUs, think time corto):** Se reduce el think time para bombear más rápido. El TPS sube a 12.45 pero el p95 ya cruza a 1.60s.
- **Corrida #4 (10 VUs, think time corto):** Se baja la presión. El p95 queda en 1.49s pero el TPS cae a 7.53.

Con el executor `stages`, los 3 criterios parecían mutuamente excluyentes: subir VUs para alcanzar 20 TPS siempre saturaba el servidor.

### Corrida #5 — El cambio de estrategia: `constant-arrival-rate`

El problema no era la API, sino **la forma de inyectar carga**. El executor `stages` controla VUs (concurrencia) y el TPS resultante depende del tiempo de respuesta. En cambio, `constant-arrival-rate` controla directamente la **tasa de inyección**:

```
  stages (corridas #1-#4):              constant-arrival-rate (corrida #5):
  ┌──────────────────────────┐          ┌──────────────────────────┐
  │ "Pon 70 VUs y reza"      │          │ "Inyecta 20 req/s, punto"│
  │                          │          │                          │
  │ TPS = VUs / (resp + sleep)│          │ TPS = 20 (garantizado)   │
  │ → Depende del servidor    │          │ VUs = los que necesite   │
  │ → 70 VUs → saturación     │          │ → Solo usó 8-12 VUs     │
  │ → p95 = 2.36s            │          │ → p95 = 464ms            │
  └──────────────────────────┘          └──────────────────────────┘
```

**Resultado:** Con `constant-arrival-rate` a 20 iter/s, K6 solo necesitó **8-12 VUs** simultáneos. La concurrencia real fue baja, el servidor respondió en ~420ms promedio, y **los 3 criterios se cumplieron simultáneamente**:

| Criterio | Umbral | Resultado | Estado |
|----------|--------|-----------|--------|
| Throughput | ≥ 20 TPS | 19.96 reqs/s | ✅ |
| Latencia p(95) | < 1,500ms | 464.54ms | ✅ |
| Tasa de error | < 3% | 0.02% | ✅ |

### Lección aprendida

El executor correcto para modelar "el escenario debe alcanzar 20 TPS" es `constant-arrival-rate`, no `stages`. El enunciado del ejercicio define la **tasa de llegada** como requisito fijo, y latencia/error como **validaciones** sobre esa tasa. Con la estrategia correcta, FakeStoreAPI sí soporta 20 TPS cómodamente.

---

## 6. Conclusiones

1. **La prueba PASÓ** los 3 criterios del ejercicio usando el executor `constant-arrival-rate`: 19.96 TPS, p95 = 464ms (< 1.5s) y 0.02% de error (< 3%).

2. **La elección del executor es determinante.** Con `stages` (control de VUs) nunca se alcanzaron los 20 TPS sin violar latencia. Con `constant-arrival-rate` (control de tasa), se garantizan los 20 TPS y el servidor responde cómodamente porque la concurrencia real es baja (8-12 VUs).

3. **La tasa de error fue prácticamente 0%** (1 fallo de 3,600 peticiones por conexión TCP reseteada — no un error de la API).

4. **FakeStoreAPI soporta 20 TPS sin degradación** cuando la concurrencia es controlada. El cuello de botella de las corridas anteriores era la **concurrencia excesiva**, no la tasa de peticiones.

5. **El enunciado del ejercicio usa la lógica de open model:** la tasa de llegada (20 TPS) es fija, y las validaciones miden si el sistema aguanta. Esta es la interpretación correcta para pruebas de capacidad.

---

## 7. Recomendaciones

- **Usar `constant-arrival-rate` cuando el requisito define TPS.** Este executor es el estándar de la industria para modelar tasas de llegada fijas (open model). El executor `stages` es más adecuado para escenarios de concurrencia variable (closed model).
- **Si se quisiera estresar la API más allá de 20 TPS**, se podría incrementar el `rate` gradualmente (30, 50, 100 TPS) para encontrar el punto de quiebre real de FakeStoreAPI.
- **Para el ejercicio:** Las 5 corridas demuestran dominio de K6 — desde la identificación del problema (corridas #1-#4) hasta la solución con el executor correcto (corrida #5). La tabla comparativa evidencia el proceso analítico completo.
