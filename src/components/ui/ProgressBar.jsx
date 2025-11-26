import React from 'react';

export const ProgressBar = ({ value, max = 100, color = 'blue', label, showPercentage = true, className = '' }) => {
    const percentage = Math.min((value / max) * 100, 100);

    const colorClasses = {
        blue: 'bg-gradient-to-r from-blue-500 to-blue-600',
        purple: 'bg-gradient-to-r from-purple-500 to-purple-600',
        green: 'bg-gradient-to-r from-green-500 to-green-600',
        red: 'bg-gradient-to-r from-red-500 to-red-600',
        yellow: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
        orange: 'bg-gradient-to-r from-orange-500 to-orange-600',
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 font-medium">{label}</span>
                    {showPercentage && (
                        <span className="text-slate-500">{Math.round(percentage)}%</span>
                    )}
                </div>
            )}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClasses[color] || colorClasses.blue} transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};
