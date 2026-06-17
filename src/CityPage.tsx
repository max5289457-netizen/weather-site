import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const cityMap = {
  'moskva': {
    slug: 'moskva',
    label: 'Москва',
    latitude: 55.7558,
    longitude: 37.6173,
    title: 'Погода в Москве — прогноз на сегодня и неделю',
    description:
      'Узнайте погоду в Москве сегодня, завтра и на неделю: температура, осадки, ветер и влажность.',
  },
  'sankt-peterburg': {
    slug: 'sankt-peterburg',
    label: 'Санкт-Петербург',
    latitude: 59.9386,
    longitude: 30.3141,
    title: 'Погода в Санкт-Петербурге — онлайн прогноз',
    description:
      'Проверьте погоду в Санкт-Петербурге онлайн: температура, осадки, ветер и прогноз на ближайшие дни.',
  },
  'kazan': {
    slug: 'kazan',
    label: 'Казань',
    latitude: 55.8304,
    longitude: 49.0661,
    title: 'Погода в Казани — точный прогноз по дням',
    description:
      'Погода в Казани на сегодня и на неделю: температура воздуха, ветер, осадки и влажность.',
  },
  'novosibirsk': {
    slug: 'novosibirsk',
    label: 'Новосибирск',
    latitude: 55.0084,
    longitude: 82.9357,
    title: 'Погода в Новосибирске — прогноз онлайн',
    description:
      'Погода в Новосибирске на сегодня, завтра и на неделю с точными данными по температуре и осадкам.',
  },
  'sochi': {
    slug: 'sochi',
    label: 'Сочи',
    latitude: 43.5815,
    longitude: 39.7223,
    title: 'Погода в Сочи — прогноз на море и город',
    description:
      'Проверяйте погоду в Сочи онлайн: температура воздуха, осадки, ветер и прогноз на неделю.',
  },
  'ekaterinburg': {
    slug: 'ekaterinburg',
    label: 'Екатеринбург',
    latitude: 56.8389,
    longitude: 60.6057,
    title: 'Погода в Екатеринбурге — прогноз по дням',
    description:
      'Узнайте погоду в Екатеринбурге на сегодня и на неделю: температура, ветер, осадки и влажность.',
  },
} as const

type CityConfig = (typeof cityMap)[keyof typeof cityMap]

type WeatherResponse = {
  current: {
    temperature_2m: number
    apparent_temperature: number
    weather_code: number
    relative_humidity_2m: number
    wind_speed_10m: number
    is_day: number
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
  }
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

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))

function CityPage() {
  const { slug } = useParams()
  const city = useMemo<CityConfig>(() => {
    if (slug && slug in cityMap) {
      return cityMap[slug as keyof typeof cityMap]
    }
    return cityMap.moskva
  }, [slug])

  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadWeather = async () => {
      setLoading(true)

      const params = new URLSearchParams({
        latitude: String(city.latitude),
        longitude: String(city.longitude),
        current: 'temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,is_day',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
        forecast_days: '7',
        timezone: 'auto',
      })

      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
        )

        if (!response.ok) {
          throw new Error('Не удалось загрузить погоду')
        }

        const data = (await response.json()) as WeatherResponse

        if (isMounted) {
          setWeather(data)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadWeather()

    return () => {
      isMounted = false
    }
  }, [city])

  return (
    <div className="app-shell">
      <main className="layout">
        <section className="panel panel-wide">
          <div className="panel-header">
            <div>
              <p className="section-label">SEO</p>
              <h2>{city.title}</h2>
            </div>
            <Link className="secondary-button" to="/">
              На главную
            </Link>
          </div>
          <p className="lead">{city.description}</p>
        </section>

        <section className="current-card panel">
          <div className="current-header">
            <div>
              <p className="section-label">Сейчас</p>
              <h2>{city.label}</h2>
            </div>
            <div className="hero-temp">
              <span className="temperature-value">
                {loading || !weather ? '—' : `${Math.round(weather.current.temperature_2m)}°`}
              </span>
            </div>
          </div>
          <div className="micro-grid">
            <article className="micro-card">
              <span>Состояние</span>
              <strong>{loading || !weather ? 'Загрузка' : weatherLabel(weather.current.weather_code)}</strong>
            </article>
            <article className="micro-card">
              <span>Ветер</span>
              <strong>{loading || !weather ? '—' : `${Math.round(weather.current.wind_speed_10m)} км/ч`}</strong>
            </article>
            <article className="micro-card">
              <span>Влажность</span>
              <strong>{loading || !weather ? '—' : `${Math.round(weather.current.relative_humidity_2m)}%`}</strong>
            </article>
            <article className="micro-card">
              <span>Ощущается</span>
              <strong>{loading || !weather ? '—' : `${Math.round(weather.current.apparent_temperature)}°`}</strong>
            </article>
          </div>
        </section>

        <section className="forecast-card panel panel-wide">
          <div className="panel-header">
            <div>
              <p className="section-label">7 дней</p>
              <h2>Прогноз на неделю</h2>
            </div>
          </div>
          <div className="weekly-list">
            {weather?.daily.time.map((day, index) => (
              <article className="weekly-row" key={day}>
                <div className="weekly-day">
                  <div>
                    <strong>{formatDate(day)}</strong>
                    <p>{weatherLabel(weather.daily.weather_code[index])}</p>
                  </div>
                </div>
                <div className="weekly-meta">
                  <span>{Math.round(weather.daily.temperature_2m_max[index])}°</span>
                  <span>{Math.round(weather.daily.temperature_2m_min[index])}°</span>
                  <span>{Math.round(weather.daily.precipitation_sum[index])} мм</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default CityPage
