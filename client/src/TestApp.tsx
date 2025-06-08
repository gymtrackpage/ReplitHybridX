export default function TestApp() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">HybridX</h1>
        <p className="text-gray-300">Application Loading Test</p>
        <div className="mt-8">
          <button 
            onClick={() => window.location.href = "/api/login"}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-6 rounded-lg"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}