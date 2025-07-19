import React from 'react';

// Custom Tooltip component for the Stock Comparison Chart
export const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        // Ensure values are numbers for display, default to 0 if not
        const stokSebelumnya = typeof data['Stok Sebelumnya'] === 'number' ? data['Stok Sebelumnya'] : 0;
        const stokSekarang = typeof data['Stok Sekarang'] === 'number' ? data['Stok Sekarang'] : 0;
        return (
            <div className="bg-white p-3 rounded-md shadow-lg border border-gray-200 text-sm">
                <p className="font-semibold text-gray-800">{data.fullName || label}</p>
                <p className="text-gray-700">{`Stok Sebelumnya: ${stokSebelumnya}`}</p>
                <p className="text-gray-700">{`Stok Sekarang: ${stokSekarang}`}</p>
            </div>
        );
    }
    return null;
};

// Custom Tooltip component for the Longest Stock Age Chart
export const CustomTooltipLongestStockAge = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 rounded-md shadow-lg border border-gray-200 text-sm">
                <p className="font-semibold text-gray-800">{data.fullName || label}</p>
                <p className="text-gray-700">{`Umur Stok: ${typeof data['Umur Stock (Dalam Hari)'] === 'number' ? data['Umur Stock (Dalam Hari)'] : 0} hari`}</p>
            </div>
        );
    }
    return null;
};