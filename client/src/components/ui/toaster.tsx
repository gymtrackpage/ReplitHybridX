
import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-0 right-0 z-[100] p-4 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            max-w-sm p-4 rounded-md shadow-lg border
            ${toast.variant === "destructive" 
              ? "bg-red-50 border-red-200 text-red-800" 
              : "bg-white border-gray-200 text-gray-900"
            }
          `}
        >
          {toast.title && (
            <div className="font-semibold mb-1">{toast.title}</div>
          )}
          {toast.description && (
            <div className="text-sm">{toast.description}</div>
          )}
          <button
            onClick={() => dismiss(toast.id)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
