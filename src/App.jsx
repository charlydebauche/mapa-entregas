import { useEffect, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer, BitmapLayer } from '@deck.gl/layers'
import { TileLayer } from '@deck.gl/geo-layers'
import { HeatmapLayer, HexagonLayer } from '@deck.gl/aggregation-layers'
import { supabase, supabaseConfigurado } from './supabaseClient'

// Umbral para considerar un pedido "demorado" (en minutos)
const UMBRAL_DEMORA = 90

const VISTA_INICIAL = {
  longitude: -58.44,
  latitude: -34.61,
  zoom: 11.3,
  pitch: 0,
  bearing: 0,
}

// Color de cada punto según el tiempo de entrega
function colorPorDemora(minutos) {
  if (minutos > UMBRAL_DEMORA) return [214, 48, 49]   // rojo: demorado
  if (minutos > 45) return [240, 160, 30]             // naranja: medio
  return [39, 160, 90]                                // verde: rápido
}

const ESTADOS = ['Todos', 'Entregado', 'En camino', 'Pendiente']
const CAPAS = [
  { id: 'puntos', nombre: 'Puntos' },
  { id: 'calor', nombre: 'Mapa de calor' },
  { id: 'hexagonos', nombre: 'Hexágonos 3D' },
]

export default function App() {
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [capa, setCapa] = useState('puntos')
  const [vista, setVista] = useState(VISTA_INICIAL)

  // ---- Etapa 4: consultar los datos en Supabase ----
  useEffect(() => {
    async function cargar() {
      if (!supabaseConfigurado) {
        setError('Faltan las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.')
        setCargando(false)
        return
      }
      const { data, error } = await supabase
        .from('puntos')
        .select('id, nombre, categoria, latitud, longitud, valor, fecha, descripcion')
        .order('id')

      console.log('Datos recibidos de Supabase:', data, error)

      if (error) setError(error.message)
      else setDatos(data || [])
      setCargando(false)
    }
    cargar()
  }, [])

  const filtrados = useMemo(
    () => (filtroEstado === 'Todos' ? datos : datos.filter((d) => d.categoria === filtroEstado)),
    [datos, filtroEstado]
  )

  // ---- Etapa 7: indicadores calculados con los datos de Supabase ----
  const kpis = useMemo(() => {
    const total = filtrados.length
    const promedio = total ? filtrados.reduce((s, d) => s + Number(d.valor), 0) / total : 0
    const demorados = filtrados.filter((d) => d.valor > UMBRAL_DEMORA).length
    const entregados = filtrados.filter((d) => d.categoria === 'Entregado').length
    return {
      total,
      promedio: Math.round(promedio),
      demorados,
      pctEntregados: total ? Math.round((entregados / total) * 100) : 0,
    }
  }, [filtrados])

  // Barrio con mayor demora promedio (responde la pregunta del TP)
  const peorZona = useMemo(() => {
    const porBarrio = {}
    filtrados.forEach((d) => {
      const b = d.descripcion || 'Sin dato'
      porBarrio[b] = porBarrio[b] || { suma: 0, n: 0 }
      porBarrio[b].suma += Number(d.valor)
      porBarrio[b].n += 1
    })
    let peor = null
    Object.entries(porBarrio).forEach(([barrio, v]) => {
      const prom = v.suma / v.n
      if (!peor || prom > peor.prom) peor = { barrio, prom: Math.round(prom) }
    })
    return peor
  }, [filtrados])

  // ---- Etapa 5: capas de deck.gl ----
  const mapaBase = new TileLayer({
    id: 'mapa-base',
    data: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    minZoom: 0,
    maxZoom: 19,
    tileSize: 256,
    renderSubLayers: (props) => {
      const { boundingBox } = props.tile
      return new BitmapLayer(props, {
        data: null,
        image: props.data,
        bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]],
      })
    },
  })

  const capaPuntos = new ScatterplotLayer({
    id: 'entregas-puntos',
    data: filtrados,
    // deck.gl usa [LONGITUD, LATITUD]
    getPosition: (d) => [Number(d.longitud), Number(d.latitud)],
    getFillColor: (d) => [...colorPorDemora(d.valor), 210],
    getLineColor: [255, 255, 255],
    getRadius: (d) => 80 + d.valor * 2,
    radiusMinPixels: 5,
    radiusMaxPixels: 30,
    stroked: true,
    lineWidthMinPixels: 1,
    pickable: true,
  })

  const capaCalor = new HeatmapLayer({
    id: 'entregas-calor',
    data: filtrados,
    getPosition: (d) => [Number(d.longitud), Number(d.latitud)],
    getWeight: (d) => Number(d.valor),
    radiusPixels: 60,
    intensity: 1.2,
    threshold: 0.05,
  })

  const capaHexagonos = new HexagonLayer({
    id: 'entregas-hexagonos',
    data: filtrados,
    getPosition: (d) => [Number(d.longitud), Number(d.latitud)],
    radius: 700,
    gpuAggregation: false,
    extruded: true,
    elevationScale: 12,
    getElevationWeight: (d) => Number(d.valor),
    elevationAggregation: 'MEAN',
    getColorWeight: (d) => Number(d.valor),
    colorAggregation: 'MEAN',
    colorRange: [
      [39, 160, 90],
      [140, 190, 80],
      [240, 200, 60],
      [240, 160, 30],
      [230, 100, 40],
      [214, 48, 49],
    ],
    opacity: 0.85,
    pickable: true,
  })

  const capaDatos =
    capa === 'calor' ? capaCalor : capa === 'hexagonos' ? capaHexagonos : capaPuntos

  function cambiarCapa(id) {
    setCapa(id)
    // Los hexágonos se ven mejor con el mapa inclinado
    setVista({
      ...VISTA_INICIAL,
      pitch: id === 'hexagonos' ? 45 : 0,
      bearing: id === 'hexagonos' ? -15 : 0,
      transitionDuration: 800,
    })
  }

  // ---- Etapa 6: información al pasar el mouse ----
  function tooltip({ object, layer }) {
    if (!object) return null
    if (layer && layer.id === 'entregas-hexagonos') {
      const prom = Math.round(object.elevationValue ?? object.colorValue ?? 0)
      return {
        html: `<b>Zona (hexágono)</b><br/>Pedidos: ${object.count ?? object.points?.length ?? '-'}<br/>Demora promedio: ${prom} min`,
        style: estiloTooltip,
      }
    }
    return {
      html: `<b>Nombre:</b> ${object.nombre}<br/>
             <b>Categoría:</b> ${object.categoria}<br/>
             <b>Valor:</b> ${object.valor} min de entrega<br/>
             <b>Barrio:</b> ${object.descripcion}<br/>
             <b>Fecha:</b> ${object.fecha}`,
      style: estiloTooltip,
    }
  }

  return (
    <div className="app">
      <header className="encabezado">
        <div>
          <h1>Mapa de Entregas de CABA</h1>
          <p className="subtitulo">¿En qué zonas existen mayores demoras en las entregas?</p>
        </div>
        <span className="fuente">Datos: Supabase · tabla <code>puntos</code></span>
      </header>

      <section className="kpis">
        <div className="kpi">
          <span className="kpi-valor">{kpis.total}</span>
          <span className="kpi-label">Pedidos registrados</span>
        </div>
        <div className="kpi">
          <span className="kpi-valor">{kpis.promedio} min</span>
          <span className="kpi-label">Tiempo promedio de entrega</span>
        </div>
        <div className="kpi kpi-alerta">
          <span className="kpi-valor">{kpis.demorados}</span>
          <span className="kpi-label">Demorados (+{UMBRAL_DEMORA} min)</span>
        </div>
        <div className="kpi">
          <span className="kpi-valor">{kpis.pctEntregados}%</span>
          <span className="kpi-label">Entregados</span>
        </div>
      </section>

      <section className="controles">
        <div className="grupo">
          <span className="grupo-label">Estado</span>
          {ESTADOS.map((e) => (
            <button
              key={e}
              className={filtroEstado === e ? 'activo' : ''}
              onClick={() => setFiltroEstado(e)}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="grupo">
          <span className="grupo-label">Visualización</span>
          {CAPAS.map((c) => (
            <button
              key={c.id}
              className={capa === c.id ? 'activo' : ''}
              onClick={() => cambiarCapa(c.id)}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </section>

      <main className="mapa">
        {cargando && <div className="aviso">Cargando datos desde Supabase…</div>}
        {error && <div className="aviso aviso-error">Error al cargar datos: {error}</div>}

        <DeckGL
          initialViewState={vista}
          controller={true}
          layers={[mapaBase, capaDatos]}
          getTooltip={tooltip}
        />

        <div className="leyenda">
          {capa === 'puntos' && (
            <>
              <b>Tiempo de entrega</b>
              <div><i style={{ background: 'rgb(39,160,90)' }} /> Hasta 45 min</div>
              <div><i style={{ background: 'rgb(240,160,30)' }} /> 46 a {UMBRAL_DEMORA} min</div>
              <div><i style={{ background: 'rgb(214,48,49)' }} /> Más de {UMBRAL_DEMORA} min</div>
            </>
          )}
          {capa === 'calor' && <b>Concentración de demora (minutos acumulados)</b>}
          {capa === 'hexagonos' && <b>Altura y color: demora promedio por zona</b>}
          {peorZona && (
            <div className="peor-zona">
              Zona más lenta: <b>{peorZona.barrio}</b> ({peorZona.prom} min prom.)
            </div>
          )}
        </div>

        <div className="atribucion">© OpenStreetMap contributors © CARTO</div>
      </main>
    </div>
  )
}

const estiloTooltip = {
  backgroundColor: '#1f2937',
  color: '#fff',
  fontSize: '13px',
  padding: '8px 10px',
  borderRadius: '6px',
  lineHeight: '1.5',
}
