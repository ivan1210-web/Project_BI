import React, { useState } from 'react';

// Function to determine stock status, moved here from utils/stockHelpers.js
const getStockStatus = (currentStock, minThreshold) => {
    if (currentStock === 0) {
        return { text: 'Stock Habis', color: 'bg-red-100 text-red-800', textColor: 'text-gray-900' };
    } else if (currentStock > 0 && currentStock <= minThreshold) {
        return { text: 'Stok Rendah', color: 'bg-orange-100 text-orange-800', textColor: 'text-gray-900' };
    } else {
        return { text: 'Stok Cukup', color: 'bg-green-100 text-green-800', textColor: 'text-gray-900' };
    }
};

const toTitleCase = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// Helper to define custom order for status sorting
const statusOrder = {
    'Stock Habis': 0,
    'Stok Rendah': 1,
    'Stok Cukup': 2,
};

const StockManagementTab = ({ parsedData, headers }) => {
    // States for filter/search/grouping/sorting features
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [groupByCategory, setGroupByCategory] = useState(false);
    const [openCategories, setOpenCategories] = useState({});
    const [sortBy, setSortBy] = useState('No.');
    const [sortOrder, setSortOrder] = useState('asc');

    // Filter, Search, Grouping, and Sorting Logic for Stock Management Table
    const filteredAndSearchedData = parsedData.filter(item => {
        const matchesSearchTerm = searchTerm === '' ||
            (item['Nama Barang'] && item['Nama Barang'].toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item['Kode Barang'] && item['Kode Barang'].toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = filterCategory === '' ||
            (item['Kategori'] && item['Kategori'].toLowerCase() === filterCategory.toLowerCase());

        return matchesSearchTerm && matchesCategory;
    });

    // Sorting Logic
    const sortedData = [...filteredAndSearchedData].sort((a, b) => {
        let valA, valB;

        switch (sortBy) {
            case 'No.':
                valA = parseInt(a['No.']);
                valB = parseInt(b['No.']);
                break;
            case 'Nama Barang':
                valA = a['Nama Barang'] ? a['Nama Barang'].toLowerCase() : '';
                valB = b['Nama Barang'] ? b['Nama Barang'].toLowerCase() : '';
                break;
            case 'Stock Sekarang':
                valA = parseFloat(a['Stock Sekarang']);
                valB = parseFloat(b['Stock Sekarang']);
                break;
            case 'Status': {
                const statusA = getStockStatus(a['Stock Sekarang'], a['MinStockThreshold']).text;
                const statusB = getStockStatus(b['Stock Sekarang'], b['MinStockThreshold']).text;
                valA = statusOrder[statusA] ?? 99;
                valB = statusOrder[statusB] ?? 99;
                break;
            }
            default:
                valA = parseInt(a['No.']);
                valB = parseInt(b['No.']);
                break;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
    });

    // Grouping Logic
    const groupedData = groupByCategory ?
        sortedData.reduce((acc, item) => {
            const category = item['Kategori'] || 'Tidak Dikategorikan';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {}) : {};

    // Toggle category group visibility
    const toggleCategory = (category) => {
        setOpenCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    // Get unique categories for the filter dropdown
    const uniqueCategories = [...new Set(parsedData.map(item => item['Kategori']).filter(Boolean).map(cat => cat.toLowerCase()))].sort();

    return (
        <div className="bg-orange-50 p-6 rounded-lg shadow-inner border border-orange-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Inventaris Spareparts
            </h2>

            {/* Filter, Search, Grouping, and Sorting Controls */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Search, Filter, Group By */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Cari berdasarkan Nama atau Kode Sparepart..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-auto"
                    />
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-auto"
                    >
                        <option value="">Semua Kategori</option>
                        {uniqueCategories.map(category => (
                            <option key={category} value={category}>{toTitleCase(category)}</option>
                        ))}
                    </select>
                    <div className="flex items-center w-full md:w-auto justify-center md:justify-start">
                        <input
                            type="checkbox"
                            id="groupByCategory"
                            checked={groupByCategory}
                            onChange={(e) => setGroupByCategory(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="groupByCategory" className="ml-2 text-sm font-medium text-gray-700">
                            Kelompokkan berdasarkan Kategori
                        </label>
                    </div>
                </div>
                {/* Sorting Controls */}
                <div className="flex flex-col md:flex-row items-center justify-start gap-4 mt-4">
                    <label htmlFor="sortBy" className="text-sm font-medium text-gray-700">Urutkan berdasarkan:</label>
                    <select
                        id="sortBy"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="No.">No.</option>
                        <option value="Nama Barang">Nama Item</option>
                        <option value="Stock Sekarang">Stok</option>
                        <option value="Status">Status</option>
                    </select>
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="data-table-container rounded-md border border-gray-200 shadow-sm mt-8">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                No.
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Kode Sparepart
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nama Sparepart
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Kategori
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Stok
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Min Stock
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {parsedData.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-4 text-center text-gray-600">
                                    Tidak ada data suku cadang yang tersedia. Silakan unggah file CSV di tab 'Dashboard & Grafik'.
                                </td>
                            </tr>
                        ) : (
                            groupByCategory ? (
                                Object.keys(groupedData).sort().map(category => (
                                    <React.Fragment key={category}>
                                        <tr className="bg-gray-100">
                                            <td colSpan="7" className="px-6 py-3 text-center text-sm font-semibold text-gray-700 cursor-pointer"
                                                onClick={() => toggleCategory(category)}>
                                                {category} ({groupedData[category].length} item)
                                                <span className="ml-2">
                                                    {openCategories[category] ? '▲' : '▼'}
                                                </span>
                                            </td>
                                        </tr>
                                        {openCategories[category] && groupedData[category].map((item) => {
                                            const status = getStockStatus(item['Stock Sekarang'], item['MinStockThreshold']);
                                            return (
                                                <tr key={item.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                                        {item['No.']}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                        {item['Kode Barang']}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                        {item['Nama Barang']}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                        {item['Kategori']}
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${status.textColor} text-center`}>
                                                        {item['Stock Sekarang']}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                        {/* Display as text, not an input */}
                                                        {item['MinStockThreshold']}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                                            {status.text}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))
                            ) : (
                                sortedData.map((item) => {
                                    const status = getStockStatus(item['Stock Sekarang'], item['MinStockThreshold']);
                                    return (
                                        <tr key={item.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                                {item['No.']}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left">
                                                {item['Kode Barang']}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left">
                                                {item['Nama Barang']}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                {item['Kategori']}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${status.textColor} text-center`}>
                                                {item['Stock Sekarang']}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                {/* Display as text, not an input */}
                                                {item['MinStockThreshold']}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                                    {status.text}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StockManagementTab;