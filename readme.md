# Prueba de Carga — FakeStoreAPI `/auth/login`

## Descripción

Script de prueba de rendimiento con **Grafana K6** que evalúa el endpoint de autenticación de [FakeStoreAPI](https://fakestoreapi.com/). Se parametrizan las credenciales desde un archivo CSV y se valida el cumplimiento de SLAs de latencia y tasa de error.

---

## Versiones Requeridas

| Tecnología | Versión Mínima | Verificación                |
|------------|----------------|-----------------------------|
| **K6**     | v0.50.0+       | `k6 version`                |
| **Git**    | v2.40+         | `git --version`             |
| **SO**     | Windows 10/11, macOS 12+, Linux (Ubuntu 22.04+) | — |

---

## Estructura del Proyecto

```
K6_TEST_FAKESTOREAPI/
├── README.md                       # Instrucciones de ejecución (este archivo)
├── data/
│   └── users.csv                   # Credenciales parametrizadas (5 usuarios)
├── tests/
│   ├── login_load_test.js          # Script principal de carga K6
│   ├── test_users.js               # Validación manual de usuarios
│   ├── test_csv_users.js           # Validación de usuarios desde CSV
│   └── test_debug.js               # Test de debug / smoke test
├── results/
│   ├── textSummary.txt             # Resumen de métricas (generado tras ejecución)
│   └── summary.json                # Datos crudos en JSON (generado tras ejecución)
└── docs/
    ├── conclusiones.md             # Hallazgos y conclusiones del Ejercicio 1
    └── informeResultados.md        # Análisis de resultados del Ejercicio 2
```

---

## Instalación de K6

### Windows (Chocolatey)
```powershell
choco install k6
```

### Windows (winget)
```powershell
winget install k6 --source winget
```

### macOS (Homebrew)
```bash
brew install k6
```

### Linux (Debian/Ubuntu)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### Verificar instalación
```bash
k6 version
```

---

## Pasos para Ejecutar

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd K6_TEST_FAKESTOREAPI
```

### 2. Verificar que el CSV esté presente
```bash
cat data/users.csv
```
Debe mostrar:
```
user,passwd
donero,ewedon
kevinryan,kev02937@
johnd,m38rmF$
derek,jklg*_56
mor_2314,83r5^_
```

### 3. Ejecutar la prueba
```bash
k6 run tests/login_load_test.js
```

### 4. Revisar resultados
Al finalizar, se generan automáticamente en `results/`:
- `results/textSummary.txt` — resumen legible en consola
- `results/summary.json` — métricas completas en JSON

---

## Configuración del Escenario

Se utiliza el executor **`constant-arrival-rate`** (open model) para inyectar exactamente 20 peticiones por segundo, independientemente del tiempo de respuesta del servidor.

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| **Executor** | `constant-arrival-rate` | Tasa de llegada fija (open model) |
| **Rate** | 20 iter/s | 20 peticiones por segundo garantizadas |
| **Duración** | 3 minutos | Tiempo total de la prueba |
| **VUs pre-asignados** | 50 | Pool inicial de usuarios virtuales |
| **VUs máximos** | 100 | Límite superior si se necesitan más VUs |

### Thresholds (SLAs)

| Métrica | Condición | Descripción |
|---------|-----------|-------------|
| `http_req_duration` | `p(95) < 1500ms` | El 95% de las peticiones debe responder en menos de 1.5s |
| `http_req_failed` | `rate < 0.03` | La tasa de error debe ser menor al 3% |

### Checks Funcionales

| Check | Validación |
|-------|------------|
| Login exitoso (status 2xx) | Status HTTP entre 200 y 299 |
| Response contiene token | El body JSON incluye un campo `token` |
| Tiempo de respuesta < 1500ms | Latencia individual menor a 1.5s |
| Response no vacío | El body de la respuesta no está vacío |

### Métricas Custom

| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `login_fail_rate` | Rate | Porcentaje de logins con status distinto a 200/201 |
| `login_duration` | Trend | Distribución de tiempos de respuesta del login |

---

## Datos de Prueba

Los datos se parametrizan desde `data/users.csv` usando `SharedArray` de `k6/data`. Cada VU selecciona un usuario por distribución round-robin (`__VU % users.length`).

| Usuario | Contraseña |
|---------|------------|
| donero | ewedon |
| kevinryan | kev02937@ |
| johnd | m38rmF$ |
| derek | jklg*_56 |
| mor_2314 | 83r5^_ |

---

## Solución de Problemas

| Problema | Solución |
|----------|----------|
| `SharedArray: file not found` | Verificar que `data/users.csv` existe y se ejecuta desde la raíz del proyecto |
| `connection reset by peer` | El servidor aplica rate limiting; reducir el `rate` en el escenario |
| `threshold crossed` | Revisar `textSummary.txt` para identificar qué SLA se incumple |
| `GOPROXY connection timed out` | Verificar conexión a internet |
