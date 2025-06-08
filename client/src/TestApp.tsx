export default function TestApp() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#111827',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '1rem'
        }}>
          HybridX
        </h1>
        <p style={{
          color: '#D1D5DB',
          marginBottom: '2rem'
        }}>
          Personal Training Application
        </p>
        <button 
          onClick={() => window.location.href = "/api/login"}
          style={{
            backgroundColor: '#F59E0B',
            color: 'black',
            fontWeight: '600',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#D97706'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#F59E0B'}
        >
          Login with Replit
        </button>
      </div>
    </div>
  );
}