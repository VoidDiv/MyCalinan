"use client";

import { useEffect, useState } from "react";

type Weather = {
  city: string;
  tempC: number;
  feelsLikeC: number;
  condition: string;
  humidity: number;
  windKph: number;
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/weather")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: Weather) => {
        if (!cancelled) setWeather(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

        {error && (
          <p className="mt-3 text-sm text-canopy-400 sm:mt-4">
            Weather is unavailable right now — try again shortly.
          </p>
        )}

        {!error && !weather && (
          <p className="mt-3 font-mono text-sm text-canopy-400 sm:mt-4">Loading…</p>
        )}

        {weather && (
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
            <p className="col-span-2 mt-1 capitalize text-canopy-100/80 sm:col-span-4">
              {weather.condition}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

