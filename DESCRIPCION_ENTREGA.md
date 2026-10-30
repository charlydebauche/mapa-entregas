# Descripción del proyecto (máx. 5 líneas)

**Mapa de Entregas de CABA.** Analizamos en qué zonas de la Ciudad de Buenos Aires se producen las mayores demoras en las entregas de un operador logístico con depósito en Barracas.
Los datos son un dataset de 60 pedidos preparado por el grupo (ubicaciones reales de barrios porteños, tiempos simulados), almacenado en Supabase.
El mapa muestra cada pedido como un punto coloreado según su tiempo de entrega, y permite cambiar a mapa de calor y hexágonos 3D con la demora promedio por zona.
Se observa que los barrios más alejados del depósito (Liniers, Mataderos, Villa Urquiza) superan los 90 minutos promedio, mientras que la zona sur cercana (La Boca, San Telmo) entrega en menos de 30.
En una segunda versión agregaríamos datos reales de un WMS/TMS, filtro por fecha y franja horaria, y la ruta del vehículo con PathLayer.
