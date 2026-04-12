import React from 'react';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-32 h-32 mb-6 bg-green-50 rounded-2xl flex items-center justify-center text-5xl shadow-sm border border-green-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}