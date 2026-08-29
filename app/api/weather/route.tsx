// app/api/weather/route.tsx
import { NextResponse } from "next/server";

// Barangay Calinan, Davao City coordinates
const LAT = 7.2005;
const LON = 125.4553;

// WMO weather codes -> readable condition
function getCondition(code: number): string {
  const map: Record<number, string> = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "depositing rime fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    61: "slight rain",
    63: "moderate rain",
    65: "heavy rain",
    80: "rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    95: "thunderstorm",
    96: "thunderstorm with hail",
    99: "thunderstorm with heavy hail",
  };
  return map[code] ?? "unknown";
}

export async function GET() {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code` +
      `&timezone=Asia/Manila`;

    const res = await fetch(url, { next: { revalidate: 600 } }); // cache 10 min

    if (!res.ok) {
      return NextResponse.json({ error: "Weather fetch failed" }, { status: 502 });
    }

    const data = await res.json();
    const current = data.current;

    return NextResponse.json({
      city: "Calinan, Davao City",
      tempC: Math.round(current.temperature_2m),
      feelsLikeC: Math.round(current.apparent_temperature),
      condition: getCondition(current.weather_code),
      humidity: Math.round(current.relative_humidity_2m),
      windKph: Math.round(current.wind_speed_10m),
    });
  } catch (err) {
    return NextResponse.json({ error: "Weather fetch failed" }, { status: 500 });
  }
}