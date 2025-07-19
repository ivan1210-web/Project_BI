import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CustomTooltip, CustomTooltipLongestStockAge } from './common/CustomTooltips';
import { collection, doc, setDoc, query, deleteDoc, getDocs } from 'firebase/firestore'; // Added for csvProcessing

// Chart Colors
const chartColors = ['#8884d8', '#059669', '#ffc658', '#FF8042', '#0088FE', '#00C49F', '#FFBB28', '#A020F0', '#008080', '#DAA520', '#6A5ACD'];

// Helper functions for chart data preparation, moved from utils/chartHelpers.js
const prepareCategoryDistributionData = (parsedData) => {
    if (parsedData.length === 0) return [];
    const categoryCounts = {};
    parsedData.forEach(item => {
        const category = item['Kategori'] || 'Tidak Dikategorikan';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    return Object.keys(categoryCounts).map(category => ({
        name: category,
        value: categoryCounts[category]
    }));
};

const prepareStockComparisonData = (parsedData) => {
    if (parsedData.length === 0) return [];
    const sortedData = [...parsedData]
        .filter(item => typeof item['Stock Sekarang'] === 'number' && typeof item['Stock Sebelumnya'] === 'number' && item['Stock Sekarang'] >= 0 && item['Stock Sebelumnya'] >= 0)
        .sort((a, b) => b['Stock Sekarang'] - a['Stock Sekarang']);

    return sortedData.slice(0, 25).map(item => {
        const fullName = item['Nama Barang'] || item['Kode Barang'] || 'Item Tidak Dikenal';
        const shortName = fullName.length > 20 ? fullName.substring(0, 17) + '...' : fullName;
        return {
            name: shortName,
            fullName: fullName,
            'Stok Sebelumnya': item['Stock Sebelumnya'],
            'Stok Sekarang': item['Stock Sekarang']
        };
    });
};

const prepareStockAgeDistributionData = (parsedData) => {
    if (parsedData.length === 0) return [];
    const stockAges = parsedData
        .map(item => parseFloat(item['Umur Stock (Dalam Hari)']))
        .filter(age => !isNaN(age) && age >= 0);

    if (stockAges.length === 0) return [];

    const maxAge = Math.max(...stockAges);
    const minAge = Math.min(...stockAges);
    const binSize = Math.ceil((maxAge - minAge) / 10);
    if (binSize === 0) {
        return [{ name: `${minAge}-${minAge + binSize}`, count: stockAges.length }];
    }

    const bins = Array(Math.ceil((maxAge + 1 - minAge) / binSize)).fill(0);
    stockAges.forEach(age => {
        const binIndex = Math.floor((age - minAge) / binSize);
        if (binIndex < bins.length) {
            bins[binIndex]++;
        }
    });

    return bins.map((count, index) => {
        const start = minAge + index * binSize;
        const end = start + binSize - (index === bins.length - 1 && start + binSize > maxAge ? 0 : 1);
        return { name: `${Math.floor(start)}-${Math.floor(end)}`, count: count };
    }).filter(d => d.count > 0);
};

const prepareAverageStockAgeByCategoryData = (parsedData) => {
    if (parsedData.length === 0) return [];
    const categoryAges = {};
    parsedData.forEach(item => {
        const category = item['Kategori'] || 'Tidak Dikategorikan';
        const age = parseFloat(item['Umur Stock (Dalam Hari)']);
        if (!isNaN(age) && age >= 0) {
            if (!categoryAges[category]) {
                categoryAges[category] = { sum: 0, count: 0 };
            }
            categoryAges[category].sum += age;
            categoryAges[category].count++;
        }
    });

    return Object.keys(categoryAges).map(category => ({
        name: category,
        'Average Stock Age': categoryAges[category].count > 0 ? (categoryAges[category].sum / categoryAges[category].count) : 0
    })).sort((a, b) => b['Average Stock Age'] - a['Average Stock Age']);
};

const prepareMostSoldProductsData = (parsedData) => {
    if (parsedData.length === 0) return [];
    const productSales = {};
    parsedData.forEach(item => {
        const productName = item['Nama Barang'] || 'Produk Tidak Dikenal';
        const stockOut = Math.abs(parseFloat(item['Stock Keluar']) || 0); // Ensure absolute value
        productSales[productName] = (productSales[productName] || 0) + stockOut;
    });

    return Object.keys(productSales)
        .map(product => ({
            name: product,
            'Quantity Sold': productSales[product]
        }))
        .sort((a, b) => b['Quantity Sold'] - a['Quantity Sold'])
        .slice(0, 25);
};

const preparePriceDistributionByCategoryData = (parsedData) => {
    if (parsedData.length === 0) return [];
    const categoryStockValue = {};
    parsedData.forEach(item => {
        const category = item['Kategori'] || 'Tidak Dikategorikan';
        const currentStock = parseFloat(item['Stock Sekarang']) || 0;
        const unitPrice = parseFloat(item['Harga Satuan']) || 0;
        const stockValue = currentStock * unitPrice;

        if (!isNaN(stockValue)) {
            if (!categoryStockValue[category]) {
                categoryStockValue[category] = 0;
            }
            categoryStockValue[category] += stockValue;
        }
    });

    return Object.keys(categoryStockValue).map(category => ({
        name: category,
        value: categoryStockValue[category]
    })).sort((a, b) => b.value - a.value);
};

const prepareLongestStockAgeChartData = (parsedData) => {
    if (parsedData.length === 0) return [];
    const longAgeItems = parsedData
        .filter(item => {
            const age = parseFloat(item['Umur Stock (Dalam Hari)']);
            const stock = parseFloat(item['Stock Sekarang']);
            return !isNaN(age) && age >= 0 && stock > 0;
        })
        .sort((a, b) => parseFloat(b['Umur Stock (Dalam Hari)']) - parseFloat(a['Umur Stock (Dalam Hari)']));

    return longAgeItems.slice(0, 15).map(item => {
        const fullName = item['Nama Barang'] || item['Kode Barang'] || 'Item Tidak Dikenal';
        const shortName = fullName.length > 20 ? fullName.substring(0, 17) + '...' : fullName;
        return {
            name: shortName,
            fullName: fullName,
            'Umur Stock (Dalam Hari)': parseFloat(item['Umur Stock (Dalam Hari)'])
        };
    });
};

// Function to upload CSV to Firestore, moved here from utils/csvProcessing.js
const uploadCsvToFirestore = async (db, userId, csvText, setErrorMessage, setIsProcessingFile, setShowSuccessMessage, setCurrentParsingIndex, setTotalToParse) => {
    console.log("Upload CSV called. db:", !!db, "userId:", !!userId);
    if (!db || !userId) {
        setErrorMessage("Database tidak siap untuk diunggah. Pastikan Anda telah masuk.");
        setIsProcessingFile(false);
        return;
    }

    setIsProcessingFile(true);
    setErrorMessage('');

    try {
        const lines = csvText.trim().split(/\r?\n/);
        if (lines.length <= 1 || lines[0].trim() === '') {
            setErrorMessage('File CSV kosong atau formatnya salah. Harap periksa format CSV.');
            setIsProcessingFile(false);
            return;
        }

        setTotalToParse(lines.length - 1); // total rows to parse (excluding header)
        setCurrentParsingIndex(0);

        const splitRegex = /,(?=(?:(?:[^\"]*\"){2})*[^\"]*$)/;

        const newHeaders = lines[0].split(splitRegex).map(header => header.trim().replace(/"/g, ''));
        
        // Get app ID using the same logic as Firebase initialization
        let appId = 'default-app-id';
        if (typeof __app_id !== 'undefined') {
            appId = __app_id;
        } else if (import.meta.env.VITE_FIREBASE_APP_ID) {
            appId = import.meta.env.VITE_FIREBASE_APP_ID;
        }
        
        const partsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/spareParts`);

        const existingDocs = await getDocs(query(partsCollectionRef));
        const deletePromises = existingDocs.docs.map(d => deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/spareParts`, d.id)));
        await Promise.all(deletePromises);
        console.log("Data suku cadang yang ada telah dihapus.");

        let uploadedRowCount = 0;
        const rawParsedItems = [];
        for (let i = 1; i < lines.length; i++) {
            setCurrentParsingIndex(i);
            await new Promise(resolve => setTimeout(resolve, 10)); // Add a small delay for UI update
            const line = lines[i].trim();
            if (line === '') continue;

            const values = line.split(splitRegex).map(value => value.trim());

            const processedValues = values.map(val => {
                if (val.startsWith('"') && val.endsWith('"')) {
                    return val.substring(1, val.length - 1);
                }
                return val;
            });

            if (processedValues.length !== newHeaders.length) {
                console.warn(`Melewatkan baris malformed ${i + 1} karena ketidakcocokan jumlah kolom (${processedValues.length} nilai vs ${newHeaders.length} header yang diharapkan): "${lines[i]}"`);
                continue;
            }

            const rowObject = {};
            newHeaders.forEach((header, index) => {
                let value = processedValues[index];

                if (['No.', 'Stock Sebelumnya', 'Stock Sekarang', 'Harga Satuan', 'Total Harga Stock Keluar', 'Total Harga Stock Sekarang', 'Umur Stock (Dalam Hari)'].includes(header)) {
                    value = value.replace(/,/g, ''); // Remove commas for numeric parsing
                    rowObject[header] = parseFloat(value) || 0;
                    if (header === 'No.') { // Ensure 'No.' is parsed as integer
                        rowObject[header] = parseInt(value, 10) || 0;
                    } else if (header === 'Stock Keluar') { // Ensure Stock Keluar is absolute
                        rowObject[header] = Math.abs(parseFloat(value) || 0); // Make sure Stock Keluar is always positive
                    }
                }
                else {
                    rowObject[header] = value;
                }
            });
            rawParsedItems.push(rowObject);
        }

        for (const rowObject of rawParsedItems) {
            const currentStock = parseFloat(rowObject['Stock Sekarang']) || 0;
            const stockOutflow = Math.abs(parseFloat(rowObject['Stock Keluar'])) || 0;
            const previousStock = parseFloat(rowObject['Stock Sebelumnya']) || 0;

            const MIN_BASE_STOCK = 2;
            const IMPACT_FROM_PREVIOUS_STOCK_DROP_PERCENTAGE = 0.10;

            let calculatedMinThreshold;
            if (currentStock === 0) {
                calculatedMinThreshold = Math.max(MIN_BASE_STOCK, Math.ceil(stockOutflow * 0.25));
            } else {
                const baseCurrentStockThreshold = 0.10 * currentStock;
                const outflowComponent = 0.25 * stockOutflow;
                const potentialReduction = Math.max(0, previousStock - currentStock);
                const impactFromPreviousStockDrop = potentialReduction * IMPACT_FROM_PREVIOUS_STOCK_DROP_PERCENTAGE;

                calculatedMinThreshold = Math.max(MIN_BASE_STOCK, Math.ceil(baseCurrentStockThreshold + outflowComponent + impactFromPreviousStockDrop));
            }
            rowObject['MinStockThreshold'] = calculatedMinThreshold;


            const docId = rowObject['Kode Barang'] ? String(rowObject['Kode Barang']) : doc(partsCollectionRef).id;
            await setDoc(doc(partsCollectionRef, docId), rowObject);
            uploadedRowCount++;
        }

        console.log(`CSV data uploaded to Firestore successfully. Total rows processed for upload: ${uploadedRowCount}.`);
        setShowSuccessMessage(true);

    } catch (error) {
        console.error("Error uploading CSV to Firestore:", error);
        setErrorMessage(`Gagal mengunggah CSV: ${error.message}`);
    } finally {
        setIsProcessingFile(false);
        setTimeout(() => {
            setShowSuccessMessage(false);
            setCurrentParsingIndex(0);
            setTotalToParse(0);
        }, 3000);
    }
};


const DashboardTab = ({ db, userId, parsedData, headers, errorMessage, setErrorMessage, isProcessingFile, setIsProcessingFile, showSuccessMessage, setShowSuccessMessage, currentParsingIndex, setCurrentParsingIndex, totalToParse, setTotalToParse }) => {
    // States for specific auto-generated charts
    const [categoryDistributionData, setCategoryDistributionData] = useState([]);
    const [stockComparisonData, setStockComparisonData] = useState([]);
    const [stockAgeDistributionData, setStockAgeDistributionData] = useState([]);
    const [averageStockAgeByCategoryData, setAverageStockAgeByCategoryData] = useState([]);
    const [mostSoldProductsData, setMostSoldProductsData] = useState([]);
    const [priceDistributionByCategoryData, setPriceDistributionByCategoryData] = useState([]);
    const [longestStockAgeChartData, setLongestStockAgeChartData] = useState([]);

    const [selectedXAxis, setSelectedXAxis] = useState('');
    const [selectedYAxis, setSelectedYAxis] = useState('');
    const [chartData, setChartData] = useState([]);

    /**
     * Handles file selection and reads the content, then uploads to Firestore.
     * @param {Event} event - The file input change event.
     */
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setErrorMessage('');
            setShowSuccessMessage(false);
            setIsProcessingFile(true);
            const reader = new FileReader();

            reader.onload = (e) => {
                const content = e.target.result;
                uploadCsvToFirestore(db, userId, content, setErrorMessage, setIsProcessingFile, setShowSuccessMessage, setCurrentParsingIndex, setTotalToParse);
            };

            reader.onerror = () => {
                setErrorMessage('Gagal membaca file.');
                setIsProcessingFile(false);
            };

            reader.readAsText(file);
        }
    };

    // Prepare chart data whenever parsedData changes
    useEffect(() => {
        setCategoryDistributionData(prepareCategoryDistributionData(parsedData));
        setStockComparisonData(prepareStockComparisonData(parsedData));
        setStockAgeDistributionData(prepareStockAgeDistributionData(parsedData));
        setAverageStockAgeByCategoryData(prepareAverageStockAgeByCategoryData(parsedData));
        setMostSoldProductsData(prepareMostSoldProductsData(parsedData));
        setPriceDistributionByCategoryData(preparePriceDistributionByCategoryData(parsedData));
        setLongestStockAgeChartData(prepareLongestStockAgeChartData(parsedData));
    }, [parsedData]);

    // Prepare custom chart data based on user selection
    useEffect(() => {
        if (parsedData.length > 0 && selectedXAxis && selectedYAxis) {
            const aggregatedData = {};
            parsedData.forEach(row => {
                const xValue = row[selectedXAxis];
                let yValue = parseFloat(row[selectedYAxis]);
                if (isNaN(yValue)) {
                    console.warn(`Nilai non-numerik ditemukan di kolom Sumbu Y untuk kategori "${xValue}": "${row[selectedYAxis]}". Nilai ini akan dilewati.`);
                    return;
                }
                aggregatedData[xValue] = (aggregatedData[xValue] || 0) + yValue;
            });
            setChartData(Object.keys(aggregatedData).map(key => ({ category: key, value: aggregatedData[key] })));
        } else {
            setChartData([]);
        }
    }, [parsedData, selectedXAxis, selectedYAxis]);


    return (
        <div className="dashboard-content-wrapper">
            {/* File Upload Section */}
            <div className="bg-purple-50 p-6 rounded-lg shadow-inner border border-purple-200 mt-6">
                <p className="block text-lg font-medium text-gray-700 mb-3">
                    Unggah file CSV baru untuk memperbarui inventaris Anda di database:
                </p>
                <input
                    type="file"
                    id="csv-upload"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-indigo-50 file:text-indigo-700
                            hover:file:bg-indigo-100 cursor-pointer"
                />
                {errorMessage && (
                    <p className="mt-3 text-red-600 text-sm font-medium">{errorMessage}</p>
                )}
            </div>

            {/* Automatic Business Intelligence Graphs */}
            {parsedData.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-lg shadow-inner border border-green-200 space-y-8 mt-6">
                    <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
                        Grafik Business Intelligence
                    </h2>

                    {/* Pie Chart: Distribusi Item berdasarkan Kategori */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold text-center mb-4">
                            Distribusi Item berdasarkan Kategori
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={categoryDistributionData}
                                    cx="50%" cy="50%" labelLine={false} outerRadius={100}
                                    fill="#8884d8" dataKey="value"
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                                >
                                    {categoryDistributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                        <p className="text-center text-sm text-gray-600 mt-2">
                            Grafik ini menyoroti kategori dengan item terbanyak, memandu fokus untuk manajemen inventaris dan strategi pengadaan.
                        </p>
                    </div>

                    {/* Grouped Bar Chart: Perbandingan Stok */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold text-center mb-4">
                            Perbandingan Stok (25 Teratas berdasarkan Stok Saat Ini)
                        </h3>
                        <ResponsiveContainer width="100%" height={450}>
                            <BarChart data={stockComparisonData} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-60} textAnchor="end" height={140} interval={0} dy={25} />
                                <YAxis domain={[0, 'auto']} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" align="center" layout="horizontal" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Stok Sebelumnya" fill="#8884d8" name="Stok Sebelumnya" minPointSize={1} />
                                <Bar dataKey="Stok Sekarang" fill="#059669" name="Stok Sekarang" minPointSize={1} />
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-center text-sm text-gray-600 mt-2">
                            Tinjau grafik ini untuk mengidentifikasi item berkinerja terbaik atau kritis dengan cepat, memungkinkan pengisian ulang proaktif atau identifikasi potensi kelebihan stok.
                        </p>
                    </div>

                    {/* New Chart: Produk Terlaris */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold text-center mb-4">
                            Produk Terlaris (25 Teratas)
                        </h3>
                        <ResponsiveContainer width="100%" height={450}>
                            <BarChart data={mostSoldProductsData} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-60} textAnchor="end" height={140} interval={0} dy={25} />
                                <YAxis domain={[0, 'auto']} />
                                <Tooltip />
                                <Legend verticalAlign="top" align="center" layout="horizontal" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Quantity Sold" fill="#A020F0" name="Jumlah Terjual" minPointSize={1} />
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-center text-sm text-gray-600 mt-2">
                            Grafik ini menunjukkan 25 produk terlaris, membantu mengidentifikasi item yang bergerak cepat dan mengoptimalkan tingkat inventaris.
                        </p>
                    </div>

                    {/* New Chart: Distribusi Nilai Stok berdasarkan Kategori Item */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold text-center mb-4">
                            Distribusi Nilai Stok berdasarkan Kategori Item
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={priceDistributionByCategoryData}
                                    cx="50%" cy="50%" labelLine={false} outerRadius={100}
                                    fill="#008080" dataKey="value"
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                                >
                                    {priceDistributionByCategoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                        <p className="text-center text-sm text-gray-600 mt-2">
                            Grafik ini menampilkan distribusi total nilai stok di berbagai kategori, membantu dalam strategi harga dan analisis biaya.
                        </p>
                    </div>

                    {/* Histogram: Distribusi Umur Stok dalam Hari */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold text-center mb-4">
                            Distribusi Umur Stok dalam Hari
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stockAgeDistributionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tickFormatter={(tick) => `Umur: ${tick} hari`} />
                                <YAxis label={{ value: 'Jumlah Item', angle: -90, position: 'insideLeft' }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#ffc658" name="Jumlah Item" />
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-center text-sm text-gray-600 mt-2">
                            Analisis distribusi umur stok untuk mengidentifikasi inventaris yang bergerak lambat atau menua, yang mungkin memerlukan promosi atau kliring strategis.
                        </p>
                    </div>

                    {/* Bar Chart: Rata-rata Umur Stok berdasarkan Kategori */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold text-center mb-4">
                            Rata-rata Umur Stok berdasarkan Kategori
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={averageStockAgeByCategoryData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} interval={0} />
                                <YAxis label={{ value: 'Rata-rata Umur Stok (Hari)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Average Stock Age" fill="#FF8042" name="Rata-rata Umur Stok" />
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-center text-sm text-gray-600 mt-2">
                            Gunakan grafik ini untuk menentukan kategori dengan rata-rata umur stok yang lebih tinggi, menunjukkan area di mana inventaris mungkin stagnan dan memerlukan perhatian.
                        </p>
                    </div>

                    {/* New Bar Chart: Item dengan Umur Stok Terlama */}
                    {longestStockAgeChartData.length > 0 && (
                        <div className="bg-white p-4 rounded-lg shadow-md">
                            <h3 className="text-xl font-semibold text-center mb-4">
                                Item dengan Umur Stok Terlama (15 Teratas)
                            </h3>
                            <ResponsiveContainer width="100%" height={450}>
                                <BarChart data={longestStockAgeChartData} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-60} textAnchor="end" height={140} interval={0} dy={25} />
                                    <YAxis label={{ value: 'Umur Stok (Hari)', angle: -90, position: 'insideLeft' }} domain={[0, 'auto']} />
                                    <Tooltip content={<CustomTooltipLongestStockAge />} />
                                    <Legend verticalAlign="top" align="center" layout="horizontal" wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="Umur Stock (Dalam Hari)" fill="#FF6347" name="Umur Stok" minPointSize={1} />
                                </BarChart>
                            </ResponsiveContainer>
                            <p className="text-center text-sm text-gray-600 mt-2">
                                Grafik ini menampilkan item dengan umur stok terlama yang saat ini tersedia, membantu mengidentifikasi barang yang memerlukan promosi atau tindakan lain.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DashboardTab;