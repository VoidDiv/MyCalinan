/* ============================================================
   FILE: lib/calibotWeather.ts   (REPLACE whole file)
   Live weather for Calinan, Davao City, used by Calibot (app/api/chat/route.ts).

   How it works
   - getWeatherIfAsked(question, recentQuestions) first checks whether the visitor is
     asking about the weather (English or Cebuano words). If NOT, it does nothing:
     no network call, no cost.
   - If yes, it fetches the forecast from Open-Meteo (free, no API key), keeps it for
     15 minutes in memory, and returns plain text that the chat route gives to Claude.
   - Follow-ups work: after "Will it rain today?", a short "how about tomorrow?"
     also counts as a weather question (it looks at the last questions).
   - If the weather service is down, Calibot is told NOT to guess (and suggest PAGASA).
   Open-Meteo's free tier is for non-commercial use; check their terms if MyCalinan
   ever becomes commercial.
   ============================================================ */

const LAT = 7.1907;
const LNG = 125.4553;
const CACHE_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 4000;
const FORECAST_DAYS = 3; // today, tomorrow and the day after

/* English + Cebuano words that mean "this is a weather question" */
const WEATHER_KEYWORDS = [
  "weather", "rain", "raining", "rainy", "ulan", "umuulan", "temperature", "forecast",
  "umbrella", "payong", "panahon", "init", "mainit", "bugnaw", "lamig", "typhoon", "bagyo",
  "storm", "humid", "sunny", "cloudy", "hangin",
];

/* Short follow-ups like "how about tomorrow?" only count right after a weather question */
const FOLLOW_UP_WORDS = ["tomorrow", "tonight", "later", "weekend", "bukas", "ugma", "karon", "unya", "sunod"];

/* Open-Meteo weather codes → plain words */
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

type OpenMeteoResponse = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

let cache: { at: number; text: string } | null = null;

/* ---------- helpers ---------- */

function words(text: string): string {
  return ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim()} `;
}

function hasAny(text: string, keywords: string[]): boolean {
  const q = words(text);
  return keywords.some((k) => q.includes(` ${k} `) || q.includes(` ${k}s `));
}

/** Is this message (or a short follow-up to a recent weather question) about the weather? */
function isAboutWeather(question: string, recentQuestions: string[]): boolean {
  if (hasAny(question, WEATHER_KEYWORDS)) return true;
  const isShort = question.trim().split(/\s+/).length <= 6;
  return isShort && hasAny(question, FOLLOW_UP_WORDS) && recentQuestions.some((q) => hasAny(q, WEATHER_KEYWORDS));
}

function dayLabel(isoDate: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  const date = new Date(`${isoDate}T00:00:00+08:00`);
  return Number.isNaN(date.getTime())
    ? isoDate
    : date.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Manila" });
}

function buildText(d: OpenMeteoResponse): string {
  const now = WEATHER_CODES[d.current.weather_code] ?? "mixed conditions";
  const lines = [
    "WEATHER IN CALINAN (live forecast; real conditions may differ slightly):",
    `- Now: ${now}, ${d.current.temperature_2m}C (feels like ${d.current.apparent_temperature}C)`,
  ];
  d.daily.time.forEach((date, i) => {
    const outlook = WEATHER_CODES[d.daily.weather_code[i]] ?? "mixed conditions";
    lines.push(
      `- ${dayLabel(date, i)}: ${outlook}, high ${d.daily.temperature_2m_max[i]}C, low ${d.daily.temperature_2m_min[i]}C, chance of rain ${d.daily.precipitation_probability_max[i]}%`
    );
  });
  return lines.join("\n");
}

/* ---------- public ---------- */

/**
 * Returns the weather text only when the visitor is asking about the weather.
 * Never throws: when the service is down, `text` tells Calibot not to guess.
 */
export async function getWeatherIfAsked(
  question: string,
  recentQuestions: string[] = []
): Promise<{ asked: boolean; text: string }> {
  if (!isAboutWeather(question, recentQuestions)) return { asked: false, text: "" };

  if (cache && Date.now() - cache.at < CACHE_MS) return { asked: true, text: cache.text };

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}` +
      "&current=temperature_2m,apparent_temperature,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      `&timezone=Asia%2FManila&forecast_days=${FORECAST_DAYS}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Weather API ${res.status}`);

    const data = (await res.json()) as OpenMeteoResponse;
    if (!data?.current || !Array.isArray(data?.daily?.time)) throw new Error("Unexpected weather response");

    const text = buildText(data);
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