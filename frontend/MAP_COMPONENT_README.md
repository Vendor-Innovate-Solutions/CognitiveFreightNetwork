# RouteSimulatorMap Component

## Overview

The `RouteSimulatorMap` is an interactive React component that visualizes simulated logistics routes on a dynamic map using Mapbox GL JS. It displays both "Actual" and "Optimized" routes with clear visual distinctions and highlights key events along the routes.

## Features

- **Route Visualization**: Display multiple routes simultaneously with distinct styling
  - Actual routes: Dashed orange/red lines
  - Optimized routes: Solid green lines

- **Interactive Event Markers**: Place markers along routes to highlight significant events:
  - 🏁 Origin/Destination points
  - ⚠️ Congestion zones
  - 🔀 AI-recommended reroute points
  - ⏱️ Delays
  - 📍 Checkpoints

- **Interactive Popups**: Hover/click on routes and markers to see detailed information

- **Route Comparison**: Side-by-side statistics showing time, distance, and cost savings

- **Performance Optimized**: Uses Mapbox's efficient rendering for smooth interactions

## Setup

### 1. Install Dependencies

```bash
npm install mapbox-gl react-map-gl @types/mapbox-gl
```

### 2. Get Mapbox Token

1. Sign up at https://account.mapbox.com/
2. Create an access token
3. Add it to your `.env.local` file:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoidmVua2F0ZXNoMjFiaXQiLCJhIjoiY21nbmI4OWh1MDEwNzJscTRieWZhZTVxNiJ9.Js6FhT2ViFO69pghJIl_Cw
```

✅ **Status: CONFIGURED** - Your Mapbox token has been set up!

### 3. Import and Use

```tsx
import RouteSimulatorMap from "@/components/dashboard/RouteSimulatorMap";
import { mockSimulationData } from "@/data/RouteSimulationData";

export default function MyPage() {
  return (
    <RouteSimulatorMap 
      simulationData={mockSimulationData} 
      height="700px" 
    />
  );
}
```

## Data Structure

### SimulationData Type

```typescript
interface SimulationData {
  routes: Route[];
  events: RouteEvent[];
  metadata?: {
    simulationDate?: string;
    description?: string;
  };
}
```

### Route Type

```typescript
interface Route {
  id: string;
  name: string;
  type: "actual" | "optimized";
  coordinates: RoutePoint[];
  stats: {
    duration: string;
    distance: string;
    cost?: number;
  };
  color: string;
  style: "solid" | "dashed";
}
```

### RouteEvent Type

```typescript
interface RouteEvent {
  id: string;
  type: "congestion" | "reroute" | "origin" | "destination" | "delay" | "checkpoint";
  location: Coordinate;
  title: string;
  description: string;
  timestamp?: string;
  severity?: "low" | "medium" | "high";
}
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `simulationData` | `SimulationData` | Required | The route and event data to visualize |
| `height` | `string` | `"600px"` | Height of the map container |
| `className` | `string` | `""` | Additional CSS classes |

## Examples

### Example 1: Basic Usage

```tsx
<RouteSimulatorMap simulationData={mySimulationData} />
```

### Example 2: Custom Height

```tsx
<RouteSimulatorMap 
  simulationData={mySimulationData} 
  height="800px" 
/>
```

### Example 3: Creating Custom Simulation Data

```tsx
const customSimulation: SimulationData = {
  routes: [
    {
      id: "route-1",
      name: "Actual Route",
      type: "actual",
      coordinates: [
        { latitude: 40.7128, longitude: -74.0060 }, // NYC
        { latitude: 41.8781, longitude: -87.6298 }, // Chicago
      ],
      stats: {
        duration: "18 hours",
        distance: "1,200 km",
        cost: 1500,
      },
      color: "#F97316",
      style: "dashed",
    },
    // ... more routes
  ],
  events: [
    {
      id: "event-1",
      type: "origin",
      location: { latitude: 40.7128, longitude: -74.0060 },
      title: "Origin: New York",
      description: "Shipment started",
    },
    // ... more events
  ],
};
```

## Styling

The component uses Tailwind CSS and follows the project's design system with:
- Dark theme support
- Card-based layout with backdrop blur
- Hover effects and transitions
- Responsive design

## Performance Considerations

- Routes are rendered using Mapbox's native GeoJSON sources for optimal performance
- Event markers are DOM-based for better interactivity
- Map automatically fits bounds to show all routes
- Debounced interactions prevent excessive re-renders

## Troubleshooting

### Map doesn't load

- Ensure `NEXT_PUBLIC_MAPBOX_TOKEN` is set in your `.env.local` file
- Check browser console for errors
- Verify your Mapbox token is valid and has the correct permissions

### Routes not displaying

- Verify coordinate data is in the correct format: `{ latitude: number, longitude: number }`
- Ensure coordinates are valid lat/lng values (latitude: -90 to 90, longitude: -180 to 180)

### Markers not showing

- Check that event locations have valid coordinates
- Ensure event types are one of the supported types

## Future Enhancements

Potential improvements for the component:

1. **Animation**: Animate truck movement along routes
2. **Real-time Updates**: WebSocket integration for live tracking
3. **Route Clustering**: Group nearby markers at lower zoom levels
4. **Export**: Allow users to export map as image or PDF
5. **Custom Layers**: Support for additional data layers (weather, traffic)
6. **3D Terrain**: Optional 3D visualization of routes
7. **Time Slider**: Scrub through route history

## License

Part of the Cognitive Freight Network project.
