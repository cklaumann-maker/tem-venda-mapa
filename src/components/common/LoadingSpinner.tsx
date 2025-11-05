import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
  text?: string
}

export default function LoadingSpinner({ 
  size = "md", 
  className = "",
  text = "Carregando..."
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className={cn(
        "border-4 border-green-200 border-t-green-600 rounded-full animate-spin",
        sizeClasses[size]
      )}></div>
      {text && (
        <div className="text-sm text-gray-600 animate-pulse">
          {text}
        </div>
      )}
    </div>
  )
}
