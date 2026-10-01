/* ============================================================
   FILE: lib/calibotWeather.ts   (NEW)
   Live weather for Calinan, Davao City. Only called when the
   question is about weather. Cached 15 min per server instance.
   Uses Open-Meteo (no API key; free tier is for non-commercial
   use, check their terms if MyCalinan becomes commercial).
   Zero Firestore reads.
   ============================================================ */

const LAT = 7.1907;
const LNG = 125.4553;
const CACHE_MS = 15 * 60 * 1000;

const WEATHER_KEYWORDS = [
  "weather", "rain", "raining", "rainy", "ulan", "temperature", "forecast",
  "umbrella", "panahon", "init", "bugnaw", "typhoon", "storm", "humid",
];

const WEATHER_CODES: Record<number, string> = {
  0: "clear sky",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "foggy",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  80: "light rain showers",
  81: "rain showers",
  82: "heavy rain showers",
  95: "thunderstorm",
  96: "thunderstorm with hail",
  99: "thunderstorm with hail",
};

let cache: { at: number; text: string } | null = null;

function isAboutWeather(query: string): boolean {
  const q = ` ${query.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim()} `;
  return WEATHER_KEYWORDS.some((k) => q.includes(` ${k} `) || q.includes(` ${k}s `));
}

export async function getWeatherIfAsked(
  query: string
): Promise<{ asked: boolean; text: string }> {
  if (!isAboutWeather(query)) return { asked: false, text: "" };

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return { asked: true, text: cache.text };
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}` +
      "&current=temperature_2m,apparent_temperature,precipitation,weather_code" +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&timezone=Asia%2FManila&forecast_days=1";

    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    const d = await res.json();

    const condition = WEATHER_CODES[d.current.weather_code] ?? "mixed conditions";
    const text =
      "WEATHER TODAY IN CALINAN (live forecast, may differ slightly from actual conditions):\n" +
      `- Now: ${condition}, ${d.current.temperature_2m}C (feels like ${d.current.apparent_temperature}C)\n` +
      `- Today: high ${d.daily.temperature_2m_max[0]}C, low ${d.daily.temperature_2m_min[0]}C\n` +
      `- Chance of rain today: ${d.daily.precipitation_probability_max[0]}%`;

    cache = { at: Date.now(), text };
    return { asked: true, text };
  } catch (error) {
    console.error("Weather fetch failed:", error);
    return {
      asked: true,
      text:
        cache?.text ??
        "WEATHER: live weather data is unavailable right now. Do not guess the weather; suggest checking PAGASA or a weather app.",
    };
  }
}