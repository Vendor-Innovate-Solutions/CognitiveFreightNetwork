/* global L */

const state = {
  routes: [],
  map: null,
  baseLayer: null,
  currentRoute: null,
  routeLayer: null,
  eventLayers: {
    congestion: L.layerGroup(),
    reroute: L.layerGroup(),
    incident: L.layerGroup(),
  },
  ui: {},
  playback: {
    timer: null,
    idx: 0,
    speed: 1,
    movingMarker: null,
    polylineLatLngs: [],
    timestamps: [],
  },
};

function initMap() {
  state.map = L.map('map', {
    center: [37.7749, -122.4194],
    zoom: 11,
  });

  state.baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(state.map);

  // Add event layers but don't show until populated
  state.eventLayers.congestion.addTo(state.map);
  state.eventLayers.reroute.addTo(state.map);
  state.eventLayers.incident.addTo(state.map);
}

function getIcon(color) {
  const svg = encodeURIComponent(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3" fill="${color}"/></svg>`);
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

const ICONS = {
  congestion: getIcon('#ef4444'),
  reroute: getIcon('#f59e0b'),
  incident: getIcon('#10b981'),
};

function loadData() {
  return fetch('sample_routes.json')
    .then((r) => r.json())
    .then((data) => {
      state.routes = data.routes || [];
      // Populate dropdown
      const sel = state.ui.routeSelect;
      for (const r of state.routes) {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;
        sel.appendChild(opt);
      }
      // Preview compact JSON
      const preview = { routes: state.routes.map((r) => ({ id: r.id, name: r.name, points: r.path.length, events: r.events.length })) };
      state.ui.dataPreview.textContent = JSON.stringify(preview, null, 2);
    })
    .catch((err) => {
      console.error('Failed to load data', err);
      state.ui.dataPreview.textContent = 'Failed to load sample_routes.json';
    });
}

function clearLayers() {
  if (state.routeLayer) {
    state.map.removeLayer(state.routeLayer);
    state.routeLayer = null;
  }
  Object.values(state.eventLayers).forEach((lg) => lg.clearLayers());
  // Stop playback
  resetPlayback();
}

function fitToLayer(layer) {
  if (!layer) return;
  const bounds = layer.getBounds ? layer.getBounds() : null;
  if (bounds) state.map.fitBounds(bounds.pad(0.2));
}

function renderRoute(route) {
  clearLayers();
  state.currentRoute = route;

  const latlngs = route.path.map((p) => [p.lat, p.lng]);
  state.routeLayer = L.polyline(latlngs, { color: '#2563eb', weight: 4 }).addTo(state.map);

  // Build playback arrays
  state.playback.polylineLatLngs = latlngs;
  state.playback.timestamps = route.path.map((p) => new Date(p.timestamp).getTime());
  state.playback.idx = 0;

  // Add event markers
  for (const ev of route.events) {
    const marker = L.marker([ev.lat, ev.lng], { icon: ICONS[ev.type] })
      .bindPopup(`<strong>${ev.type.toUpperCase()}</strong><br/>Time: ${new Date(ev.time).toLocaleString()}<br/>Severity: ${ev.severity ?? 'n/a'}${ev.note ? '<br/>' + ev.note : ''}`);
    state.eventLayers[ev.type].addLayer(marker);
  }

  // Respect toggles
  state.eventLayers.congestion[(state.ui.toggleCongestion.checked ? 'addTo' : 'removeFrom')](state.map);
  state.eventLayers.reroute[(state.ui.toggleReroute.checked ? 'addTo' : 'removeFrom')](state.map);
  state.eventLayers.incident[(state.ui.toggleIncident.checked ? 'addTo' : 'removeFrom')](state.map);

  fitToLayer(state.routeLayer);
  updateTimeLabel();
}

function onSelectRoute() {
  const id = state.ui.routeSelect.value;
  const route = state.routes.find((r) => String(r.id) === String(id));
  if (route) renderRoute(route);
}

function attachUI() {
  state.ui = {
    routeSelect: document.getElementById('routeSelect'),
    btnFit: document.getElementById('btnFit'),
    btnClear: document.getElementById('btnClear'),
    btnPlay: document.getElementById('btnPlay'),
    btnPause: document.getElementById('btnPause'),
    btnReset: document.getElementById('btnReset'),
    progress: document.getElementById('progress'),
    speed: document.getElementById('speed'),
    speedVal: document.getElementById('speedVal'),
    timeLabel: document.getElementById('timeLabel'),
    dataPreview: document.getElementById('dataPreview'),
    toggleCongestion: document.getElementById('toggleCongestion'),
    toggleReroute: document.getElementById('toggleReroute'),
    toggleIncident: document.getElementById('toggleIncident'),
  };

  state.ui.routeSelect.addEventListener('change', onSelectRoute);
  state.ui.btnFit.addEventListener('click', () => fitToLayer(state.routeLayer));
  state.ui.btnClear.addEventListener('click', () => { state.ui.routeSelect.value = ''; clearLayers(); state.ui.timeLabel.textContent = '—'; });

  state.ui.toggleCongestion.addEventListener('change', () => {
    state.eventLayers.congestion[(state.ui.toggleCongestion.checked ? 'addTo' : 'removeFrom')](state.map);
  });
  state.ui.toggleReroute.addEventListener('change', () => {
    state.eventLayers.reroute[(state.ui.toggleReroute.checked ? 'addTo' : 'removeFrom')](state.map);
  });
  state.ui.toggleIncident.addEventListener('change', () => {
    state.eventLayers.incident[(state.ui.toggleIncident.checked ? 'addTo' : 'removeFrom')](state.map);
  });

  // Playback controls
  state.ui.btnPlay.addEventListener('click', play);
  state.ui.btnPause.addEventListener('click', pause);
  state.ui.btnReset.addEventListener('click', resetPlayback);
  state.ui.progress.addEventListener('input', onScrub);
  state.ui.speed.addEventListener('input', onSpeedChange);
  onSpeedChange();
}

function enablePlayButtons(isPlaying) {
  state.ui.btnPlay.disabled = isPlaying;
  state.ui.btnPause.disabled = !isPlaying;
}

function resetPlayback() {
  if (state.playback.timer) {
    clearInterval(state.playback.timer);
    state.playback.timer = null;
  }
  enablePlayButtons(false);
  state.playback.idx = 0;
  state.ui.progress.value = 0;
  if (state.playback.movingMarker) {
    state.map.removeLayer(state.playback.movingMarker);
    state.playback.movingMarker = null;
  }
  if (state.playback.polylineLatLngs.length) {
    // Initialize marker at start
    state.playback.movingMarker = L.circleMarker(state.playback.polylineLatLngs[0], {
      radius: 7,
      color: '#111827',
      weight: 2,
      fillColor: '#ffffff',
      fillOpacity: 1,
    }).addTo(state.map);
  }
  updateTimeLabel();
}

function onSpeedChange() {
  const v = parseFloat(state.ui.speed.value);
  state.playback.speed = v;
  state.ui.speedVal.textContent = `${v}x`;
  if (state.playback.timer) {
    // restart at new speed
    pause();
    play();
  }
}

function onScrub() {
  if (!state.playback.polylineLatLngs.length) return;
  const max = parseInt(state.ui.progress.max, 10);
  const val = parseInt(state.ui.progress.value, 10);
  const idx = Math.round((val / max) * (state.playback.polylineLatLngs.length - 1));
  state.playback.idx = Math.min(Math.max(idx, 0), state.playback.polylineLatLngs.length - 1);
  const ll = state.playback.polylineLatLngs[state.playback.idx];
  if (!state.playback.movingMarker) {
    state.playback.movingMarker = L.circleMarker(ll, { radius: 7, color: '#111827', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }).addTo(state.map);
  } else {
    state.playback.movingMarker.setLatLng(ll);
  }
  updateTimeLabel();
}

function updateTimeLabel() {
  if (!state.currentRoute || !state.playback.timestamps.length) {
    state.ui.timeLabel.textContent = '—';
    return;
  }
  const t = new Date(state.playback.timestamps[state.playback.idx]);
  state.ui.timeLabel.textContent = t.toLocaleString();
}

function play() {
  if (!state.playback.polylineLatLngs.length) return;
  enablePlayButtons(true);

  const stepMs = 200 / state.playback.speed; // base 5 steps per second at 1x
  state.playback.timer = setInterval(() => {
    state.playback.idx++;
    if (state.playback.idx >= state.playback.polylineLatLngs.length) {
      pause();
      return;
    }
    const ll = state.playback.polylineLatLngs[state.playback.idx];
    state.playback.movingMarker.setLatLng(ll);

    // Update progress based on index
    const progress = Math.round((state.playback.idx / (state.playback.polylineLatLngs.length - 1)) * parseInt(state.ui.progress.max, 10));
    state.ui.progress.value = String(progress);
    updateTimeLabel();
  }, stepMs);
}

function pause() {
  if (state.playback.timer) {
    clearInterval(state.playback.timer);
    state.playback.timer = null;
  }
  enablePlayButtons(false);
}

function main() {
  attachUI();
  initMap();
  loadData().then(() => {
    // Optionally auto-select first route
    if (state.routes.length) {
      state.ui.routeSelect.value = state.routes[0].id;
      renderRoute(state.routes[0]);
    }
  });
}

window.addEventListener('DOMContentLoaded', main);
