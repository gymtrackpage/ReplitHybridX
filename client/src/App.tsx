export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1f2937',
      color: 'white',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>HybridX App</h1>
      <p style={{ fontSize: '24px', marginBottom: '20px' }}>
        App is now loading successfully!
      </p>
      <div style={{
        backgroundColor: '#fbbf24',
        color: '#000',
        padding: '12px 24px',
        borderRadius: '8px',
        display: 'inline-block',
        fontWeight: 'bold'
      }}>
        React is Working ✓
      </div>
    </div>
  );
}