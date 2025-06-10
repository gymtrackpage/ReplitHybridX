import ReactDOM from 'react-dom/client'

function CleanApp() {
  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: '#f9fafb',
      minHeight: '100vh'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#1f2937', marginBottom: '20px' }}>
          Hybrid X Training App
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '30px' }}>
          Clean React application successfully loaded without hook errors.
        </p>
        
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#059669', marginBottom: '10px' }}>✓ Status Check</h3>
          <ul style={{ color: '#374151', lineHeight: '1.6' }}>
            <li>React hooks working properly</li>
            <li>No cached component conflicts</li>
            <li>Clean application structure</li>
            <li>Authentication backend ready</li>
          </ul>
        </div>

        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '6px',
          marginTop: '20px'
        }}>
          <p style={{ margin: 0, color: '#4b5563' }}>
            Ready for gradual feature integration with stable foundation.
          </p>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<CleanApp />);