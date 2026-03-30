# Informe de Resultados — Prueba de Rendimiento

**Fecha de ejecución:** 24 de abril de 2025  
**Endpoint evaluado:** App Transaction Balance  
**Herramienta utilizada:** k6  

---

## 1. Resumen Ejecutivo

Se ejecutó una prueba de carga sobre el servicio **App Transaction Balance** con un máximo de **140 usuarios virtuales (VUs)** concurrentes, generando un total de **276,650 peticiones** durante la duración de la prueba. El sistema alcanzó una tasa de éxito del **97.55%**, con un **2.44% de peticiones fallidas** (6,759 solicitudes).

---

## 2. Métricas Clave

| Métrica | Valor |
|---|---|
| Total de peticiones | 276,650 |
| Tasa de peticiones | 73.18 req/s (promedio) |
| Peticiones exitosas | 269,891 (97.55%) |
| Peticiones fallidas | 6,759 (2.44%) |
| Usuarios virtuales máximos | 140 |
| Datos recibidos | 842 MB (223 kB/s) |
| Datos enviados | 588 MB (156 kB/s) |

### 2.1 Tiempos de Respuesta (`http_req_duration`)

| Estadística | Valor |
|---|---|
| Promedio | 861.68 ms |
| Mediana (p50) | 613.42 ms |
| Mínimo | 191.86 ms |
| Máximo | 29.93 s |
| Percentil 90 (p90) | 1.28 s |
| Percentil 95 (p95) | 1.57 s |

> Para respuestas exitosas (`expected_response:true`), el promedio baja a **735.84 ms** con un p95 de **1.42 s**.

### 2.2 Duración de Iteración

| Estadística | Valor |
|---|---|
| Promedio | 1.86 s |
| Mediana | 1.61 s |
| Máximo | 30.94 s |
| p(90) | 2.29 s |
| p(95) | 2.57 s |

### 2.3 Detalle de Errores por Etapa

| Etapa | Tipo de Error | Cantidad | Tasa |
|---|---|---|---|
| Stage 0 | HTTP 5xx | 1 | 0.000265/s |
| Stage 1 | HTTP 4xx | 769 | 0.203409/s |
| Stage 1 | HTTP 5xx | 5,987 | 1.583625/s |
| Stage 2 | HTTP 5xx | 2 | 0.000529/s |

---

## 3. Análisis del Diagrama VUs vs. Peticiones por Segundo

El gráfico de monitoreo muestra la relación entre los **usuarios virtuales (VUs)** y el **número de peticiones por segundo (http_reqs/s)** a lo largo de la prueba:

- **Fase de ramp-up (~01:35 – 01:55):** Los VUs escalan progresivamente hasta alcanzar el pico de **140 VUs**. Durante esta fase, la tasa de peticiones fluctúa entre **50 y 100 req/s**, con caídas notables alrededor de las 01:50, lo que sugiere que el sistema empezó a experimentar presión antes de llegar a la carga máxima.

- **Fase de carga máxima (~01:55 – 02:05):** Con **140 VUs** activos y una tasa registrada de **~82.6 req/s** (captura a las 02:02:00), la tasa de peticiones no escala proporcionalmente al número de usuarios. Esto indica que el servidor comenzó a saturarse, incrementando los tiempos de respuesta y reduciendo el throughput efectivo.

- **Fase de sostenimiento y ramp-down (~02:05 – 02:35):** Se observan **caídas abruptas y recurrentes** tanto en VUs como en peticiones por segundo. Estas caídas a valores cercanos a 0 son consistentes con los **5,987 errores HTTP 5xx** concentrados en el Stage 1, señalando episodios de indisponibilidad o degradación severa del servicio bajo carga sostenida.

- **Correlación inversa bajo estrés:** Mientras los VUs se mantienen altos, el throughput (req/s) decrece, evidenciando un cuello de botella en el servidor que impide atender peticiones de forma eficiente cuando la concurrencia supera cierto umbral.

---

## 4. Hallazgos

1. **Degradación bajo carga alta:** El tiempo de respuesta máximo alcanzó **29.93 segundos**, lo cual es inaceptable para una transacción de consulta de balance. El promedio de 861 ms y el p95 de 1.57 s también son elevados.

2. **Concentración de errores en Stage 1:** El **98.9% de los errores** (6,756 de 6,759) se produjeron en el Stage 1, con **5,987 errores HTTP 5xx** (errores del servidor) y **769 errores HTTP 4xx** (errores de cliente). Esto indica que el sistema colapsa bajo la fase de mayor carga.

3. **Errores HTTP 5xx dominantes:** Los errores de servidor (5xx) representan el **88.6%** del total de fallos, sugiriendo problemas de capacidad, timeouts o excepciones no controladas en el backend.

4. **Throughput no escala con los VUs:** A pesar de tener 140 VUs, la tasa efectiva promedio fue de **73.18 req/s**, y en el pico de carga se registró solo **82.6 req/s**. Esto revela un techo de rendimiento del sistema.

5. **Caídas intermitentes del servicio:** El diagrama de monitoreo muestra múltiples caídas abruptas del throughput a valores cercanos a cero, indicando momentos de **indisponibilidad parcial o total** del servicio.

6. **Latencia del servidor (http_req_waiting):** El tiempo de espera del servidor promedio fue de **861.21 ms**, prácticamente igual al `http_req_duration`, confirmando que el cuello de botella está en el **procesamiento del backend** y no en la red.

---

## 5. Conclusiones

1. El servicio **App Transaction Balance** logra una tasa de éxito del 97.55%, pero esta cifra es insuficiente para un servicio transaccional crítico donde se espera un SLA superior al 99.5%.

2. El sistema presenta un **techo de rendimiento** alrededor de los 80-85 req/s, independientemente de la cantidad de usuarios concurrentes. Al superar este umbral, los tiempos de respuesta se degradan drásticamente y comienzan a producirse errores 5xx en cascada.

3. La **estabilidad del servicio se compromete bajo carga sostenida**, como lo evidencian las caídas intermitentes observadas en el diagrama de monitoreo y la concentración masiva de errores 5xx en el Stage 1.

4. El cuello de botella se encuentra en el **backend del servidor** (procesamiento/base de datos), no en la capa de red ni en la negociación TLS, dado que los tiempos de conexión y handshake son despreciables frente al tiempo de espera del servidor.

---

## 6. Recomendaciones

1. **Investigar y optimizar el backend:** Analizar los logs del servidor durante los picos de carga para identificar las causas raíz de los errores 5xx (timeouts de base de datos, agotamiento del pool de conexiones, memory leaks, etc.).

2. **Implementar escalado horizontal o autoescalado:** Configurar mecanismos que permitan agregar instancias del servicio automáticamente cuando la carga supere cierto umbral (ej. > 60 req/s).

3. **Establecer rate limiting y circuit breakers:** Proteger el servicio con mecanismos de protección que eviten la degradación total del sistema bajo sobrecarga, devolviendo respuestas controladas en lugar de errores 5xx.

4. **Optimizar consultas y acceso a datos:** Dado que el tiempo de espera del servidor es el componente dominante de la latencia, revisar las consultas a base de datos, implementar caché donde sea posible y optimizar el procesamiento de transacciones.

5. **Revisar los errores HTTP 4xx del Stage 1:** Los 769 errores 4xx podrían indicar problemas de validación bajo carga, tokens expirados o datos de prueba inadecuados. Se recomienda analizar las respuestas para descartar falsos positivos en la prueba.

6. **Definir y validar SLAs:** Establecer umbrales claros de rendimiento (ej. p95 < 500 ms, tasa de error < 0.5%, disponibilidad > 99.9%) y ejecutar pruebas de regresión periódicas para validar su cumplimiento.

7. **Ejecutar pruebas de estrés incrementales:** Realizar pruebas con rampas graduales más finas (ej. de 10 en 10 VUs) para identificar el punto exacto de quiebre del sistema y dimensionar la capacidad necesaria.