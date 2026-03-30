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
K6_SCRIPT_FAKESTOREAPI/
├── script.js              # Script principal de K6
├── users.csv              # Credenciales parametrizadas (5 usuarios)
├── readme.md              # Instrucciones de ejecución (este archivo)
├── conclusiones.md        # Hallazgos y conclusiones del Ejercicio 1
├── InformeResultados.md   # Análisis de resultados del Ejercicio 2
├── textSummary.txt        # Resumen de métricas (generado tras ejecución)
└── summary.json           # Datos crudos en JSON (generado tras ejecución)
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
cd K6_SCRIPT_FAKESTOREAPI
```

### 2. Verificar que el CSV esté presente
```bash
cat users.csv
```
Debe mostrar:
```
user,passwd
donero,evedon
kevinryan,kev02937@
johnd,m38rmF$
derek,jklg*_56
mor_2314,83r5^_
```

### 3. Ejecutar la prueba
```bash
k6 run script.js
```

### 4. Revisar resultados
Al finalizar, se generan automáticamente:
- `textSummary.txt` — resumen legible en consola
- `summary.json` — métricas completas en JSON

---

## Configuración del Escenario

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| **Ramp-up** | 0→30 VUs en 30s | Calentamiento gradual |
| **Meseta** | 60 VUs durante 2m | Carga sostenida para alcanzar 20+ TPS |
| **Sostenido** | 60 VUs durante 1m | Estado estacionario |
| **Ramp-down** | 60→0 VUs en 30s | Enfriamiento |

### Thresholds (SLAs)

| Métrica | Condición | Descripción |
|---------|-----------|-------------|
| `http_req_duration` | `p(95) < 1500ms` | El 95% de las peticiones debe responder en menos de 1.5s |
| `http_req_failed` | `rate < 0.03` | La tasa de error debe ser menor al 3% |

---

## Datos de Prueba

Los datos se parametrizan desde `users.csv` usando `SharedArray` de `k6/data`. Cada VU selecciona un usuario por distribución round-robin.

| Usuario | Contraseña |
|---------|------------|
| donero | evedon |
| kevinryan | kev02937@ |
| johnd | m38rmF$ |
| derek | jklg*_56 |
| mor_2314 | 83r5^_ |

---

## Solución de Problemas

| Problema | Solución |
|----------|----------|
| `SharedArray: file not found` | Verificar que `users.csv` está en la misma carpeta que `script.js` |
| `connection reset by peer` | El servidor aplica rate limiting; reducir VUs |
| `threshold crossed` | Revisar `textSummary.txt` para identificar qué SLA se incumple |
| `GOPROXY connection timed out` | Verificar conexión a internet |
