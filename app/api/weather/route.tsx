// app/api/weather/route.ts
//
// Current weather for Calinan, Davao City via Open-Meteo (free, no API key).
// Returns the shape expected by WeatherWidget.tsx.
//
// Accuracy notes:
// - Open-Meteo "current" values are model estimates refreshed every 15 minutes,
//   not readings from a weather station in Calinan.
// - We return `updatedAt` (the time the reading is valid for) so the UI can
//   show how fresh the data is, including when the PWA is offline.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 300; // 5 min — Open-Meteo updates "current" every 15 min

// Approximate coordinates for Calinan Poblacion, Davao City
const LAT = 7.188;
const LON = 125.456;
const CACHE_SECONDS = 300;

// WMO weather codes -> condition text (snow/freezing codes dropped: never occur in Davao)
const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Moderate rain",
  65: "Heavy rain",
  80: "Light rain showers",
  81: "Moderate rain showers",
  82: "Heavy rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

function describeWeather(code: number, isDay: boolean, precipitationMm: number): string {
  const isRainCode = code >= 51;

  // The model's weather code sometimes lags behind its own rainfall value.
  // If rain is falling but the code says clear/cloudy, trust the rainfall.
  if (!isRainCode && precipitationMm > 0) {
    return precipitationMm >= 1 ? "Rain" : "Light rain";
  }

  // "Clear sky" at 10 PM reads oddly — use night wording.
  if (!isDay && code === 0) return "Clear night";
  if (!isDay && code === 1) return "Mainly clear night";

  return WMO_CODES[code] ?? "Unknown";
}

function toNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid value from Open-Meteo: ${String(value)}`);
  }
  return value;
}

export async function GET() {
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${LAT}&longitude=${LON}` +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature," +
      "precipitation,weather_code,wind_speed_10m,is_day" +
      "&wind_speed_unit=kmh" +
      "&timezone=Asia%2FManila" +
      "&timeformat=unixtime";

    const res = await fetch(url, { next: { revalidate: CACHE_SECONDS } });

    if (!res.ok) {
      throw new Error(`Open-Meteo responded with ${res.status}`);
    }

    const data = await res.json();
    const current = data?.current;
    if (!current) throw new Error("Open-Meteo response missing `current`");

    const precipitationMm = toNumber(current.precipitation);
    const isDay = toNumber(current.is_day) === 1;

    const weather = {
      city: "Calinan, Davao City",
      tempC: Math.round(toNumber(current.temperature_2m)),
      feelsLikeC: Math.round(toNumber(current.apparent_temperature)),
      condition: describeWeather(toNumber(current.weather_code), isDay, precipitationMm),
      humidity: Math.round(toNumber(current.relative_humidity_2m)),
      windKph: Math.round(toNumber(current.wind_speed_10m)),
      precipitationMm: Math.round(precipitationMm * 10) / 10,
      isDay,
      updatedAt: toNumber(current.time) * 1000, // ms since epoch
    };

    return NextResponse.json(weather, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
      },
    });
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch weather" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}