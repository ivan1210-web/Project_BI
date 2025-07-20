import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore'; // Added for csvProcessing within DashboardTab

import DashboardTab from './components/DashboardTab';
import StockManagementTab from './components/StockManagementTab';

const App = () => {
    // State variables for Firebase and User
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // State variables for application data and UI
    const [parsedData, setParsedData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');

    // Loading states for a more granular control
    const [isLoadingData, setIsLoadingData] = useState(true); // Initial data loading for app startup
    const [isProcessingFile, setIsProcessingFile] = useState(false); // For file upload/parsing
    const [showSuccessMessage, setShowSuccessMessage] = useState(false); // To display "Done" message

    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'stockManagement'

    const [currentParsingIndex, setCurrentParsingIndex] = useState(0);
    const [totalToParse, setTotalToParse] = useState(0);

    // Firebase Initialization and Authentication moved here
    useEffect(() => {
        try {
            // Try to get Firebase config from multiple sources
            let firebaseConfig = {};
            let appId = 'default-app-id';
            let initialAuthToken = undefined;

            // First, try to get from global variables (Canvas environment)
            if (typeof __firebase_config !== 'undefined') {
                try {
                    firebaseConfig = JSON.parse(__firebase_config);
                    console.log("Using Firebase config from global variable");
                } catch (parseError) {
                    console.error("Failed to parse global Firebase config:", parseError);
                }
            }

            // If global config is empty, try environment variables (local development)
            if (Object.keys(firebaseConfig).length === 0) {
                const envConfig = {
                    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                    appId: import.meta.env.VITE_FIREBASE_APP_ID
                };

                // Check if we have the minimum required config
                if (envConfig.apiKey && envConfig.authDomain && envConfig.projectId) {
                    firebaseConfig = envConfig;
                    console.log("Using Firebase config from environment variables");
                }
            }

            // Get app ID from global variable or environment
            if (typeof __app_id !== 'undefined') {
                appId = __app_id;
            } else if (import.meta.env.VITE_FIREBASE_APP_ID) {
                appId = import.meta.env.VITE_FIREBASE_APP_ID;
            }

            // Get initial auth token if available
            if (typeof __initial_auth_token !== 'undefined') {
                initialAuthToken = __initial_auth_token;
            }

            if (Object.keys(firebaseConfig).length === 0) {
                console.error("Firebase config is not available. Please ensure Firebase is configured.");
                setErrorMessage(
                    "Firebase configuration is missing. Please check the FIREBASE_SETUP.md file for setup instructions. " +
                    "You need to either create a .env file with Firebase credentials or set up global variables."
                );
                setIsLoadingData(false);
                return;
            }

            const firebaseApp = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(firebaseApp);
            const firebaseAuth = getAuth(firebaseApp);

            setDb(firestoreDb);
            setAuth(firebaseAuth);

            const signInUser = async () => {
                let signedInSuccessfully = false;

                if (initialAuthToken) {
                    try {
                        await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        console.log("Signed in with custom token.");
                        signedInSuccessfully = true;
                    } catch (error) {
                        console.warn("Custom token sign-in failed, attempting anonymous sign-in:", error.message);
                    }
                }

                if (!signedInSuccessfully) {
                    try {
                        await signInAnonymously(firebaseAuth);
                        console.log("Signed in anonymously.");
                        signedInSuccessfully = true;
                    } catch (anonymousError) {
                        console.error("Firebase anonymous authentication failed:", anonymousError);
                        setErrorMessage(
                            `Authentication failed: ${anonymousError.message}. ` +
                            "Please ensure Anonymous authentication is enabled in your Firebase project."
                        );
                    }
                }

                if (firebaseAuth.currentUser) {
                    setUserId(firebaseAuth.currentUser.uid);
                    setIsAuthReady(true);
                    console.log("Auth setup complete. Current user ID:", firebaseAuth.currentUser.uid);
                } else {
                    setIsAuthReady(false);
                    setIsLoadingData(false);
                    console.log("Auth setup failed: No user signed in.");
                }
            };

            signInUser();

            const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
                if (user) {
                    setUserId(user.uid);
                    console.log("Auth state changed, user ID:", user.uid);
                } else {
                    setUserId(null);
                    console.log("Auth state changed, no user.");
                }
            });

            return () => unsubscribeAuth();
        } catch (error) {
            console.error("Error initializing Firebase:", error);
            setErrorMessage(`Failed to initialize Firebase: ${error.message}`);
            setIsLoadingData(false);
        }
    }, []);

    // Function to fetch data from Firestore, moved here from utils/firebase.js
    const fetchSparePartsDataInternal = useCallback((firestoreDb, currentUserId) => {
        setIsLoadingData(true);
        
        // Get app ID using the same logic as Firebase initialization
        let appId = 'default-app-id';
        if (typeof __app_id !== 'undefined') {
            appId = __app_id;
        } else if (import.meta.env.VITE_FIREBASE_APP_ID) {
            appId = import.meta.env.VITE_FIREBASE_APP_ID;
        }
        
        const partsCollectionRef = collection(firestoreDb, `artifacts/${appId}/users/${currentUserId}/spareParts`);
        const q = query(partsCollectionRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = [];
            const currentHeaders = new Set();

            snapshot.forEach((firestoreDoc) => {
                const data = firestoreDoc.data();
                items.push({ id: firestoreDoc.id, ...data });
                Object.keys(data).forEach(key => currentHeaders.add(key));
            });

            const sortedHeaders = Array.from(currentHeaders).sort((a, b) => {
                const order = ['No.', 'Kode Barang', 'Nama Barang', 'Kategori', 'Model', 'Satuan', 'Stock Sebelumnya', 'Stock Sekarang', 'Harga Satuan', 'Total Harga Stock Keluar', 'Total Harga Stock Sekarang', 'Umur Stock (Dalam Hari)', 'MinStockThreshold'];
                const aIndex = order.indexOf(a);
                const bIndex = order.indexOf(b);

                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;
                return a.localeCompare(b);
            });

            setParsedData(items);
            setHeaders(sortedHeaders);
            setIsLoadingData(false);
            setErrorMessage('');
            console.log("Data fetched from Firestore (items):", items); // Added console log
            console.log("Headers fetched from Firestore (currentHeaders):", sortedHeaders); // Added console log
        }, (error) => {
            console.error("Error fetching data from Firestore:", error);
            setErrorMessage(`Gagal memuat data: ${error.message}`);
            setIsLoadingData(false);
        });

        return unsubscribe;
    }, [setParsedData, setHeaders, setIsLoadingData, setErrorMessage]); // Dependencies for useCallback

    // Fetch data from Firestore when db, userId, or auth state changes
    useEffect(() => {
        if (db && userId && isAuthReady) {
            const unsubscribe = fetchSparePartsDataInternal(db, userId);
            return () => unsubscribe(); // Cleanup on component unmount or dependencies change
        } else if (!isAuthReady) {
            setIsLoadingData(true);
        }
    }, [db, userId, isAuthReady, fetchSparePartsDataInternal]);


    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 to-indigo-200 font-sans text-gray-800 flex flex-col items-center">
            {/* Tailwind CSS CDN script */}
            <script src="https://cdn.tailwindcss.com"></script>

            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body {
                    font-family: 'Inter', sans-serif;
                }
                .recharts-default-tooltip {
                    border-radius: 0.5rem;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                `}
            </style>

            {/* Loading Overlay */}
            {(isLoadingData || isProcessingFile || showSuccessMessage) && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300">
                    <div className="flex flex-col items-center text-white">
                        {(isLoadingData || isProcessingFile) ? (
                            <>
                                <svg className="animate-spin h-12 w-12 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="mt-4 text-xl font-semibold">Memuat data...</p>
                                <p className="mt-2 text-sm text-gray-300">Ini mungkin memakan waktu beberapa detik, tergantung ukuran file Anda.</p>
                                {isProcessingFile && totalToParse > 0 && (
                                    <p className="mt-2 text-sm text-gray-300">
                                        Memproses data {currentParsingIndex} dari {totalToParse}
                                    </p>
                                )}
                                {errorMessage && <p className="mt-4 text-red-400 text-base">{errorMessage}</p>}
                            </>
                        ) : (
                            showSuccessMessage && (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-400">Pemrosesan Data Selesai!</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}


            <div className="w-screen h-full items-center justify-center bg-white rounded-xl shadow-2xl p-8">
                <h1 className="text-4xl font-bold text-center text-indigo-700 mb-6">
                    Dashboard Business Intelligence &  Manajemen Stock
                </h1>

                {/* User ID display
                {userId && (
                    <div className="text-right text-xs text-gray-500 mb-4">
                        ID Pengguna: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{userId}</span>
                    </div>
                )} */}


                {/* Tab Navigation */}
                <div className="flex justify-center mb-6 border-b border-gray-200">
                    <button
                        className={`py-2 px-6 text-lg font-medium rounded-t-lg transition-all duration-200
                                    ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        Dashboard & Grafik
                    </button>
                    <button
                        className={`py-2 px-6 text-lg font-medium rounded-t-lg transition-all duration-200
                                    ${activeTab === 'stockManagement' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => setActiveTab('stockManagement')}
                    >
                        Manajemen Stock
                    </button>
                </div>


                {/* Tab Content */}
                {activeTab === 'dashboard' && (
                    <DashboardTab
                        db={db}
                        userId={userId}
                        parsedData={parsedData}
                        headers={headers}
                        errorMessage={errorMessage}
                        setErrorMessage={setErrorMessage}
                        setIsProcessingFile={setIsProcessingFile}
                        setShowSuccessMessage={setShowSuccessMessage}
                        currentParsingIndex={currentParsingIndex}
                        setCurrentParsingIndex={setCurrentParsingIndex}
                        totalToParse={totalToParse}
                        setTotalToParse={setTotalToParse}
                    />
                )}

                {activeTab === 'stockManagement' && (
                    <StockManagementTab
                        parsedData={parsedData}
                        headers={headers}
                    />
                )}


                {/* Instructions / Footer */}
                <div className="text-center text-gray-500 text-sm mt-8">
                    <p>
                        Dashboard ini membantu Anda memvisualisasikan data suku cadang dan mengelola ambang batas stok.
                        Unggah file CSV untuk mengisi database, lalu gunakan tab untuk beralih antara
                        tampilan grafik dan manajemen stok.
                    </p>
                    {/* <p className="mt-2">
                        <small>
                        <a href="https://placehold.co/100x50/aabbcc/ffffff?text=Placeholder" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">
                            Contoh Gambar Placeholder
                        </a>
                        </small>
                    </p> */}
                </div>
            </div>
        </div>
    );
};

export default App;