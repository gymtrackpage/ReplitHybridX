import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

interface User {
  id: string;
  email: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid #e2e8f0',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        padding: '48px 16px'
      }}>
        <div style={{
          maxWidth: '448px',
          width: '100%',
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '30px',
            fontWeight: '800',
            color: '#111827'
          }}>
            Welcome to Hybrid X
          </h2>
          <p style={{
            marginTop: '8px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Your personal HYROX training companion
          </p>
          <div style={{ marginTop: '32px' }}>
            <button
              onClick={handleLogin}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                padding: '8px 16px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '6px',
                color: 'white',
                backgroundColor: '#2563eb',
                cursor: 'pointer'
              }}
            >
              Sign in with Replit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <nav style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            height: '64px',
            alignItems: 'center'
          }}>
            <h1 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827'
            }}>
              Hybrid X Dashboard
            </h1>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <span style={{
                fontSize: '14px',
                color: '#374151'
              }}>
                Welcome, {user?.email}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '24px 16px'
      }}>
        <div style={{
          border: '4px dashed #d1d5db',
          borderRadius: '8px',
          height: '384px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '16px'
            }}>
              Welcome to Hybrid X
            </h2>
            <p style={{
              color: '#6b7280',
              marginBottom: '32px'
            }}>
              Your personal HYROX training application is ready to use.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <p style={{
                fontSize: '14px',
                color: '#059669'
              }}>
                ✓ Authentication working
              </p>
              <p style={{
                fontSize: '14px',
                color: '#059669'
              }}>
                ✓ React hooks functioning properly
              </p>
              <p style={{
                fontSize: '14px',
                color: '#059669'
              }}>
                ✓ Clean application setup complete
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);