"use client";

import React, { useState, useRef, useEffect } from "react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmojiPickerButtonProps {
  onEmojiClick: (emoji: string) => void;
  className?: string;
}

export function EmojiPickerButton({ onEmojiClick, className }: EmojiPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiClick(emojiData.emoji);
    // Não fechar o picker automaticamente para permitir múltiplos emojis
  };

  return (
    <div className={cn("relative", className)} ref={pickerRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9 p-0 hover:bg-muted"
        aria-label="Abrir seletor de emojis"
      >
        <Smile className="h-4 w-4" />
      </Button>
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 z-50 shadow-lg rounded-lg overflow-hidden">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            locale="pt"
            previewConfig={{
              showPreview: false,
            }}
            skinTonesDisabled
            searchDisabled={false}
            width={350}
            height={400}
          />
        </div>
      )}
    </div>
  );
}

