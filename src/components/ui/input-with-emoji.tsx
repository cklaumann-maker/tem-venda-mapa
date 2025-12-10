"use client";

import React, { useRef } from "react";
import { Input } from "@/components/ui/input";
import { EmojiPickerButton } from "@/components/ui/emoji-picker";
import { cn } from "@/lib/utils";

interface InputWithEmojiProps extends React.ComponentProps<"input"> {
  onValueChange?: (value: string) => void;
}

export function InputWithEmoji({ 
  className, 
  value, 
  onChange,
  onValueChange,
  ...props 
}: InputWithEmojiProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEmojiClick = (emoji: string) => {
    if (inputRef.current) {
      const input = inputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentValue = (value as string) || "";
      const newValue = currentValue.slice(0, start) + emoji + currentValue.slice(end);
      
      // Atualizar o valor
      if (onChange) {
        const syntheticEvent = {
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
      
      if (onValueChange) {
        onValueChange(newValue);
      }

      // Restaurar o foco e posição do cursor
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
  };

  return (
    <div className="relative flex items-center">
      <Input
        ref={inputRef}
        value={value}
        onChange={onChange}
        className={cn("pr-10", className)}
        {...props}
      />
      <div className="absolute right-2">
        <EmojiPickerButton onEmojiClick={handleEmojiClick} />
      </div>
    </div>
  );
}




