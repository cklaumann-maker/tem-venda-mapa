"use client";
import { brand } from "@/lib/brand";

export default function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-2xl" style={{ background: brand.primary + "22" }}>
          <Icon className="w-6 h-6" style={{ color: brand.primary }} />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
