"use client";

import React, { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { EmojiPickerButton } from "@/components/ui/emoji-picker";
import { cn } from "@/lib/utils";

interface TextareaWithEmojiProps extends React.ComponentProps<"textarea"> {
  onValueChange?: (value: string) => void;
}

export function TextareaWithEmoji({ 
  className, 
  value, 
  onChange,
  onValueChange,
  ...props 
}: TextareaWithEmojiProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEmojiClick = (emoji: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const currentValue = (value as string) || "";
      const newValue = currentValue.slice(0, start) + emoji + currentValue.slice(end);
      
      // Atualizar o valor
      if (onChange) {
        const syntheticEvent = {
          target: { value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
      
      if (onValueChange) {
        onValueChange(newValue);
      }

      // Restaurar o foco e posição do cursor
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        className={cn("pr-10", className)}
        {...props}
      />
      <div className="absolute bottom-2 right-2">
        <EmojiPickerButton onEmojiClick={handleEmojiClick} />
      </div>
    </div>
  );
}

