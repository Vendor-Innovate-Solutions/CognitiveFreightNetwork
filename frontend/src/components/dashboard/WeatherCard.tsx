"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WeatherData {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

interface WeatherCardProps {
  routeCities: string[];
  className?: string;
}

const WeatherCard: React.FC<WeatherCardProps> = ({
  routeCities,
  className = "",
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock weather data for demonstration (In production, use actual weather API)
  const getMockWeatherData = (city: string): WeatherData => {
    const weatherConditions = [
      { condition: "Sunny", icon: "☀️", temp: 28 },
      { condition: "Partly Cloudy", icon: "⛅", temp: 25 },
      { condition: "Cloudy", icon: "☁️", temp: 22 },
      { condition: "Light Rain", icon: "🌦️", temp: 20 },
      { condition: "Clear", icon: "🌤️", temp: 26 },
    ];

    const cityIndex = city.length % weatherConditions.length;
    const weather = weatherConditions[cityIndex];

    return {
      city,
      temperature: weather.temp + Math.floor(Math.random() * 8) - 4, // Vary ±4°C
      condition: weather.condition,
      humidity: 45 + Math.floor(Math.random() * 30), // 45-75%
      windSpeed: 5 + Math.floor(Math.random() * 15), // 5-20 km/h
      icon: weather.icon,
    };
  };

  useEffect(() => {
    const fetchWeatherData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const allWeatherData = routeCities.map(city => getMockWeatherData(city));
        setWeatherData(allWeatherData);
      } catch (err) {
        setError("Failed to fetch weather data");
        console.error("Weather fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (routeCities && routeCities.length > 0) {
      fetchWeatherData();
    }
  }, [routeCities]);

  const getWeatherAdvice = (allWeatherData: WeatherData[]): string => {
    const hasRain = allWeatherData.some(w => w.condition.includes("Rain"));
    const maxTemp = Math.max(...allWeatherData.map(w => w.temperature));
    const maxWind = Math.max(...allWeatherData.map(w => w.windSpeed));
    const tempRange = Math.max(...allWeatherData.map(w => w.temperature)) - Math.min(...allWeatherData.map(w => w.temperature));

    if (hasRain) {
      return "⚠️ Rain expected along route - consider waterproof packaging";
    }
    if (maxTemp > 35) {
      return "🌡️ High temperatures detected - ensure temperature-sensitive cargo protection";
    }
    if (maxWind > 25) {
      return "💨 High winds reported along route - secure loose cargo properly";
    }
    if (tempRange > 10) {
      return `🌡️ Temperature varies by ${tempRange}°C along route - consider climate control`;
    }
    return "✅ Good weather conditions for transport";
  };

  if (loading) {
    return (
      <Card className={`bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 shadow-sm ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
            🌤️ Route Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-blue-700">Loading weather...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weatherData || weatherData.length === 0) {
    return (
      <Card className={`bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 shadow-sm ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-gray-700 flex items-center gap-2">
            🌤️ Route Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-600">Weather data unavailable</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
          🌤️ Route Weather
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weather Along Route */}
        <div className={`grid gap-3 ${weatherData.length <= 2 ? 'grid-cols-2' : weatherData.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
          {weatherData.map((weather, index) => (
            <div key={weather.city} className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-blue-800">{weather.city}</span>
                  {index === 0 && <span className="text-xs text-blue-600">Origin</span>}
                  {index === weatherData.length - 1 && weatherData.length > 1 && <span className="text-xs text-blue-600">Destination</span>}
                  {index > 0 && index < weatherData.length - 1 && <span className="text-xs text-blue-600">Via</span>}
                </div>
                <span className="text-2xl">{weather.icon}</span>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-blue-900">
                  {weather.temperature}°C
                </p>
                <p className="text-xs text-blue-700">{weather.condition}</p>
                <div className="flex justify-between text-xs text-blue-600">
                  <span>💧 {weather.humidity}%</span>
                  <span>💨 {weather.windSpeed}km/h</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Weather Advice */}
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-blue-100">
          <p className="text-sm text-blue-800 font-medium">
            {getWeatherAdvice(weatherData)}
          </p>
        </div>

        {/* Route Weather Summary */}
        {weatherData.length > 2 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <p className="text-orange-700 font-semibold">Temperature Range</p>
                <p className="text-orange-800">
                  {Math.min(...weatherData.map(w => w.temperature))}°C - {Math.max(...weatherData.map(w => w.temperature))}°C
                </p>
              </div>
              <div className="text-center">
                <p className="text-orange-700 font-semibold">Conditions</p>
                <p className="text-orange-800">
                  {weatherData.some(w => w.condition.includes("Rain")) ? "Rain Expected" : "Clear Route"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-orange-700 font-semibold">Max Wind</p>
                <p className="text-orange-800">
                  {Math.max(...weatherData.map(w => w.windSpeed))}km/h
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeatherCard;
