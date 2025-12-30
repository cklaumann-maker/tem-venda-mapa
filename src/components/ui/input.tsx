import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, style, ...props }: React.ComponentProps<"input">) {
  // Para inputs do tipo file, esconder o texto "Nenhum arquivo escolhido" quando color é transparent
  const fileInputStyle = type === 'file' && style?.color === 'transparent' 
    ? { 
        ...style,
        fontSize: 0,
        lineHeight: 0
      }
    : style;

  return (
    <>
      <input
        type={type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          type === 'file' && style?.color === 'transparent' && "text-[0px] leading-none",
          className
        )}
        style={fileInputStyle}
        {...props}
      />
      {type === 'file' && style?.color === 'transparent' && (
        <style dangerouslySetInnerHTML={{
          __html: `
            input[type="file"]#${props.id}::file-selector-button {
              display: none !important;
            }
            input[type="file"]#${props.id}::-webkit-file-upload-button {
              display: none !important;
            }
            input[type="file"]#${props.id}::before {
              content: 'Escolher arquivo';
              display: inline-block;
              font-size: 0.875rem;
              line-height: 1.25rem;
              padding: 0 0.5rem;
              color: hsl(var(--foreground));
            }
          `
        }} />
      )}
    </>
  )
}

export { Input }
