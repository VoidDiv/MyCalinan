// app/api/weather/route.ts
//
// Fetches current weather for Calinan, Davao City using Open-Meteo
// (free, no API key required). Returns the shape expected by
// WeatherWidget.tsx.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 600; // cache for 10 minutes

// Approximate coordinates for Calinan Poblacion, Davao City
const LAT = 7.188;
const LON = 125.456;

// WMO weather codes -> human-readable condition text
// https://open-meteo.com/en/docs (see "WMO Weather interpretation codes")
function describeWeatherCode(code: number): string {
  const map: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };

  return map[code] ?? "Unknown";
}

export async function GET() {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code` +
      `&timezone=Asia%2FManila`;

    const res = await fetch(url, { next: { revalidate: 600 } });

    if (!res.ok) {
      throw new Error(`Open-Meteo responded with ${res.status}`);
    }

    const data = await res.json();
    const current = data.current;

    const weather = {
      city: "Calinan, Davao City",
      tempC: Math.round(current.temperature_2m),
      feelsLikeC: Math.round(current.apparent_temperature),
      condition: describeWeatherCode(current.weather_code),
      humidity: Math.round(current.relative_humidity_2m),
      windKph: Math.round(current.wind_speed_10m),
    };

    return NextResponse.json(weather);
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch weather" },
      { status: 500 }
    );
  }
}