import React from 'react';

export const StatCard = ({ icon: Icon, label, value, color = 'blue', trend }) => {
    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg bg-${color}-50`}>
                    <Icon className={`text-${color}-600`} size={24} />
                </div>
                {trend && (
                    <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <div className="mt-4">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
            </div>
        </div>
    );
};
