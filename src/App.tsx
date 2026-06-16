import { useCallback, useEffect, useState, type FormEvent } from 'react'
import './App.css'

type LocationResult = {
  label: string
  latitude: number
  longitude: number
}

type SearchApiResult = {
  name: string
  country: string
  admin1?: string
  latitude: number
  longitude: number
}

type WeatherResponse = {
  timezone: string
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    weather_code: number
    relative_humidity_2m: number
    wind_speed_10m: number
    uv_index: number
    is_day: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    precipitation_probability: number[]
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
  }
}

const presets: LocationResult[] = [
  { label: 'Москва', latitude: 55.7558, longitude: 37.6173 },
  { label: 'Санкт-Петербург', latitude: 59.9386, longitude: 30.3141 },
  { label: 'Казань', latitude: 55.8304, longitude: 49.0661 },
  { label: 'Новосибирск', latitude: 55.0084, longitude: 82.9357 },
]

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

const shortDayFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const hourFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
})

const parseApiLocalDate = (value: string) => {
  if (!value) {
    return new Date('')
  }

  const [date, time] = value.split('T')
  if (!date || !time) {
    return new Date(value)
  }

  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)

  return new Date(Date.UTC(year, month - 1, day, hour, minute))
}

const formatApiLocalTime = (
  value: string,
  options: Intl.DateTimeFormatOptions,
) => {
  const date = parseApiLocalDate(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ru-RU', { ...options, timeZone: 'UTC' }).format(date)
}

const weatherLabel = (code: number) => {
  if (code === 0) return 'Ясно'
  if (code === 1) return 'Преимущественно ясно'
  if (code === 2) return 'Переменная облачность'
  if (code === 3) return 'Пасмурно'
  if (code === 45 || code === 48) return 'Туман'
  if (code >= 51 && code <= 57) return 'Морось'
  if (code >= 61 && code <= 67) return 'Дождь'
  if (code >= 71 && code <= 77) return 'Снег'
  if (code >= 80 && code <= 82) return 'Ливни'
  if (code >= 85 && code <= 86) return 'Снежные заряды'
  if (code >= 95) return 'Гроза'
  return 'Погода'
}

const weatherIcon = (code: number, isDay: number) => {
  if (code === 0) return isDay ? '☀️' : '🌙'
  if (code === 1) return isDay ? '🌤️' : '🌙'
  if (code === 2) return '⛅'
  if (code === 3) return '☁️'
  if (code === 45 || code === 48) return '🌫️'
  if (code >= 51 && code <= 57) return '💧'
  if (code >= 61 && code <= 67) return '🌧️'
  if (code >= 71 && code <= 77) return '❄️'
  if (code >= 80 && code <= 82) return '🌦️'
  if (code >= 85 && code <= 86) return '🌨️'
  if (code >= 95) return '⛈️'
  return '🌍'
}

const getWeatherIconSVG = (code: number, isDay: number) => {
  const sunSVG = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><style>.sun-ray{fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round}</style></defs><circle cx="32" cy="32" r="20" fill="currentColor" opacity="0.9"/><g class="sun-ray"><line x1="32" y1="8" x2="32" y2="2"/><line x1="32" y1="62" x2="32" y2="56"/><line x1="56" y1="32" x2="62" y2="32"/><line x1="8" y1="32" x2="2" y2="32"/><line x1="50" y1="14" x2="54" y2="10"/><line x1="14" y1="50" x2="10" y2="54"/><line x1="50" y1="50" x2="54" y2="54"/><line x1="14" y1="14" x2="10" y2="10"/></g></svg>'
  
  const moonSVG = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><style>.moon-shadow{fill:#000;opacity:0.3}</style></defs><path d="M32 12c11 0 20 9 20 20s-9 20-20 20S12 43 12 32s9-20 20-20z" fill="currentColor"/><circle cx="42" cy="28" r="16" class="moon-shadow"/></svg>'
  
  const cloudySVG = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M48 20c2.2 0 4-1.8 4-4s-1.8-4-4-4c-1.8 0-3.3 1.2-3.8 2.8C42.8 12 40.6 10 38 10c-3.3 0-6 2.7-6 6 0 .5.1 1 .2 1.5C30.4 16 28 14 25 14c-4.4 0-8 3.6-8 8 0 .7.1 1.4.3 2C15.3 24 12 27.6 12 32c0 5.5 4.5 10 10 10h26c5.5 0 10-4.5 10-10s-4.5-10-10-10z" fill="currentColor" opacity="0.85"/></svg>'
  
  const rainSVG = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M48 20c2.2 0 4-1.8 4-4s-1.8-4-4-4c-1.8 0-3.3 1.2-3.8 2.8C42.8 12 40.6 10 38 10c-3.3 0-6 2.7-6 6 0 .5.1 1 .2 1.5C30.4 16 28 14 25 14c-4.4 0-8 3.6-8 8 0 .7.1 1.4.3 2C15.3 24 12 27.6 12 32c0 5.5 4.5 10 10 10h26c5.5 0 10-4.5 10-10s-4.5-10-10-10z" fill="currentColor" opacity="0.75"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="45" x2="16" y2="53"/><line x1="30" y1="45" x2="28" y2="53"/><line x1="42" y1="45" x2="40" y2="53"/></g></svg>'
  
  const snowSVG = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M48 20c2.2 0 4-1.8 4-4s-1.8-4-4-4c-1.8 0-3.3 1.2-3.8 2.8C42.8 12 40.6 10 38 10c-3.3 0-6 2.7-6 6 0 .5.1 1 .2 1.5C30.4 16 28 14 25 14c-4.4 0-8 3.6-8 8 0 .7.1 1.4.3 2C15.3 24 12 27.6 12 32c0 5.5 4.5 10 10 10h26c5.5 0 10-4.5 10-10s-4.5-10-10-10z" fill="currentColor" opacity="0.75"/><g fill="currentColor"><circle cx="20" cy="47" r="2"/><circle cx="32" cy="47" r="2"/><circle cx="44" cy="47" r="2"/><circle cx="20" cy="56" r="2"/><circle cx="32" cy="56" r="2"/><circle cx="44" cy="56" r="2"/></g></svg>'
  
  const stormSVG = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M48 20c2.2 0 4-1.8 4-4s-1.8-4-4-4c-1.8 0-3.3 1.2-3.8 2.8C42.8 12 40.6 10 38 10c-3.3 0-6 2.7-6 6 0 .5.1 1 .2 1.5C30.4 16 28 14 25 14c-4.4 0-8 3.6-8 8 0 .7.1 1.4.3 2C15.3 24 12 27.6 12 32c0 5.5 4.5 10 10 10h26c5.5 0 10-4.5 10-10s-4.5-10-10-10z" fill="currentColor" opacity="0.75"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="16" y1="46" x2="14" y2="54"/><line x1="28" y1="46" x2="26" y2="54"/><line x1="40" y1="46" x2="38" y2="54"/><polyline points="22,50 26,48 30,52" fill="none"/><polyline points="34,50 38,48 42,52" fill="none"/></g></svg>'
  
  const mistSVG = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor" opacity="0.6"><rect x="12" y="20" width="40" height="3" rx="1.5"/><rect x="12" y="30" width="38" height="3" rx="1.5"/><rect x="12" y="40" width="40" height="3" rx="1.5"/><rect x="12" y="50" width="36" height="3" rx="1.5"/></g></svg>'
  
  if (code === 0) return isDay ? sunSVG : moonSVG
  if (code === 1) return isDay ? sunSVG : moonSVG
  if (code === 2) return cloudySVG
  if (code === 3) return cloudySVG
  if (code === 45 || code === 48) return mistSVG
  if (code >= 51 && code <= 57) return rainSVG
  if (code >= 61 && code <= 67) return rainSVG
  if (code >= 71 && code <= 77) return snowSVG
  if (code >= 80 && code <= 82) return rainSVG
  if (code >= 85 && code <= 86) return snowSVG
  if (code >= 95) return stormSVG
  return cloudySVG
}

const formatLocationLabel = (result: SearchApiResult) => {
  const parts = [result.name, result.admin1, result.country].filter(Boolean)
  return parts.join(', ')
}

type IpLocationCandidate = {
  latitude?: number
  longitude?: number
  city?: string
  cityName?: string
  region?: string
  regionName?: string
  state?: string
  country?: string
  countryName?: string
  country_name?: string
  success?: boolean
}

const resolveIpLocation = async (): Promise<LocationResult | null> => {
  const sources = [
    {
      url: 'https://freeipapi.com/api/json',
      extract: (data: IpLocationCandidate) => ({
        latitude: data.latitude,
        longitude: data.longitude,
        parts: [data.cityName, data.regionName, data.countryName],
      }),
    },
    {
      url: 'https://geolocation-db.com/json/',
      extract: (data: IpLocationCandidate) => ({
        latitude: data.latitude,
        longitude: data.longitude,
        parts: [data.city, data.state, data.country_name],
      }),
    },
    {
      url: 'https://ipwho.is/',
      extract: (data: IpLocationCandidate) => ({
        latitude: data.latitude,
        longitude: data.longitude,
        parts: [data.city, data.region, data.country],
      }),
    },
    {
      url: 'https://get.geojs.io/v1/ip/geo.json',
      extract: (data: IpLocationCandidate) => ({
        latitude: data.latitude,
        longitude: data.longitude,
        parts: [data.city, data.region, data.country],
      }),
    },
  ]

  async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T> {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { signal: controller.signal })

      if (!response.ok) {
        throw new Error('request failed')
      }

      return (await response.json()) as T
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  for (const source of sources) {
    try {
      const data = await fetchJsonWithTimeout<IpLocationCandidate>(source.url, 1800)
      const extracted = source.extract(data)
      const labelParts = extracted.parts.filter(Boolean)
      const locationParts = extracted.parts.slice(0, 2).filter(Boolean)

      if (
        typeof extracted.latitude === 'number' &&
        typeof extracted.longitude === 'number' &&
        locationParts.length > 0
      ) {
        const rawCity = extracted.parts.filter(Boolean)[0] || labelParts[0] || ''

        const transliterateToCyrillic = (input: string) => {
          if (!input) return input
          const lower = input.toLowerCase()
          const pairs: [RegExp, string][] = [
            [/shch/g, 'щ'],
            [/sch/g, 'щ'],
            [/sh/g, 'ш'],
            [/ch/g, 'ч'],
            [/ya/g, 'я'],
            [/yo/g, 'ё'],
            [/yu/g, 'ю'],
            [/zh/g, 'ж'],
            [/ts/g, 'ц'],
          ]

          let out = lower
          for (const [re, sub] of pairs) out = out.replace(re, sub)

          const single: Record<string, string> = {
            a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и',
            j: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р',
            s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', c: 'к', w: 'в', x: 'кс', q: 'к', y: 'ы'
          }

          out = out.split('').map(ch => single[ch] ?? ch).join('')
          // preserve capitalization from original
          if (input[0] && input[0] === input[0].toUpperCase()) {
            out = out.charAt(0).toUpperCase() + out.slice(1)
          }
          return out
        }

        const city = /[\u0400-\u04FF]/.test(rawCity) ? rawCity : transliterateToCyrillic(rawCity)

        return {
          // show only the city name (in Russian when possible)
          label: city,
          latitude: extracted.latitude,
          longitude: extracted.longitude,
        }
      }
    } catch {
      continue
    }
  }

  return null
}


function App() {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState<LocationResult | null>(null)
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [localTimeLabel, setLocalTimeLabel] = useState<string>(hourFormatter.format(new Date()))

  const loadWeather = useCallback(async (targetLocation: LocationResult) => {
    setStatus('loading')
    setError(null)

    try {
      const params = new URLSearchParams({
        latitude: String(targetLocation.latitude),
        longitude: String(targetLocation.longitude),
        current:
          'temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,uv_index,is_day',
        hourly: 'temperature_2m,weather_code,precipitation_probability',
        daily:
          'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
        forecast_days: '7',
        timezone: 'auto',
      })

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      )

      if (!response.ok) {
        throw new Error('Не удалось загрузить прогноз погоды')
      }

      const data = (await response.json()) as WeatherResponse

      setLocation(targetLocation)
      setWeather(data)
      setLastUpdated(
        new Intl.DateTimeFormat('ru-RU', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: data.timezone,
        }).format(new Date()),
      )
      setStatus('ready')
    } catch (fetchError) {
      setStatus('error')
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Не удалось загрузить прогноз погоды',
      )
    }
  }, [])

  const searchCity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      setError('Введите название города')
      return
    }

    setStatus('loading')
    setError(null)

    try {
      const searchParams = new URLSearchParams({
        name: trimmedQuery,
        count: '1',
        language: 'ru',
        format: 'json',
      })

      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?${searchParams.toString()}`,
      )

      if (!response.ok) {
        throw new Error('Не удалось найти город')
      }

      const data = (await response.json()) as {
        results?: SearchApiResult[]
      }

      const result = data.results?.[0]

      if (!result) {
        throw new Error('Город не найден. Попробуйте другой запрос')
      }

      await loadWeather({
        label: formatLocationLabel(result),
        latitude: result.latitude,
        longitude: result.longitude,
      })
    } catch (searchError) {
      setStatus('error')
      setError(
        searchError instanceof Error ? searchError.message : 'Не удалось найти город',
      )
    }
  }

  const detectCurrentLocation = useCallback(
    async (options?: { silentOnFail?: boolean }) => {
      const silentOnFail = options?.silentOnFail ?? false
      setError(null)

      if (!navigator.geolocation) {
        if (silentOnFail) {
          setStatus('idle')
          return
        }

        setError('Геолокация не поддерживается в этом браузере')
        setStatus('error')
        return
      }

      setStatus('loading')

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const reverseParams = new URLSearchParams({
              lat: String(coords.latitude),
              lon: String(coords.longitude),
              language: 'ru',
              format: 'jsonv2',
              addressdetails: '1',
            })

            const reverseResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?${reverseParams.toString()}`,
            )

            if (!reverseResponse.ok) {
              throw new Error('Не удалось определить ваше местоположение')
            }

            const reverseData = (await reverseResponse.json()) as {
              address?: {
                city?: string
                town?: string
                village?: string
                municipality?: string
                county?: string
                state?: string
                country?: string
              }
            }

            const address = reverseData.address
            const cityParts = [
              address?.city,
              address?.town,
              address?.village,
              address?.municipality,
            ].filter(Boolean)

            const regionParts = [address?.county, address?.state].filter(Boolean)
            const fallbackParts = [address?.country].filter(Boolean)
            const locationParts =
              cityParts.length > 0 ? [...cityParts, ...regionParts] : fallbackParts

            const primaryPlace = cityParts[0] || locationParts[0] || ''
            const containsCityWord = /\b(город|gorod|city)\b/i.test(primaryPlace)
            const labelText = primaryPlace
              ? containsCityWord
                ? `Вы сейчас в ${primaryPlace}`
                : `Вы сейчас в городе ${primaryPlace}`
              : 'Вы сейчас здесь'

            await loadWeather({
              label: labelText,
              latitude: coords.latitude,
              longitude: coords.longitude,
            })
          } catch (locationError) {
            if (silentOnFail) {
              setStatus('idle')
              return
            }

            setStatus('error')
            setError(
              locationError instanceof Error
                ? locationError.message
                : 'Не удалось определить ваше местоположение',
            )
          }
        },
        async () => {
          try {
            const remoteLocation = await resolveIpLocation()

            if (!remoteLocation) {
              throw new Error('Не удалось определить ваше местоположение')
            }

            await loadWeather(remoteLocation)
          } catch (locationError) {
            if (silentOnFail) {
              setStatus('idle')
              return
            }

            setStatus('error')
            setError(
              locationError instanceof Error
                ? locationError.message
                : 'Не удалось определить ваше местоположение',
            )
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 600000,
        },
      )
    },
    [loadWeather],
  )

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void detectCurrentLocation({ silentOnFail: true })
    }, 300)

    return () => window.clearTimeout(timerId)
  }, [detectCurrentLocation])

  const weatherTimeZone = weather?.timezone ?? 'UTC'

  useEffect(() => {
    const updateClock = () => {
      const formatter = new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: weatherTimeZone,
      })

      setLocalTimeLabel(formatter.format(new Date()))
    }

    updateClock()
    const intervalId = window.setInterval(updateClock, 15000)

    return () => window.clearInterval(intervalId)
  }, [weather?.timezone])

  const currentLabel = location?.label ?? 'Погода рядом'
  const currentTemperature = weather?.current.temperature_2m ?? null
  const currentCondition = weather
    ? weatherLabel(weather.current.weather_code)
    : 'Выберите город или дождитесь определения локации'
  const currentLocalTime = localTimeLabel || hourFormatter.format(new Date())
  const hourlyStartIndex = weather
    ? (() => {
        const currentDate = parseApiLocalDate(weather.current.time)
        const exactIndex = weather.hourly.time.findIndex((time) => time === weather.current.time)

        if (exactIndex !== -1) {
          return exactIndex
        }

        const nextHourIndex = weather.hourly.time.findIndex((time) => {
          const parsedHour = parseApiLocalDate(time)
          return parsedHour.getTime() > currentDate.getTime()
        })

        return nextHourIndex !== -1 ? nextHourIndex : 0
      })()
    : 0

  const hourlyForecast = weather
    ? weather.hourly.time
        .slice(hourlyStartIndex, hourlyStartIndex + 6)
        .map((time, index) => {
          return {
            time,
            temperature: weather.hourly.temperature_2m[hourlyStartIndex + index],
            weatherCode: weather.hourly.weather_code[hourlyStartIndex + index],
            precipitation: weather.hourly.precipitation_probability[hourlyStartIndex + index],
          }
        })
    : []

  const dailyForecast = weather
    ? weather.daily.time.slice(0, 7).map((time, index) => ({
        time,
        weatherCode: weather.daily.weather_code[index],
        temperatureMax: weather.daily.temperature_2m_max[index],
        temperatureMin: weather.daily.temperature_2m_min[index],
        precipitation: weather.daily.precipitation_sum[index],
      }))
    : []

  const statusText =
    status === 'loading'
      ? 'Обновляю прогноз'
      : status === 'ready'
        ? ''
        : status === 'error'
          ? 'Есть проблема с загрузкой'
          : 'Готов к поиску'

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Weather Pulse</p>
          <h1>Погода, как редакционный экран состояния города</h1>
          <p className="lead">Быстрый поиск и понятный прогноз — всё, что нужно знать о погоде.</p>

          <div className="hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => void detectCurrentLocation()}
              disabled={status === 'loading'}
            >
              Определить меня
            </button>
            <button className="secondary-button" type="button" onClick={() => void loadWeather(presets[0])} disabled={status === 'loading'}>
              Показать Москву
            </button>
          </div>
        </div>

        <aside className="hero-aside" aria-live="polite">
          <div className="status-card merged-status">
            <div className="status-info">
              {statusText ? <span className="status-badge">{statusText}</span> : null}
              <strong>{currentLabel}</strong>
              {/* lastUpdated removed per UI preference */}
            </div>

            <div className="status-visual">
              {weather ? (
                <svg
                  viewBox="0 0 64 64"
                  xmlns="http://www.w3.org/2000/svg"
                  className="weather-svg"
                  dangerouslySetInnerHTML={{ __html: getWeatherIconSVG(weather.current.weather_code, weather.current.is_day) }}
                />
              ) : (
                <svg
                  viewBox="0 0 64 64"
                  xmlns="http://www.w3.org/2000/svg"
                  className="weather-svg"
                  dangerouslySetInnerHTML={{ __html: '<path d="M48 20c2.2 0 4-1.8 4-4s-1.8-4-4-4c-1.8 0-3.3 1.2-3.8 2.8C42.8 12 40.6 10 38 10c-3.3 0-6 2.7-6 6 0 .5.1 1 .2 1.5C30.4 16 28 14 25 14c-4.4 0-8 3.6-8 8 0 .7.1 1.4.3 2C15.3 24 12 27.6 12 32c0 5.5 4.5 10 10 10h26c5.5 0 10-4.5 10-10s-4.5-10-10-10z" fill="currentColor" opacity="0.85"/>' }}
                />
              )}
              <p className="status-visual-caption">{currentCondition}</p>
            </div>
          </div>
        </aside>
      </header>

      <main className="layout">
        <section className="search-panel panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Поиск</p>
              <h2>Найти другой город</h2>
            </div>
            {/* panel note removed */}
          </div>

          <form className="search-card" onSubmit={searchCity}>
            <label className="search-field" htmlFor="city-search">
              <span>Город</span>
              <input
                id="city-search"
                name="city-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Сочи, Алматы, Warsaw"
                autoComplete="off"
              />
            </label>

            <div className="search-actions">
              <button className="primary-button" type="submit" disabled={status === 'loading'}>
                Найти
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void detectCurrentLocation()}
                disabled={status === 'loading'}
              >
                Моё местоположение
              </button>
            </div>
          </form>

          <div className="preset-row" aria-label="Быстрый выбор города">
            {presets.map((preset) => (
              <button
                key={preset.label}
                className="preset-chip"
                type="button"
                onClick={() => {
                  setQuery(preset.label)
                  void loadWeather(preset)
                }}
                disabled={status === 'loading'}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {error ? <div className="error-banner">{error}</div> : null}
        </section>

        <section className="current-card panel">
          <div className="current-header">
            <div>
              <p className="section-label">Сейчас</p>
              <h2>{currentLabel}</h2>
              <p className="location-copy">{currentCondition}</p>
            </div>

            <div className="hero-temp">
              <span className="temperature-value">
                {currentTemperature !== null ? `${Math.round(currentTemperature)}°` : '—'}
              </span>
              <p className="temperature-meta">
                Ощущается как {weather ? `${Math.round(weather.current.apparent_temperature)}°` : '—'}
              </p>
            </div>
          </div>

          <div className="micro-grid">
            <article className="micro-card">
              <span>Ветер</span>
              <strong>{weather ? `${Math.round(weather.current.wind_speed_10m)} км/ч` : '—'}</strong>
            </article>
            <article className="micro-card">
              <span>Влажность</span>
              <strong>{weather ? `${Math.round(weather.current.relative_humidity_2m)}%` : '—'}</strong>
            </article>
            <article className="micro-card">
              <span>UV</span>
              <strong>{weather ? weather.current.uv_index.toFixed(1) : '—'}</strong>
            </article>
            <article className="micro-card">
              <span>Время</span>
              <strong>{currentLocalTime}</strong>
            </article>
          </div>
        </section>

        <section className="forecast-card panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Часы</p>
              <h2>Ближайшие часы</h2>
            </div>
          </div>

          <div className="timeline">
            {hourlyForecast.length > 0 ? (
              hourlyForecast.map((item) => (
                <article className="timeline-row" key={item.time}>
                  <div className="timeline-time">
                    <strong>
                      {weather
                        ? formatApiLocalTime(item.time, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : hourFormatter.format(new Date(item.time))}
                    </strong>
                    <span>{weatherLabel(item.weatherCode)}</span>
                  </div>
                  <div className="timeline-meta">
                    <span aria-hidden="true">{weatherIcon(item.weatherCode, 1)}</span>
                    <strong>{Math.round(item.temperature)}°</strong>
                    <em>{item.precipitation}%</em>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">Почасовой прогноз появится после загрузки города.</p>
            )}
          </div>
        </section>

        <section className="forecast-card panel panel-wide">
          <div className="panel-header">
            <div>
              <p className="section-label">Неделя</p>
              <h2>Семидневный прогноз</h2>
            </div>
          </div>

          <div className="weekly-list">
            {dailyForecast.length > 0 ? (
              dailyForecast.map((item) => (
                <article className="weekly-row" key={item.time}>
                  <div className="weekly-day">
                    <span aria-hidden="true">{weatherIcon(item.weatherCode, 1)}</span>
                    <div>
                      <strong>
                        {weather
                          ? formatApiLocalTime(item.time, {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })
                          : shortDayFormatter.format(new Date(item.time))}
                      </strong>
                      <p>{weatherLabel(item.weatherCode)}</p>
                    </div>
                  </div>

                  <div className="weekly-meta">
                    <span>{Math.round(item.temperatureMax)}°</span>
                    <span>{Math.round(item.temperatureMin)}°</span>
                    <span>{Math.round(item.precipitation)} мм</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">Недельный прогноз появится после первой загрузки.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
