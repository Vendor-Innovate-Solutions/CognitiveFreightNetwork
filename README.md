# Logistics Dashboard — Simulated Routes Map

This is a lightweight static dashboard that renders simulated truck routes and key event points (predicted congestion, reroute points, incidents) on an interactive Leaflet map.

## Features
- Display multiple simulated routes with a dropdown selector
- Visualize event layers with toggles (congestion, reroute, incident)
- Fit-to-route and clear controls
- Playback a moving marker along the selected route with speed and scrubbing
- Data preview showing a compact summary of loaded routes

## Tech
- [Leaflet](https://leafletjs.com/) for mapping
- OpenStreetMap tiles
- Vanilla JS, no build step required

## Getting Started
1. Open `index.html` directly in your browser. If your browser blocks local fetch for JSON, serve the folder via a local server, e.g. Python:
   ```bash
   python -m http.server 5500
   ```
   Then open http://localhost:5500 in your browser.

2. Use the `Route` dropdown to select a route. The map will zoom to the route line.
3. Toggle event layers to show/hide congestion, reroute, and incident markers.
4. Use `Play`, `Pause`, and `Reset` to animate the moving marker along the route. Adjust speed or scrub with the slider.

## Data Format
`sample_routes.json` structure:
```json
{
  "routes": [
    {
      "id": "r1",
      "name": "Route Name",
      "path": [ { "lat": 0, "lng": 0, "timestamp": "ISO-8601" }, ... ],
      "events": [ { "type": "congestion|reroute|incident", "lat": 0, "lng": 0, "time": "ISO-8601", "severity": "low|medium|high", "note": "..." } ]
    }
  ]
}
```

- `path` describes the polyline for the truck trajectory. Timestamps are used for labeling and optional time-aware features.
- `events` are point annotations along or near the route.

## Customizing
- Replace `sample_routes.json` with your AI/ML simulation output in the same schema.
- Adjust styling in `styles.css` and logic in `app.js` to add more layers (e.g., heatmaps, geofences) or to integrate with your dashboard framework.

## Notes
- If you plan to integrate into a React/Next.js app, move the code into a component and mount Leaflet after the DOM is available, or use dynamic import to avoid SSR issues.
