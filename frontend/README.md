# Cognitive Freight Network - Frontend

This is the frontend dashboard for the Cognitive Freight Network (CFN), built with [Next.js](https://nextjs.org) and featuring AI-powered logistics intelligence visualizations.

## Features

### 📊 Interactive Dashboards
- Real-time analytics charts for port dwell time, route efficiency, and cost analysis
- Smart chart detection (automatically switches between line and bar charts)
- Export capabilities (PNG, PDF, CSV)

### 🗺️ Route Simulator Map
- Interactive map visualization of logistics routes using Mapbox GL JS
- Visual comparison of "Actual" vs "Optimized" routes
- Event markers for congestion, reroutes, delays, and checkpoints
- Automatic fallback to static visualization when Mapbox is not configured
- Hover/click interactions with detailed popups

### 🎨 Modern UI/UX
- Dark theme design optimized for operations centers
- Responsive layout for desktop and mobile
- Smooth animations and transitions
- Backdrop blur effects and glassmorphism

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- (Optional) Mapbox access token for interactive maps

### Installation

First, install dependencies:

```bash
npm install
```

### Configuration

For full map functionality, configure your Mapbox token:

1. Copy the example environment file:

```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your Mapbox token:

```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

See [SETUP_MAPBOX.md](./SETUP_MAPBOX.md) for detailed setup instructions.

**Note:** The app works without a Mapbox token - it will show a static map visualization with all data.

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) with your browser to see the dashboard.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── dashboard/         # Dashboard page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── dashboard/         # Dashboard components
│   │   │   ├── RouteSimulatorMap.tsx      # Interactive map
│   │   │   ├── RouteMapFallback.tsx       # Static fallback
│   │   │   ├── SmartChart.tsx             # Auto-detecting chart
│   │   │   ├── LineChartComponent.tsx     # Line chart
│   │   │   ├── BarChartComponent.tsx      # Bar chart
│   │   │   └── ChartCard.tsx              # Chart container
│   │   └── ui/                # shadcn/ui components
│   ├── data/
│   │   ├── ChartMockData.ts              # Chart demo data
│   │   └── RouteSimulationData.ts        # Route demo data
│   ├── lib/
│   │   └── chartUtils.ts      # Chart utilities
│   └── types/
│       ├── chart.ts           # Chart type definitions
│       └── route.ts           # Route type definitions
├── public/                    # Static assets
├── MAP_COMPONENT_README.md    # Map component docs
├── SETUP_MAPBOX.md           # Mapbox setup guide
└── package.json
```

## Key Components

### RouteSimulatorMap

The main interactive map component that visualizes logistics routes.

**Props:**
- `simulationData: SimulationData` - Route and event data
- `height?: string` - Map height (default: "600px")
- `className?: string` - Additional CSS classes

**Features:**
- Displays multiple routes with distinct styling
- Interactive event markers with popups
- Automatic bounds fitting
- Hover effects on routes
- Route comparison statistics

See [MAP_COMPONENT_README.md](./MAP_COMPONENT_README.md) for detailed documentation.

### SmartChart

Auto-detecting chart component that chooses between line and bar charts based on data.

**Props:**
- `title: string` - Chart title
- `subtitle?: string` - Chart subtitle
- `data: ChartData` - Chart data
- `isLoading?: boolean` - Loading state
- `yKeys?: string[]` - Y-axis keys to display

## Technologies Used

- **Framework:** Next.js 15.5 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4.0
- **Charts:** Recharts
- **Maps:** Mapbox GL JS
- **UI Components:** shadcn/ui
- **Icons:** Lucide React

## Development

### Linting

```bash
npm run lint
```

### Type Checking

TypeScript is checked automatically during build. For manual checking:

```bash
npx tsc --noEmit
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox access token for interactive maps | No (falls back to static visualization) |

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)
- [Recharts Documentation](https://recharts.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## License

Part of the Cognitive Freight Network project.
