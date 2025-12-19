"use client";

import React, { useRef } from "react";
import { Input } from "@/components/ui/input";
import { EmojiPickerButton } from "@/components/ui/emoji-picker-button";
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
    if (!inputRef.current) return;

    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = String(value || "");
    const newValue = currentValue.slice(0, start) + emoji + currentValue.slice(end);

    // Atualizar o valor
    if (onValueChange) {
      onValueChange(newValue);
    } else if (onChange) {
      const syntheticEvent = {
        target: { value: newValue },
        currentTarget: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }

    // Restaurar o foco e posição do cursor
    setTimeout(() => {
      input.focus();
      const newPosition = start + emoji.length;
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
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
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <EmojiPickerButton onEmojiClick={handleEmojiClick} size="sm" />
      </div>
    </div>
  );
}

