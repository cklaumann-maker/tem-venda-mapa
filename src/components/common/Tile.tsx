"use client";
import { brand } from "@/lib/brand";

export default function Tile({ icon: Icon, title, desc, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="group rounded-3xl border bg-white/50 hover:bg-white transition shadow-sm hover:shadow-md p-6 text-left w-full focus:outline-none focus:ring-4 cursor-pointer"
      style={{ borderColor: "#e5e7eb" }}
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl" style={{ background: brand.primary + "22" }}>
          <span className="sr-only">{title}</span>
          <Icon className="w-7 h-7" style={{ color: brand.primary }} />
        </div>
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground">{desc}</div>
        </div>
      </div>
    </button>
  );
}
