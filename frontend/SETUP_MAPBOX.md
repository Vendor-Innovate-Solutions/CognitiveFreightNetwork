# Mapbox Setup Guide for Route Simulator Map

## Overview

The RouteSimulatorMap component uses Mapbox GL JS to provide interactive map visualizations. The component includes a fallback static visualization when Mapbox is not configured, but for the full interactive experience, you need to set up a Mapbox access token.

## Features Comparison

### Without Mapbox Token (Static Fallback)
- ✅ Route comparison statistics
- ✅ Key events list with icons
- ✅ Cost/time/distance savings display
- ✅ Static route visualization
- ❌ No interactive map
- ❌ No zoom/pan controls
- ❌ No marker popups

### With Mapbox Token (Full Interactive Map)
- ✅ All fallback features
- ✅ Interactive zoomable/pannable map
- ✅ Clickable route lines with hover effects
- ✅ Interactive event markers with popups
- ✅ Automatic route fitting to bounds
- ✅ Professional map styling (dark theme)

## Setup Instructions

### Step 1: Create a Mapbox Account

1. Go to [https://account.mapbox.com/](https://account.mapbox.com/)
2. Sign up for a free account
3. The free tier includes:
   - 50,000 free map loads per month
   - Unlimited requests for local development

### Step 2: Get Your Access Token

1. Log in to your Mapbox account
2. Navigate to [https://account.mapbox.com/access-tokens/](https://account.mapbox.com/access-tokens/)
3. Copy your "Default public token" OR create a new token
4. For production, create a token with URL restrictions

### Step 3: Configure Your Environment

1. In the `frontend` directory, create a `.env.local` file:

```bash
cd frontend
touch .env.local
```

2. Add your Mapbox token to `.env.local`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoidmVua2F0ZXNoMjFiaXQiLCJhIjoiY21nbmI4OWh1MDEwNzJscTRieWZhZTVxNiJ9.Js6FhT2ViFO69pghJIl_Cw
```

✅ **Status: CONFIGURED** - Your Mapbox token has been set up in `.env.local`

**Important Notes:**
- The file must be named exactly `.env.local`
- The variable must start with `NEXT_PUBLIC_` to be accessible in the browser
- Never commit `.env.local` to version control (it's in `.gitignore`)
- For production, use environment variables in your deployment platform

### Step 4: Restart the Development Server

After creating `.env.local`, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Step 5: Verify the Setup

1. Navigate to `http://localhost:3000/dashboard`
2. You should see an interactive Mapbox map instead of the static fallback
3. Try:
   - Zooming in/out with scroll wheel
   - Panning by dragging
   - Hovering over routes to see details
   - Clicking on event markers to see popups

## Troubleshooting

### Map still shows fallback after adding token

**Possible causes:**
1. Token not properly formatted in `.env.local`
2. Server not restarted after adding token
3. Token has URL restrictions that don't include localhost

**Solutions:**
1. Check that your `.env.local` file has no extra spaces
2. Restart the development server
3. In Mapbox dashboard, ensure token allows `http://localhost:3000`

### "Unauthorized" error in console

**Cause:** Invalid or expired token

**Solution:** 
1. Generate a new token in Mapbox dashboard
2. Update `.env.local` with the new token
3. Restart the server

### Map loads but routes don't show

**Possible causes:**
1. Invalid coordinate data
2. Browser console shows errors

**Solutions:**
1. Check browser console for errors
2. Verify mock data has valid lat/lng coordinates
3. Ensure coordinates are within valid ranges (-90 to 90 for lat, -180 to 180 for lng)

## Production Deployment

### Environment Variables

Set the Mapbox token in your deployment platform:

**Vercel:**
```bash
vercel env add NEXT_PUBLIC_MAPBOX_TOKEN production
```

**Netlify:**
Add to "Site settings" > "Environment variables"

**Docker:**
```dockerfile
ENV NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
```

### Security Best Practices

1. **Use URL Restrictions:** In Mapbox dashboard, restrict token to your production domain
2. **Separate Tokens:** Use different tokens for development and production
3. **Monitor Usage:** Set up usage alerts in Mapbox dashboard
4. **Rate Limiting:** Implement rate limiting if public-facing

### Token Restrictions Example

In Mapbox dashboard, set URL restrictions for production token:
```
https://yourdomain.com/*
https://www.yourdomain.com/*
```

## Cost Estimation

Mapbox pricing (as of 2025):
- **Free tier:** 50,000 map loads/month
- **Pay-as-you-go:** $5 per 1,000 loads after free tier

**Estimated costs for this app:**
- Low traffic (< 1,000 users/month): FREE
- Medium traffic (5,000 users/month): ~$10-20/month
- High traffic (50,000 users/month): ~$200-300/month

## Alternative Map Providers

If Mapbox costs are a concern, consider these alternatives:

1. **Leaflet + OpenStreetMap** (Free)
   - No API key required
   - Good for basic mapping
   - Less performant with large datasets

2. **Google Maps** ($200 free credit/month)
   - Similar features to Mapbox
   - Different pricing model

3. **MapLibre GL JS** (Free, open source)
   - Fork of Mapbox GL JS
   - Requires self-hosted tiles or tile provider

## Support

For Mapbox-specific issues:
- Mapbox Documentation: https://docs.mapbox.com/
- Mapbox Support: https://support.mapbox.com/

For this component's issues:
- Check the component source code
- Review browser console errors
- Verify data format matches types in `src/types/route.ts`
