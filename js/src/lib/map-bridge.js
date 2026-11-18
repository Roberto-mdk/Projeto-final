import { pathLengthMeters, polygonAreaSquareMeters, formatDistance, formatArea } from './geo.js';

const HOME = { center: [-34.8770, -8.0476], zoom: 12.4, pitch: 58, bearing: -18 };
let activeMap = null;
let measureActive = false;
let measurementPoints = [];
let onMeasureChange = () => {};
let onProjectSelect = () => {};

const statusColor = [
  'match', ['get', 'status'],
  'Em andamento', '#f59e0b',
  'Planejamento', '#4895d9',
  'Concluída', '#19a879',
  '#7b8794'
];

function createFeatureCollection(projects) {
  return {
    type: 'FeatureCollection',
    features: projects
      .filter((project) => Number.isFinite(project.latitude) && Number.isFinite(project.longitude))
      .map((project) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [project.longitude, project.latitude] },
        properties: {
          id: project.id,
          name: project.name,
          status: project.status,
          category: project.category,
          progress: project.progress
        }
      }))
  };
}

function installProjectLayers(map) {
  if (!map || !map.isStyleLoaded?.()) return false;
  const sourceId = 'nexus-projects-source';

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 13,
      clusterRadius: 42
    });
  }

  if (!map.getLayer('nexus-projects-clusters')) {
    map.addLayer({
      id: 'nexus-projects-clusters',
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#087e70',
        'circle-radius': ['step', ['get', 'point_count'], 17, 10, 22, 30, 28],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    });
  }

  if (!map.getLayer('nexus-projects-cluster-count')) {
    map.addLayer({
      id: 'nexus-projects-cluster-count',
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
      paint: { 'text-color': '#ffffff' }
    });
  }

  if (!map.getLayer('nexus-projects-points')) {
    map.addLayer({
      id: 'nexus-projects-points',
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 5, 14, 8, 18, 11],
        'circle-color': statusColor,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2.5
      }
    });
  }

  if (!map.getLayer('nexus-projects-labels')) {
    map.addLayer({
      id: 'nexus-projects-labels',
      type: 'symbol',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      minzoom: 14,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 11,
        'text-offset': [0, 1.35],
        'text-anchor': 'top',
        'text-max-width': 13
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(9, 24, 37, .86)',
        'text-halo-width': 1.4
      }
    });
  }

  if (!map.getSource('nexus-measure-source')) {
    map.addSource('nexus-measure-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
  }
  if (!map.getLayer('nexus-measure-fill')) {
    map.addLayer({
      id: 'nexus-measure-fill', type: 'fill', source: 'nexus-measure-source',
      filter: ['==', '$type', 'Polygon'],
      paint: { 'fill-color': '#16a085', 'fill-opacity': 0.18 }
    });
  }
  if (!map.getLayer('nexus-measure-line')) {
    map.addLayer({
      id: 'nexus-measure-line', type: 'line', source: 'nexus-measure-source',
      paint: { 'line-color': '#18b99a', 'line-width': 3, 'line-dasharray': [2, 1] }
    });
  }
  if (!map.getLayer('nexus-measure-points')) {
    map.addLayer({
      id: 'nexus-measure-points', type: 'circle', source: 'nexus-measure-source',
      filter: ['==', '$type', 'Point'],
      paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': '#087e70', 'circle-stroke-width': 3 }
    });
  }

  return true;
}

function ensureLayers() {
  if (!activeMap) return;
  if (activeMap.isStyleLoaded?.()) installProjectLayers(activeMap);
  else activeMap.once?.('load', () => installProjectLayers(activeMap));
}

function updateMeasurementSource() {
  if (!activeMap || !activeMap.getSource('nexus-measure-source')) return;
  const features = measurementPoints.map((point) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [point.lng, point.lat] }, properties: {}
  }));
  if (measurementPoints.length >= 2) {
    features.push({
      type: 'Feature',
      geometry: {
        type: measurementPoints.length >= 3 ? 'Polygon' : 'LineString',
        coordinates: measurementPoints.length >= 3
          ? [[...measurementPoints.map((point) => [point.lng, point.lat]), [measurementPoints[0].lng, measurementPoints[0].lat]]]
          : measurementPoints.map((point) => [point.lng, point.lat])
      },
      properties: {}
    });
  }
  activeMap.getSource('nexus-measure-source').setData({ type: 'FeatureCollection', features });
  const length = pathLengthMeters(measurementPoints);
  const area = measurementPoints.length >= 3 ? polygonAreaSquareMeters(measurementPoints) : 0;
  onMeasureChange({
    count: measurementPoints.length,
    distance: formatDistance(length),
    area: area ? formatArea(area) : null,
    rawDistance: length,
    rawArea: area
  });
}

function bindMapEvents(map) {
  map.on('click', (event) => {
    if (measureActive) {
      measurementPoints.push({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      updateMeasurementSource();
      return;
    }
  });

  map.on('click', 'nexus-projects-points', (event) => {
    const id = event.features?.[0]?.properties?.id;
    if (id) onProjectSelect(id);
  });
  map.on('mouseenter', 'nexus-projects-points', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'nexus-projects-points', () => { map.getCanvas().style.cursor = ''; });

  map.on('click', 'nexus-projects-clusters', (event) => {
    const feature = map.queryRenderedFeatures(event.point, { layers: ['nexus-projects-clusters'] })[0];
    const clusterId = feature?.properties?.cluster_id;
    const source = map.getSource('nexus-projects-source');
    if (clusterId !== undefined && source?.getClusterExpansionZoom) {
      source.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (!error) map.easeTo({ center: feature.geometry.coordinates, zoom });
      });
    }
  });
  map.on('mouseenter', 'nexus-projects-clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'nexus-projects-clusters', () => { map.getCanvas().style.cursor = ''; });
}

export function registerMap(map) {
  if (!map || typeof map.addSource !== 'function') return false;
  activeMap = map;
  window.NEXUS_MAP = map;

  const ready = () => {
    if (!installProjectLayers(map)) return;
    bindMapEvents(map);
    window.dispatchEvent(new CustomEvent('nexus:map-ready'));
    window.NEXUS?.refreshMapProjects?.();
  };

  if (map.isStyleLoaded?.()) ready();
  else map.once('load', ready);
  map.on('styledata', () => {
    // Reinstala as camadas próprias quando o estilo do mapa for trocado.
    if (map.isStyleLoaded?.() && !map.getSource('nexus-projects-source')) installProjectLayers(map);
  });
  return true;
}

export function findMap() {
  const candidates = [window.NEXUS_MAP, window.map, window.mapa, window.map3D, window.map3d];
  const candidate = candidates.find((item) => item && typeof item.addSource === 'function');
  if (candidate && candidate !== activeMap) registerMap(candidate);
  return activeMap;
}

export function refreshMapProjects(projects) {
  const map = findMap();
  if (!map) return false;
  if (!map.isStyleLoaded?.()) {
    map.once('load', () => refreshMapProjects(projects));
    return false;
  }
  ensureLayers();
  const source = map.getSource('nexus-projects-source');
  if (!source) return false;
  source.setData(createFeatureCollection(projects));
  return true;
}

export function focusProject(project) {
  const map = findMap();
  if (!map || !Number.isFinite(project.latitude) || !Number.isFinite(project.longitude)) return false;
  map.flyTo({ center: [project.longitude, project.latitude], zoom: Math.max(map.getZoom(), 15.5), pitch: 58, speed: 0.9, curve: 1.35 });
  return true;
}

export function goHome() {
  const map = findMap();
  if (!map) return false;
  map.flyTo({ ...HOME, speed: 0.85, curve: 1.35 });
  return true;
}

export function toggle3D() {
  const map = findMap();
  if (!map) return false;
  map.easeTo({ pitch: map.getPitch() > 25 ? 0 : 58, duration: 800 });
  return true;
}

export function resizeMap() {
  findMap()?.resize?.();
}

export function setProjectLayerVisibility(visible) {
  const map = findMap();
  if (!map) return false;
  for (const id of ['nexus-projects-points', 'nexus-projects-labels', 'nexus-projects-clusters', 'nexus-projects-cluster-count']) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  }
  return true;
}

export function setLayerGroupVisibility(group, visible) {
  const map = findMap();
  if (!map) return { found: false, count: 0 };
  const patterns = {
    buildings: /(building|edific|extrusion|structure)/i,
    roads: /(road|street|highway|transport|bridge|tunnel|via)/i,
    parks: /(park|garden|green|vegetation|grass|landcover)/i,
    water: /(water|river|canal|lake|ocean|stream)/i
  };
  const pattern = patterns[group];
  if (!pattern) return { found: false, count: 0 };
  const layers = map.getStyle()?.layers || [];
  let count = 0;
  for (const layer of layers) {
    if (pattern.test(layer.id) && map.getLayer(layer.id)) {
      map.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none');
      count += 1;
    }
  }
  return { found: count > 0, count };
}

export function setMeasurementActive(active, callback = onMeasureChange) {
  measureActive = Boolean(active);
  onMeasureChange = callback;
  const map = findMap();
  if (map?.getCanvas) map.getCanvas().style.cursor = measureActive ? 'crosshair' : '';
  return Boolean(map);
}

export function finishMeasurement() {
  measureActive = false;
  const map = findMap();
  if (map?.getCanvas) map.getCanvas().style.cursor = '';
}

export function clearMeasurement() {
  measurementPoints = [];
  updateMeasurementSource();
}

export function setProjectSelectCallback(callback) {
  onProjectSelect = callback;
}

export function setMeasurementCallback(callback) {
  onMeasureChange = callback;
}

export function getMapInstance() {
  return findMap();
}