import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"

export default function DashboardLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [time, setTime] = useState("")
  const [greeting, setGreeting] = useState("")
  const [weather, setWeather] = useState({ icon: "🌡️", desc: "Loading...", temp: "" })

  const employee = JSON.parse(sessionStorage.getItem('employee') || '{}')

  const getWeatherIcon = (code, isDay = 1) => {
    if (code === 0) return { icon: isDay ? "☀️" : "🌙", desc: "Clear" }
    if (code <= 1) return { icon: isDay ? "🌤️" : "🌙", desc: "Mostly clear" }
    if (code <= 2) return { icon: "⛅", desc: "Partly cloudy" }
    if (code === 3) return { icon: "☁️", desc: "Overcast" }
    if (code <= 49) return { icon: "🌫️", desc: "Foggy" }
    if (code <= 59) return { icon: "🌦️", desc: "Drizzle" }
    if (code <= 69) return { icon: "🌧️", desc: "Rainy" }
    if (code <= 79) return { icon: "❄️", desc: "Snowy" }
    if (code <= 84) return { icon: "🌧️", desc: "Showers" }
    if (code <= 99) return { icon: "⛈️", desc: "Thunderstorm" }
    return { icon: "🌡️", desc: "Unknown" }
  }

  // Live clock
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = now.getHours()
      const min = now.getMinutes().toString().padStart(2, "0")
      const ampm = h >= 12 ? "PM" : "AM"
      const h12 = h % 12 || 12
      setTime(`${h12}:${min} ${ampm}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  // Random greeting (once on mount)
  useEffect(() => {
    const h = new Date().getHours()
    const timeGreets = h < 12
      ? ["Good morning", "Rise and shine", "Morning"]
      : h < 17
      ? ["Good afternoon", "Hope your day's going well", "Afternoon"]
      : ["Good evening", "Hope you had a great day", "Evening"]
    const generalGreets = ["Welcome back", "Hey there", "Glad you're here", "Nice to see you"]
    const pool = [...timeGreets, ...generalGreets]
    setGreeting(pool[Math.floor(Math.random() * pool.length)])
  }, [])

  // Live weather via Open-Meteo
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
          )
          const data = await res.json()
          const { weathercode, temperature, is_day } = data.current_weather
          const info = getWeatherIcon(weathercode, is_day)
          setWeather({ ...info, temp: `${Math.round(temperature)}°C` })
        }, () => {
          setWeather({ icon: "🌡️", desc: "No location", temp: "" })
        })
      } catch {
        setWeather({ icon: "🌡️", desc: "Unavailable", temp: "" })
      }
    }
    fetchWeather()
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('employee')
    navigate('/')
  }

  const menu = [
    { name: "Dashboard", icon: "📊", path: "/dashboard" },
    { name: "Quotations", icon: "🧾", path: "/quotations" },
    { name: "Installation & Repairs", icon: "🛠️", path: "/installation-repairs" },
    { name: "Products", icon: "📦", path: "/products" },
    { name: "Clients", icon: "👥", path: "/clients" },
    { name: "Employees", icon: "🧑", path: "/employees" },
    { name: "Stock In", icon: "📥", path: "/stock-in" },
    { name: "Stock Out", icon: "📤", path: "/stock-out" },
    { name: "Settings", icon: "⚙️", path: "/settings" },
  ]

  return (
    <>
      <style>{`
        body {
          margin: 0;
          font-family: Segoe UI;
          background: #f4f6f9;
        }

        .layout {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }

        /* SIDEBAR */
        .sidebar {
          width: 260px;
          background: #111827;
          color: white;
          padding: 20px;
          display: flex;
          flex-direction: column;
          height: 100vh;
          box-sizing: border-box;
          overflow: hidden;
        }

        .brand {
          font-size: 18px;
          font-weight: bold;
          color: #ef4444;
          margin-bottom: 25px;
          flex-shrink: 0;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
          flex: 1;
          padding-right: 4px;
        }

        .nav::-webkit-scrollbar { width: 4px; }
        .nav::-webkit-scrollbar-track { background: transparent; }
        .nav::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }

        .nav a {
          padding: 10px 12px;
          border-radius: 8px;
          color: #cbd5e1;
          text-decoration: none;
          display: flex;
          gap: 10px;
          align-items: center;
          transition: 0.2s;
          flex-shrink: 0;
        }

        .nav a:hover {
          background: #1f2937;
          color: white;
        }

        .active {
          background: #b30000 !important;
          color: white !important;
        }

        /* MAIN */
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .topbar {
          height: 60px;
          background: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .content {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .title {
          font-weight: 600;
          color: #111827;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .topbar-divider {
          width: 1px;
          height: 24px;
          background: #e5e7eb;
        }

        .greeting {
          font-size: 13px;
          color: #6b7280;
          white-space: nowrap;
        }

        .weather-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          color: #374151;
          background: #f3f4f6;
          padding: 4px 10px;
          border-radius: 20px;
          white-space: nowrap;
        }

        .weather-badge .icon {
          font-size: 16px;
          line-height: 1;
        }

        .weather-badge .temp {
          font-weight: 600;
          color: #111827;
        }

        .live-clock {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          font-variant-numeric: tabular-nums;
          background: #f3f4f6;
          padding: 4px 10px;
          border-radius: 20px;
          white-space: nowrap;
        }

        .user {
          font-size: 13px;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .logout-btn {
          font-size: 13px;
          background: #b30000;
          color: white;
          padding: 6px 14px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: Segoe UI;
          font-weight: 500;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .logout-btn:hover {
          background: #ff0000;
        }
      `}</style>

      <div className="layout">

        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="brand">RMS I.T. SOLUTIONS</div>
          <div className="nav">
            {menu.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={location.pathname === item.path ? "active" : ""}
              >
                <span>{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        {/* MAIN */}
        <div className="main">

          <div className="topbar">
            <div className="title">Inventory System</div>

            <div className="topbar-right">

              {/* Greeting */}
              <span className="greeting">{greeting} 👋</span>

              <div className="topbar-divider" />

              {/* Weather */}
              <div className="weather-badge">
                <span className="icon">{weather.icon}</span>
                <span>{weather.desc}</span>
                {weather.temp && <span className="temp">{weather.temp}</span>}
              </div>

              <div className="topbar-divider" />

              {/* Live Clock */}
              <div className="live-clock">🕐 {time}</div>

              <div className="topbar-divider" />

              {/* Employee Name */}
              <div className="user">
                👤 {employee?.full_name || employee?.username}
              </div>

              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>

            </div>
          </div>

          <div className="content">
            {children}
          </div>

        </div>
      </div>
    </>
  )
}