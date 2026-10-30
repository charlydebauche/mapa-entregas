# TP PoC – Mapa de Entregas de CABA

**Recorrido:** Dataset → Supabase → React/Vite → deck.gl → Vercel
**Ejemplo elegido:** 5 – Logística y entregas
**Pregunta:** ¿En qué zonas existen mayores demoras en las entregas?

## Contenido del repositorio

| Carpeta / archivo | Qué es |
| --- | --- |
| `data/entregas.csv` | Dataset de 60 pedidos (nombre, estado, lat, lon, minutos de entrega, fecha, barrio) |
| `supabase/crear_tabla_y_datos.sql` | Script que crea la tabla `puntos`, le da permiso de lectura y carga los 60 registros |
| `package.json`, `index.html`, `vite.config.js`, `src/` | La aplicación React + Vite + deck.gl (publicada en Vercel) |

Campos de la tabla `puntos`: `id`, `nombre` (pedido), `categoria` (estado: Entregado / En camino / Pendiente), `latitud`, `longitud`, `valor` (minutos de entrega), `fecha`, `descripcion` (barrio).

## Cómo funciona

1. **Supabase:** la tabla `puntos` guarda los 60 pedidos; una policy permite leerlos con la clave pública.
2. **React/Vite:** `src/supabaseClient.js` se conecta con las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; `src/App.jsx` consulta la tabla (con `console.log` del resultado).
3. **deck.gl:** `ScatterplotLayer` (posición `[longitud, latitud]`), más `HeatmapLayer` y `HexagonLayer` como desafío adicional.
4. **Vercel:** publica la app desde este repositorio.

## Correrlo en la compu (opcional)

Requiere Node.js 18+.

```bash
npm install
cp .env.example .env    # completar con URL y clave pública de Supabase
npm run dev
```

## Qué cumple la app (checklist del TP)

- [x] Título del proyecto
- [x] 4 indicadores calculados con los datos de Supabase: pedidos, tiempo promedio, demorados (+90 min), % entregados
- [x] Mapa interactivo con deck.gl (zoom, desplazamiento, puntos)
- [x] Datos leídos de Supabase (tabla `puntos`)
- [x] Tooltip al pasar el mouse: nombre, categoría, valor (+ barrio y fecha)
- [x] Desafío adicional: ScatterplotLayer, HeatmapLayer y HexagonLayer
- [x] Extra: filtro por estado y "zona más lenta" en la leyenda
