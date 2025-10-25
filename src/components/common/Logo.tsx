import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export default function Logo({ 
  width = 200, 
  height = 80, 
  className = "",
  priority = false 
}: LogoProps) {
  return (
    <Image
      src="/tem-venda-logo.svg"
      alt="TEM VENDA"
      width={width}
      height={height}
      className={cn("h-auto max-w-full", className)}
      priority={priority}
      style={{ height: 'auto' }}
    />
  )
}
