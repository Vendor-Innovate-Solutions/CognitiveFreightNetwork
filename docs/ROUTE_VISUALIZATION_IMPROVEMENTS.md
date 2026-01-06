# Route Visualization Improvements

## Overview
This implementation adds sophisticated curved route visualization for multi-modal transportation, with special handling for air and sea routes using geodesic curves and Bézier interpolation.

## Key Features Implemented

### 1. Curved Lines for Sea and Air Routes
- **Air Routes**: Uses great circle paths with Bézier interpolation to create realistic flight arcs
- **Sea Routes**: Implements geodesic curves that follow the Earth's curvature
- **Road/Rail Routes**: Maintains straight-line rendering with waypoint interpolation

### 2. Layer Separation
Routes are rendered in separate layers based on transport mode:
- **Road/Rail Layer**: Base layer with solid lines
- **Sea/Air Layer**: Overlay layer with dashed/animated lines

### 3. Visual Distinctions

#### Transport Mode Styles:
- 🚛 **Truck**: Solid green line (#10B981)
- 🚂 **Rail**: Solid indigo line (#6366F1)
- 🚢 **Ship**: Dashed blue line (#3B82F6) with animation
- ✈️ **Air**: Dotted pink line (#EC4899) with animation

#### Line Properties:
- Dynamic width based on zoom level
- Animated dash patterns for sea/air routes
- Smooth transitions at transfer points (ports/airports)

### 4. UI Color Consistency
All components updated to use navy blue theme:
- Background: `#0B1426` (dark navy)
- Cards: `#1E293B` (navy blue)
- Borders: `#334155` (slate gray)
- Text: `#F1F5F9` (light gray)
- Muted text: `#94A3B8` (medium gray)

## Files Added/Modified

### New Files:
1. **`/src/lib/route-curves.ts`** (300+ lines)
   - Core utility for curve generation
   - Functions for air, sea, and ground routes
   - Transport mode style configurations

2. **`/src/data/MultiModalSimulationData.ts`** (200+ lines)
   - Example data showcasing multi-modal routes
   - Mumbai to Singapore (air vs sea comparison)
   - Chennai to Kolkata (coastal shipping)

3. **`/src/app/route-demo/page.tsx`** (180+ lines)
   - Interactive demo page
   - Three demo scenarios
   - Technical documentation

### Modified Files:
1. **`/src/types/route.ts`**
   - Added `TransportMode` type
   - Added `RouteSegment` interface
   - Extended `Route` interface with optional segments

2. **`/src/components/dashboard/RouteSimulatorMap.tsx`** (major refactor)
   - Added segment-based rendering
   - Implemented curve generation integration
   - Added zoom-level aware styling
   - Animated route lines for sea/air
   - Updated to navy blue theme

3. **`/src/components/dashboard/MultiModalRouteCard.tsx`**
   - Updated all colors to navy blue theme
   - Enhanced visual consistency

4. **`/package.json`**
   - Added `@turf/turf`, `@turf/bezier-spline`, `@turf/great-circle`, `@turf/line-arc`

## Usage Examples

### Using the Route Visualization

#### 1. With Multi-Modal Segments:
```typescript
import { SimulationData, RouteSegment } from "@/types/route";

const myRoute: SimulationData = {
  routes: [{
    id: "route-1",
    name: "Multi-Modal Route",
    type: "optimized",
    coordinates: [], // Not used when segments are provided
    segments: [
      {
        id: "truck-segment",
        transportMode: "truck",
        coordinates: [
          { latitude: 19.0760, longitude: 72.8777 },
          { latitude: 19.0896, longitude: 72.8656 }
        ],
        distance: "8 km",
        duration: "0.5 hours"
      },
      {
        id: "air-segment",
        transportMode: "air",
        coordinates: [
          { latitude: 19.0896, longitude: 72.8656 },
          { latitude: 1.3644, longitude: 103.9915 }
        ],
        distance: "4,100 km",
        duration: "5.5 hours"
      }
    ],
    stats: {
      duration: "6 hours",
      distance: "4,108 km",
      cost: 850000
    },
    color: "#10B981",
    style: "solid"
  }],
  events: [],
  metadata: {}
};
```

#### 2. Using Curve Generation Utilities:
```typescript
import { 
  generateAirRouteCurve, 
  generateSeaRouteCurve,
  getTransportModeStyle 
} from "@/lib/route-curves";

// Generate curved air route
const airCurve = generateAirRouteCurve(
  { latitude: 19.0896, longitude: 72.8656 },  // Mumbai
  { latitude: 1.3644, longitude: 103.9915 },  // Singapore
  { numPoints: 50, curveIntensity: 0.2 }
);

// Generate sea route curve
const seaCurve = generateSeaRouteCurve(
  { latitude: 13.0598, longitude: 80.2209 },  // Chennai
  { latitude: 22.5626, longitude: 88.3535 },  // Kolkata
  { numPoints: 40, curveIntensity: 0.15 }
);

// Get style for transport mode
const style = getTransportModeStyle("air");
// Returns: { color: "#EC4899", dashArray: [2, 6], width: 3, animated: true }
```

## Testing the Implementation

### Demo Page
Access the demo page at: `/route-demo`

The demo includes three scenarios:
1. **Multi-Modal Route**: Mumbai to Singapore (air and sea comparison)
2. **Coastal Shipping**: Chennai to Kolkata (sea route with rail connections)
3. **Railway Route**: Original Paradip to Jamshedpur example

### Features to Observe:
- ✅ Curved lines for air routes (pink, dotted, animated)
- ✅ Curved lines for sea routes (blue, dashed, animated)
- ✅ Straight lines for truck/rail routes (green/indigo, solid)
- ✅ Smooth zoom transitions (line width scales)
- ✅ Consistent navy blue theme throughout
- ✅ Interactive hover states showing route details

## Technical Details

### Geodesic Calculations
Uses Turf.js library for accurate geographic calculations:
- **Great Circle Distance**: Shortest path on a sphere
- **Bézier Splines**: Smooth curve interpolation
- **Line Arc Generation**: Curved line segments

### Performance Considerations
- Configurable number of interpolation points (default: 50 for air, 40 for sea)
- Efficient curve generation with memoization potential
- Zoom-level aware rendering reduces complexity at lower zooms

### Browser Compatibility
- Requires Mapbox GL JS v3.15.0+
- Uses `requestAnimationFrame` for smooth animations
- Fallback to linear routes if Bézier calculation fails

## Future Enhancements

### Potential Improvements:
1. **Interactive Curve Editing**: Allow users to adjust curve intensity
2. **Weather Overlay Integration**: Show weather data along curved routes
3. **3D Route Visualization**: Add altitude dimension for air routes
4. **Route Optimization**: Calculate optimal curves based on wind/current
5. **Custom Route Templates**: Pre-defined curve patterns for common routes

### Performance Optimizations:
1. **Curve Caching**: Cache generated curves for repeated routes
2. **Level-of-Detail**: Reduce curve points at lower zoom levels
3. **Web Workers**: Offload curve calculations to background threads
4. **Viewport Culling**: Only render visible route segments

## Dependencies

### New Dependencies:
- `@turf/turf` (^7.1.0): Core geospatial library
- `@turf/bezier-spline`: Bézier curve generation
- `@turf/great-circle`: Great circle calculations
- `@turf/line-arc`: Arc generation utilities

### Existing Dependencies Used:
- `mapbox-gl` (^3.15.0): Map rendering
- `react` (19.1.0): UI framework
- `typescript` (^5): Type safety

## Troubleshooting

### Common Issues:

1. **Curves not appearing**:
   - Ensure route has `segments` array with appropriate `transportMode`
   - Check Mapbox token is configured
   - Verify coordinates are in correct format (latitude/longitude)

2. **Animation not working**:
   - Check browser supports `requestAnimationFrame`
   - Ensure map layer IDs are unique
   - Verify layer exists before attempting animation

3. **Performance issues**:
   - Reduce `numPoints` in curve generation options
   - Implement viewport-based rendering
   - Consider reducing animation frame rate

## Support

For issues or questions:
1. Check the demo page at `/route-demo`
2. Review code examples in `/src/data/MultiModalSimulationData.ts`
3. Consult inline documentation in `/src/lib/route-curves.ts`

## License

This implementation follows the same license as the parent project.
