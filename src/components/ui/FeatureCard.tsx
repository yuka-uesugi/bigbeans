"use client";

import { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  delay?: number;
}

export default function FeatureCard({
  icon,
  title,
  description,
  delay = 0,
}: FeatureCardProps) {
  return (
    <div
      className="glass-card p-8 animate-fade-in-up group cursor-default"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* アイコンエリア */}
      <div className="w-14 h-14 rounded-2xl bg-ag-lime-100 flex items-center justify-center mb-5 group-hover:bg-ag-lime-200 transition-colors duration-300 group-hover:scale-110 transform">
        <span className="text-2xl text-ag-lime-600">{icon}</span>
      </div>

      {/* タイトル */}
      <h3 className="text-xl font-bold text-ag-gray-900 mb-3">{title}</h3>

      {/* 説明 */}
      <p className="text-ag-gray-500 leading-relaxed text-sm">{description}</p>
    </div>
  );
}
