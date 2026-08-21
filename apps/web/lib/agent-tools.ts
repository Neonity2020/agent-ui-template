import { jsonSchema } from "ai"

import { agentById } from "@/lib/agents"

const expressionSchema = jsonSchema<{ expression: string }>({
  type: "object",
  properties: {
    expression: {
      type: "string",
      description: "A basic arithmetic expression using numbers, parentheses, +, -, *, /, or %.",
    },
  },
  required: ["expression"],
  additionalProperties: false,
})

const timeSchema = jsonSchema<{ timeZone?: string }>({
  type: "object",
  properties: {
    timeZone: {
      type: "string",
      description: "Optional IANA time zone, for example Asia/Shanghai or America/New_York.",
    },
  },
  additionalProperties: false,
})

const agentInfoSchema = jsonSchema<{ agentId: string }>({
  type: "object",
  properties: { agentId: { type: "string", description: "The configured agent ID." } },
  required: ["agentId"],
  additionalProperties: false,
})

const weatherSchema = jsonSchema<{ location: string }>({
  type: "object",
  properties: {
    location: {
      type: "string",
      description: "A city and, when useful, country or region; for example Shanghai, CN or Paris, France.",
    },
  },
  required: ["location"],
  additionalProperties: false,
})

/**
 * Server-only, deterministic tools. They intentionally do not expose shell,
 * network, or arbitrary database access to the model.
 */
export const agentTools = {
  calculate: {
    description: "Evaluate a basic arithmetic expression exactly. Use it whenever a calculation would improve accuracy.",
    inputSchema: expressionSchema,
    execute: async ({ expression }: { expression: string }) => ({
      expression,
      result: evaluateExpression(expression),
    }),
  },
  getCurrentTime: {
    description: "Get the current date and time in an optional IANA time zone.",
    inputSchema: timeSchema,
    execute: async ({ timeZone }: { timeZone?: string }) => {
      try {
        const now = new Date()
        return {
          timeZone: timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          iso: now.toISOString(),
          local: new Intl.DateTimeFormat("en-CA", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone,
          }).format(now),
        }
      } catch {
        return { error: `Invalid time zone: ${timeZone}` }
      }
    },
  },
  getAgentInfo: {
    description: "Look up the configured name, role, and capabilities of an available assistant agent.",
    inputSchema: agentInfoSchema,
    execute: async ({ agentId }: { agentId: string }) => {
      const agent = agentById(agentId)
      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        description: agent.description,
      }
    },
  },
  getWeather: {
    description: "Look up current weather and today's outlook for a city. Use it for weather questions instead of guessing.",
    inputSchema: weatherSchema,
    execute: async ({ location }: { location: string }) => getWeather(location),
  },
}

function evaluateExpression(expression: string): number | { error: string } {
  const normalized = expression.replace(/\s+/g, "")
  if (!normalized || normalized.length > 200 || !/^[0-9()+\-*/%.]+$/.test(normalized)) {
    return { error: "Only numbers, parentheses, and + - * / % operators are allowed." }
  }

  // Characters are allow-listed above; this has no names, property access, or
  // statements available to execute. The finite-result check handles /0 too.
  const result = Function(`"use strict"; return (${normalized})`)() as number
  return Number.isFinite(result) ? result : { error: "The expression did not produce a finite number." }
}

type GeocodingResponse = {
  results?: Array<{
    name: string
    latitude: number
    longitude: number
    country?: string
    admin1?: string
  }>
}

type WeatherResponse = {
  current?: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    precipitation: number
    weather_code: number
    wind_speed_10m: number
  }
  daily?: {
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
  }
}

async function getWeather(location: string) {
  const query = normalizeLocation(location)
  if (query.length < 2 || query.length > 100) return { error: "Please provide a city or region name." }

  try {
    const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search")
    geocodingUrl.searchParams.set("name", query)
    geocodingUrl.searchParams.set("count", "1")
    geocodingUrl.searchParams.set("language", "en")
    geocodingUrl.searchParams.set("format", "json")
    const geocoding = await fetchJson<GeocodingResponse>(geocodingUrl)
    const place = geocoding.results?.[0]
    if (!place) return { error: `No location was found for “${query}”.` }

    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast")
    weatherUrl.searchParams.set("latitude", String(place.latitude))
    weatherUrl.searchParams.set("longitude", String(place.longitude))
    weatherUrl.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    )
    weatherUrl.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    )
    weatherUrl.searchParams.set("forecast_days", "1")
    weatherUrl.searchParams.set("timezone", "auto")
    const weather = await fetchJson<WeatherResponse>(weatherUrl)
    if (!weather.current) return { error: "Weather service returned no current conditions." }

    return {
      location: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
      observedAt: weather.current.time,
      current: {
        condition: weatherCondition(weather.current.weather_code),
        temperatureC: weather.current.temperature_2m,
        apparentTemperatureC: weather.current.apparent_temperature,
        humidityPercent: weather.current.relative_humidity_2m,
        precipitationMm: weather.current.precipitation,
        windSpeedKph: weather.current.wind_speed_10m,
      },
      today: {
        highC: weather.daily?.temperature_2m_max[0],
        lowC: weather.daily?.temperature_2m_min[0],
        precipitationChancePercent: weather.daily?.precipitation_probability_max[0],
      },
      source: "Open-Meteo",
    }
  } catch (error) {
    console.error("[agent] weather lookup failed", error)
    const reason = error instanceof Error ? error.message : "Unknown network error"
    return { error: `Weather lookup is temporarily unavailable: ${reason}` }
  }
}

async function fetchJson<T>(url: URL): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
      if (!response.ok) throw new Error(`Weather service responded with ${response.status}`)
      return (await response.json()) as T
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function normalizeLocation(location: string): string {
  const value = location.trim()
  const aliases: Record<string, string> = {
    北京: "Beijing",
    上海: "Shanghai",
    广州: "Guangzhou",
    深圳: "Shenzhen",
    杭州: "Hangzhou",
    成都: "Chengdu",
    重庆: "Chongqing",
    武汉: "Wuhan",
    西安: "Xi'an",
    南京: "Nanjing",
    香港: "Hong Kong",
    台北: "Taipei",
    东京: "Tokyo",
    首尔: "Seoul",
    新加坡: "Singapore",
    伦敦: "London",
    巴黎: "Paris",
    纽约: "New York",
    洛杉矶: "Los Angeles",
  }
  return aliases[value] ?? value
}

function weatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Heavy rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Severe thunderstorm with hail",
  }
  return conditions[code] ?? `Weather code ${code}`
}
