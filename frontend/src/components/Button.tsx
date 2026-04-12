// src/components/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'login';
}

export default function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}: ButtonProps) {
  
  // Notice the added "cursor-pointer" and "disabled:cursor-not-allowed" here!
  const baseClasses = "cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 px-6 py-2 rounded-md font-medium transition duration-200 inline-flex items-center justify-center";
  
  const variantClasses = {
    primary: "bg-[#4bbda6] hover:bg-[#3ea893] text-white shadow-md",
    secondary: "bg-white text-gray-800 shadow-lg hover:bg-gray-50",
    ghost: "bg-white/20 hover:bg-white/30 text-white",
    login: "bg-[#a3c962] hover:bg-[#8eb54f] text-white shadow-sm"
  };

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}