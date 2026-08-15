import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient' // adjust path as needed
import logo from '../assets/images/Logo1.jpg'

function Login() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const formatted = now.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
      setDateTime(formatted)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: dbError } = await supabase
        .from('employees')
        .select('id, full_name, username, password')
        .eq('username', username)
        .single()

      if (dbError || !data) {
        setError('Invalid username or password.')
        setLoading(false)
        return
      }

      // ⚠️ Plain-text comparison — consider bcrypt for production
      if (data.password !== password) {
        setError('Invalid username or password.')
        setLoading(false)
        return
      }

      // Store employee info in sessionStorage for later use
      sessionStorage.setItem('employee', JSON.stringify({
        id: data.id,
        full_name: data.full_name,
        username: data.username,
      }))

      navigate('/dashboard')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }

        .login-container {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(180deg, #b30000, #000);
          font-family: 'Segoe UI', sans-serif;
          position: relative;
        }

        .datetime {
          position: absolute;
          top: 15px;
          right: 20px;
          color: white;
          font-size: 13px;
          background: rgba(0,0,0,0.4);
          padding: 6px 10px;
          border-radius: 6px;
        }

        .login-card {
          width: 360px;
          padding: 40px 30px;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
          text-align: center;
        }

        .login-logo {
          width: 140px;
          margin-bottom: 20px;
        }

        .login-card h2 {
          margin-bottom: 20px;
          color: #111;
        }

        .login-card input {
          width: 100%;
          padding: 12px;
          margin: 10px 0;
          border-radius: 8px;
          border: 1px solid #ddd;
          outline: none;
          background: #f9f9f9;
        }

        .login-card input:focus {
          border-color: #b30000;
          box-shadow: 0 0 0 2px rgba(179,0,0,0.2);
        }

        .password-wrapper {
          position: relative;
        }

        .password-wrapper input {
          padding-right: 40px;
        }

        .toggle-password {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          user-select: none;
        }

        .error-message {
          background: #fff0f0;
          border: 1px solid #ffcccc;
          color: #b30000;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          margin-top: 8px;
          text-align: left;
        }

        .login-card button {
          width: 100%;
          padding: 12px;
          margin-top: 15px;
          border: none;
          border-radius: 8px;
          background: #b30000;
          color: white;
          font-weight: bold;
          cursor: pointer;
          font-size: 15px;
          transition: background 0.2s;
        }

        .login-card button:hover:not(:disabled) {
          background: #ff0000;
        }

        .login-card button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .footer {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(255,255,255,0.85);
          font-size: 12px;
          white-space: nowrap;
        }
      `}</style>

      <div className="login-container">

        <div className="datetime">{dateTime}</div>

        <div className="login-card">

          <img src={logo} className="login-logo" alt="Logo" />

          <h2>Login</h2>

          <form onSubmit={handleLogin}>

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />

            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <span
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </span>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>

          </form>

        </div>

        <div className="footer">
          Made BY Engr. Jared Gamutin @ 2026
        </div>

      </div>
    </>
  )
}

export default Login