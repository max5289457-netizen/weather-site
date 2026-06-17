import { useCallback, useEffect, useState } from 'react'
import './App.css'

type LocationResult = {
  label: string
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

// dateTimeFormatter removed (unused)

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
  const [location, setLocation] = useState<LocationResult | null>(null)
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchError, setSearchError] = useState('')

  const [localTimeLabel, setLocalTimeLabel] = useState<string>(hourFormatter.format(new Date()))

  const loadWeather = useCallback(async (targetLocation: LocationResult) => {
    setStatus('loading')

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
      setStatus('ready')
      setSearchError('')
    } catch {
      setStatus('error')
    }
  }, [])

  const searchCity = useCallback(async () => {
    const trimmedQuery = searchQuery.trim()
    if (!trimmedQuery) {
      setSearchError('Введите название города')
      return
    }

    setStatus('loading')

    try {
      const params = new URLSearchParams({
        name: trimmedQuery,
        count: '5',
        language: 'ru',
        format: 'json',
      })

      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
      )

      if (!response.ok) {
        throw new Error('Не удалось найти город')
      }

      const data = (await response.json()) as {
        results?: Array<{
          name: string
          latitude: number
          longitude: number
        }>
      }

      const firstResult = data.results?.[0]
      if (!firstResult) {
        throw new Error('Город не найден')
      }

      await loadWeather({
        label: firstResult.name,
        latitude: firstResult.latitude,
        longitude: firstResult.longitude,
      })
      setSearchQuery(firstResult.name)
      setSearchError('')
    } catch {
      setStatus('error')
      setSearchError('Не удалось найти такой город')
    }
  }, [loadWeather, searchQuery])

  const detectCurrentLocation = useCallback(
    async (options?: { silentOnFail?: boolean }) => {
      const silentOnFail = options?.silentOnFail ?? false

      if (!navigator.geolocation) {
        if (silentOnFail) {
          setStatus('idle')
          return
        }

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
            const labelText = primaryPlace || 'Вы сейчас здесь'

            await loadWeather({
              label: labelText,
              latitude: coords.latitude,
              longitude: coords.longitude,
            })
          } catch {
            if (silentOnFail) {
              setStatus('idle')
              return
            }

            setStatus('error')
          }
        },
        async () => {
          try {
            const remoteLocation = await resolveIpLocation()

            if (!remoteLocation) {
              throw new Error('Не удалось определить ваше местоположение')
            }

            await loadWeather(remoteLocation)
          } catch {
            if (silentOnFail) {
              setStatus('idle')
              return
            }

            setStatus('error')
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
          const parsedTime = parseApiLocalDate(time)
          return parsedTime.getTime() > currentDate.getTime()
        })

        return nextHourIndex !== -1 ? nextHourIndex : 0
      })()
    : 0

  const hourlyForecast =
    weather && weather.hourly?.time?.length
      ? weather.hourly.time.slice(hourlyStartIndex, hourlyStartIndex + 6).map((time, index) => ({
          time,
          temperature: weather.hourly.temperature_2m[hourlyStartIndex + index],
          weatherCode: weather.hourly.weather_code[hourlyStartIndex + index],
          precipitation: weather.hourly.precipitation_probability[hourlyStartIndex + index],
        }))
      : []

  const dailyForecast =
    weather && weather.daily?.time?.length
      ? weather.daily.time.slice(0, 7).map((time, index) => ({
          time,
          weatherCode: weather.daily.weather_code[index],
          temperatureMax: weather.daily.temperature_2m_max[index],
          temperatureMin: weather.daily.temperature_2m_min[index],
          precipitation: weather.daily.precipitation_sum[index],
        }))
      : []

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Weather Pulse</p>
          <h1>Погода онлайн на сегодня</h1>
          <p className="lead">
            Узнайте температуру воздуха, осадки, ветер, влажность и точный прогноз по любому городу.
          </p>

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

          <section className="search-card">
            <div className="search-field">
              <span>Поиск города</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void searchCity()
                  }
                }}
                placeholder="Введите название города"
              />
            </div>
            <div className="search-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => void searchCity()}
                disabled={status === 'loading'}
              >
                Найти
              </button>
            </div>
            <div className="preset-row">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  className="preset-chip"
                  type="button"
                  onClick={() => void loadWeather(preset)}
                  disabled={status === 'loading'}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {searchError ? <p className="error-banner">{searchError}</p> : null}
          </section>
        </div>

        <section className="panel hero-now">
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
      </header>

      <main className="layout">
        <section className="forecast-card panel panel-wide">
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
