"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WeatherPoint {
  name: string;
  latitude: number;
  longitude: number;
  temperature?: number;
  windspeed?: number;
  weathercode?: number;
  description?: string;
}

const WEATHER_CODES: { [key: number]: { icon: string; description: string } } = {
  0: { icon: "☀️", description: "Clear sky" },
  1: { icon: "🌤️", description: "Mainly clear" },
  2: { icon: "⛅", description: "Partly cloudy" },
  3: { icon: "☁️", description: "Overcast" },
  45: { icon: "🌫️", description: "Foggy" },
  48: { icon: "🌫️", description: "Depositing rime fog" },
  51: { icon: "🌧️", description: "Light drizzle" },
  53: { icon: "🌧️", description: "Moderate drizzle" },
  55: { icon: "🌧️", description: "Dense drizzle" },
  61: { icon: "🌧️", description: "Slight rain" },
  63: { icon: "🌧️", description: "Moderate rain" },
  65: { icon: "⛈️", description: "Heavy rain" },
  71: { icon: "🌨️", description: "Slight snow" },
  73: { icon: "🌨️", description: "Moderate snow" },
  75: { icon: "❄️", description: "Heavy snow" },
  80: { icon: "🌦️", description: "Slight rain showers" },
  81: { icon: "🌧️", description: "Moderate rain showers" },
  82: { icon: "⛈️", description: "Violent rain showers" },
  95: { icon: "⛈️", description: "Thunderstorm" },
  96: { icon: "⛈️", description: "Thunderstorm with hail" },
  99: { icon: "⛈️", description: "Severe thunderstorm with hail" },
};

const DEFAULT_LOCATIONS: WeatherPoint[] = [
  { name: "Kolkata Port", latitude: 22.5726, longitude: 88.3639 },
  { name: "Visakhapatnam Port", latitude: 17.6868, longitude: 83.2185 },
  { name: "Chennai Port", latitude: 13.0827, longitude: 80.2707 },
  { name: "Paradip Port", latitude: 20.3167, longitude: 86.6167 },
  { name: "Bay of Bengal (Center)", latitude: 15.0, longitude: 85.0 },
];

export default function WeatherCard() {
  const [weatherData, setWeatherData] = useState<WeatherPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await Promise.all(
          DEFAULT_LOCATIONS.map(async (location) => {
            try {
              const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true`;
              const res = await fetch(url);
              if (!res.ok) throw new Error("Failed to fetch weather");
              
              const json = await res.json();
              const cw = json.current_weather || {};
              
              const weatherInfo = WEATHER_CODES[cw.weathercode as number] || {
                icon: "🌍",
                description: "Unknown",
              };

              return {
                ...location,
                temperature: cw.temperature,
                windspeed: cw.windspeed,
                weathercode: cw.weathercode,
                description: weatherInfo.description,
              };
            } catch (err) {
              console.error(`Failed to fetch weather for ${location.name}:`, err);
              return location;
            }
          })
        );

        setWeatherData(results);
      } catch (err) {
        setError("Failed to load weather data");
        console.error("Weather fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = (code?: number) => {
    if (!code) return "🌍";
    return WEATHER_CODES[code]?.icon || "🌍";
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-300 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
            🌤️ Route Weather
          </CardTitle>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-blue-700 hover:text-blue-900 transition-colors p-1 hover:bg-blue-200 rounded"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            )}
          </button>
        </div>
        {!isMinimized && (
          <p className="text-xs text-blue-700 font-semibold mt-1">
            Real-time conditions at key ports
          </p>
        )}
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="pt-0">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-center py-2 text-sm font-semibold">
              ⚠️ {error}
            </div>
          )}

          {!isLoading && !error && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {weatherData.map((location, idx) => (
                <div
                  key={idx}
                  className="bg-white/80 backdrop-blur rounded-md p-2 border border-blue-200 hover:border-blue-400 transition-all duration-200 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-blue-900 text-sm truncate">
                        {location.name}
                      </h4>
                      <p className="text-xs text-blue-600">
                        {location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E
                      </p>
                    </div>
                    <div className="text-center flex-shrink-0">
                      <div className="text-2xl">
                        {getWeatherIcon(location.weathercode)}
                      </div>
                      {location.temperature !== undefined ? (
                        <div className="text-lg font-bold text-blue-900">
                          {location.temperature}°C
                        </div>
                      ) : (
                        <div className="text-xs text-blue-600">N/A</div>
                      )}
                    </div>
                  </div>
                  {location.description && (
                    <p className="text-xs text-blue-700 mt-1 font-medium">
                      {location.description}
                    </p>
                  )}
                  {location.windspeed !== undefined && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      💨 {location.windspeed} km/h
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-xs text-blue-600 text-center font-semibold">
            🔄 Updates every 10 min
          </div>
        </CardContent>
      )}
    </Card>
  );
}
