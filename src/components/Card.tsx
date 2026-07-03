import React from 'react';

export const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  return React.createElement(
    "div",
    { className: `bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm ${className}` },
    children
  );
};