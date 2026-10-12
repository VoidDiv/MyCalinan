"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Weather = {
  city: string;
  tempC: number;
  feelsLikeC: number;
  condition: string;
  humidity: number;
  windKph: number;
  precipitationMm: number;
  isDay: boolean;
  updatedAt: number; // ms since epoch
};

const REFRESH_MS = 10 * 60 * 1000; // re-fetch every 10 minutes while open
const MIN_GAP_MS = 2 * 60 * 1000; // don't re-fetch on tab focus more than every 2 min
const STALE_MS = 60 * 60 * 1000; // older than 1 hour = flag as outdated

function formatTime(ms: number): string {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(ms));
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const mounted = useRef(true);
  const inFlight = useRef(false);
  const lastFetch = useRef(0);

  const load = useCallback(async (force = false) => {
    if (inFlight.current) return;
    if (!force && Date.now() - lastFetch.current < MIN_GAP_MS) return;

    inFlight.current = true;
    lastFetch.current = Date.now();

    try {
      const res = await fetch("/api/weather", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: Weather = await res.json();
      if (mounted.current) {
        setWeather(data);
        setError(false);
      }
    } catch {
      // Keep the last good reading on screen; just flag the failed refresh.
      if (mounted.current) setError(true);
    } finally {
      inFlight.current = false;
      if (mounted.current) setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load(true);

    const interval = setInterval(() => load(true), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    const onOnline = () => load(true);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      mounted.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [load]);

  const isStale = weather !== null && now - weather.updatedAt > STALE_MS;

  return (
    <section className="px-6 py-8 sm:px-10 sm:py-12 lg:px-20 lg:py-16">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-canopy-600/25 bg-canopy-950 p-5 text-white shadow-xl sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">
            Today&rsquo;s weather
          </h2>
          <span className="font-mono text-xs text-canopy-400">
            {weather ? weather.city : "Calinan, Davao City"}
          </span>
        </div>

        {error && !weather && (
          <p className="mt-3 text-sm text-canopy-400 sm:mt-4">
            Weather is unavailable right now. Check your connection and try again shortly.
          </p>
        )}

        {!error && !weather && (
          <p className="mt-3 font-mono text-sm text-canopy-400 sm:mt-4">Loading…</p>
        )}

        {weather && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:mt-6 sm:grid-cols-4 sm:gap-6">
              <div>
                <p className="font-mono text-xs uppercase text-canopy-400">Temp</p>
                <p className="mt-1 font-display text-2xl sm:text-3xl">{weather.tempC}°C</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase text-canopy-400">Feels like</p>
                <p className="mt-1 font-display text-2xl sm:text-3xl">{weather.feelsLikeC}°C</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase text-canopy-400">Humidity</p>
                <p className="mt-1 font-display text-2xl sm:text-3xl">{weather.humidity}%</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase text-canopy-400">Wind</p>
                <p className="mt-1 font-display text-2xl sm:text-3xl">{weather.windKph} km/h</p>
              </div>
              <p className="col-span-2 mt-1 text-canopy-100/80 sm:col-span-4">
                {weather.condition}
                {weather.precipitationMm > 0 && ` (${weather.precipitationMm} mm)`}
              </p>
            </div>

            <p className="mt-4 text-xs text-canopy-400">
              Updated {formatTime(weather.updatedAt)}
              {isStale && " — this reading may be out of date"}
              {error && !isStale && " — couldn't refresh, showing the last reading"}
            </p>
          </>
        )}
      </div>
    </section>
  );
}