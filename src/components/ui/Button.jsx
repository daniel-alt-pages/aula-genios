import React from 'react';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 active:scale-95",
    ghost: "text-slate-600 hover:bg-slate-100"
  };
  
  return (
    <button 
      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};
