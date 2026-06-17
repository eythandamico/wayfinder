/**
 * Weather via OpenWeather One Call API 3.0.
 *
 *   docs: https://openweathermap.org/api/one-call-3
 *
 * Free tier: 1000 calls/day; needs OPENWEATHER_API_KEY in env.
 * One Call returns current + hourly + daily forecast in one request,
 * which is exactly what a weather panel needs.
 */

interface Env {
  OPENWEATHER_API_KEY?: string;
}

export type WeatherDay = {
  /** Epoch millis at noon local. */
  ts: number;
  high: number;
  low: number;
  condition: string;
  icon: string;
  /** Probability of precipitation, 0-1. */
  pop: number;
};

export type WeatherResponse = {
  /** Looked-up display name from the geocoder. */
  name: string;
  current: {
    temp: number;
    feelsLike: number;
    condition: string;
    icon: string;
    humidity: number;
    windSpeed: number;
  };
  daily: WeatherDay[];
  error?: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const apiKey = env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return json({
      name: "",
      current: blankCurrent(),
      daily: [],
      error:
        "OPENWEATHER_API_KEY missing — register a free key at openweathermap.org and add it to env.",
    } satisfies WeatherResponse);
  }
  if (!q) {
    return json({
      name: "",
      current: blankCurrent(),
      daily: [],
      error: "missing query",
    } satisfies WeatherResponse);
  }

  try {
    // Step 1: geocode the user's free-text query to lat/lon.
    const geo = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=1&appid=${apiKey}`,
      { cf: { cacheTtl: 3600, cacheEverything: true } } as RequestInit,
    );
    if (!geo.ok) throw new Error(`geocode ${geo.status}`);
    const geoData = (await geo.json()) as Array<{
      name: string;
      lat: number;
      lon: number;
      state?: string;
      country?: string;
    }>;
    if (!geoData[0]) {
      return json({
        name: "",
        current: blankCurrent(),
        daily: [],
        error: `Could not find "${q}"`,
      } satisfies WeatherResponse);
    }
    const { name, lat, lon, state, country } = geoData[0];
    const display = [name, state, country].filter(Boolean).join(", ");

    // Step 2: One Call.
    const oc = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=imperial&appid=${apiKey}`,
      { cf: { cacheTtl: 600, cacheEverything: true } } as RequestInit,
    );
    if (!oc.ok) throw new Error(`onecall ${oc.status}`);
    const ocData = (await oc.json()) as OneCall;

    return json({
      name: display,
      current: {
        temp: ocData.current.temp,
        feelsLike: ocData.current.feels_like,
        condition: ocData.current.weather[0]?.main ?? "—",
        icon: ocData.current.weather[0]?.icon ?? "",
        humidity: ocData.current.humidity,
        windSpeed: ocData.current.wind_speed,
      },
      daily: ocData.daily.slice(0, 7).map((d) => ({
        ts: d.dt * 1000,
        high: d.temp.max,
        low: d.temp.min,
        condition: d.weather[0]?.main ?? "—",
        icon: d.weather[0]?.icon ?? "",
        pop: d.pop,
      })),
    } satisfies WeatherResponse);
  } catch (err) {
    return json({
      name: "",
      current: blankCurrent(),
      daily: [],
      error: err instanceof Error ? err.message : "fetch failed",
    } satisfies WeatherResponse);
  }
};

type OneCall = {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    weather: Array<{ main: string; icon: string }>;
  };
  daily: Array<{
    dt: number;
    temp: { max: number; min: number };
    pop: number;
    weather: Array<{ main: string; icon: string }>;
  }>;
};

function blankCurrent() {
  return {
    temp: 0,
    feelsLike: 0,
    condition: "—",
    icon: "",
    humidity: 0,
    windSpeed: 0,
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
