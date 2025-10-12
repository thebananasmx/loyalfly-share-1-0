import React, { useState, useRef, useCallback, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, orderBy, serverTimestamp, Timestamp, getDoc } from 'firebase/firestore';

// Helper to convert File to Base64 Data URL
const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};


// --- TYPE DEFINITION ---
interface UploadedFile {
    id: string; // Firestore document ID
    displayName: string;
    dataUrl: string; // Base64 Data URL of the file
    size: number;
    type: string;
    createdAt: Timestamp;
}

// --- ICONS ---
const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const FileIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A1 1 0 0111.293 2.707l4 4A1 1 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


// --- FILE VIEWER COMPONENT ---
const FileViewer: React.FC<{ fileId: string }> = ({ fileId }) => {
    const [file, setFile] = useState<Omit<UploadedFile, 'id'> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFile = async () => {
            try {
                const fileDocRef = doc(db, "files", fileId);
                const docSnap = await getDoc(fileDocRef);

                if (docSnap.exists()) {
                    setFile(docSnap.data() as Omit<UploadedFile, 'id'>);
                } else {
                    setError("El archivo no fue encontrado.");
                }
            } catch (err) {
                setError("Hubo un error al cargar el archivo.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFile();
    }, [fileId]);

    if (isLoading) {
        return <div className="min-h-screen w-full flex items-center justify-center"><Spinner /></div>;
    }

    if (error) {
        return <div className="min-h-screen w-full flex flex-col items-center justify-center text-center p-4">
             <h1 className="text-2xl font-bold text-red-600">Error</h1>
             <p className="mt-2 text-gray-500">{error}</p>
             <a href="/" className="mt-4 text-sm bg-gray-800 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-900">Volver a Loyalfly Share</a>
        </div>;
    }

    if (file) {
        if (file.type.startsWith('image/')) {
            return (
                <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center p-4">
                    <img src={file.dataUrl} alt={file.displayName} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-lg" />
                </div>
            );
        }
        if (file.type === 'application/pdf') {
            return (
                <div className="h-screen w-full flex flex-col">
                    <iframe src={file.dataUrl} title={file.displayName} className="w-full h-full border-none" />
                </div>
            );
        }
    }

    return null; // Should not be reached
};


// --- MAIN UPLOADER COMPONENT ---
const Uploader: React.FC = () => {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
    const [editingFile, setEditingFile] = useState<UploadedFile | null>(null);
    const [newDisplayName, setNewDisplayName] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const acceptedFileTypes = ['image/svg+xml', 'image/jpeg', 'image/png', 'application/pdf'];
    const MAX_FILE_SIZE_BYTES = 750 * 1024; // 750 KB limit for safety

    const fetchFiles = useCallback(async () => {
        setIsLoading(true);
        const filesCollection = collection(db, "files");
        const q = query(filesCollection, orderBy("createdAt", "desc"));
        const filesSnapshot = await getDocs(q);
        const filesList = filesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as UploadedFile[];
        setFiles(filesList);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);
    

    const handleUpload = useCallback(async (selectedFile: File) => {
        if (!selectedFile) return;

        if (!acceptedFileTypes.includes(selectedFile.type)) {
            alert('Formato de archivo no válido. Por favor sube un SVG, JPG, PNG, o PDF.');
            return;
        }

        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            alert(`El archivo es demasiado grande. El límite es de ${(MAX_FILE_SIZE_BYTES / 1024).toFixed(0)} KB para evitar errores en la base de datos.`);
            return;
        }

        setIsUploading(true);
        try {
            const dataUrl = await fileToDataURL(selectedFile);

            await addDoc(collection(db, "files"), {
                displayName: selectedFile.name,
                dataUrl: dataUrl,
                size: selectedFile.size,
                type: selectedFile.type,
                createdAt: serverTimestamp(),
            });
            await fetchFiles();
        } catch (error) {
            console.error("Error uploading file to Firestore:", error);
            alert("Hubo un error al subir el archivo.");
        } finally {
            setIsUploading(false);
        }
    }, [fetchFiles]);
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files[0]);
            e.target.value = ''; // Reset input
        }
    };
    const triggerFileSelect = () => {
        if (!isUploading) {
            fileInputRef.current?.click();
        }
    };

    const handleCopyUrl = (file: UploadedFile) => {
        const urlToCopy = `${window.location.origin}${window.location.pathname}#/view/${file.id}`;
        navigator.clipboard.writeText(urlToCopy).then(() => {
            setCopiedUrlId(file.id);
            setTimeout(() => setCopiedUrlId(null), 2000);
        });
    };

    const handleDelete = async (fileToDelete: UploadedFile) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar "${fileToDelete.displayName}"?`)) return;
        try {
            await deleteDoc(doc(db, "files", fileToDelete.id));
            setFiles(files => files.filter(f => f.id !== fileToDelete.id));
        } catch (error) {
            console.error("Error deleting file:", error);
            alert("Hubo un error al eliminar el archivo.");
        }
    };

    const handleEdit = (file: UploadedFile) => {
        setEditingFile(file);
        setNewDisplayName(file.displayName);
    };

    const handleSaveEdit = async () => {
        if (editingFile && newDisplayName.trim() !== '') {
            const fileDocRef = doc(db, "files", editingFile.id);
            try {
                await updateDoc(fileDocRef, {
                    displayName: newDisplayName.trim()
                });
                setFiles(files => files.map(f =>
                    f.id === editingFile.id ? { ...f, displayName: newDisplayName.trim() } : f
                ));
            } catch (error) {
                console.error("Error updating file name:", error);
                alert("Hubo un error al cambiar el nombre.");
            } finally {
                setEditingFile(null);
                setNewDisplayName('');
            }
        }
    };
    
    const handleCancelEdit = () => {
        setEditingFile(null);
        setNewDisplayName('');
    };

    useEffect(() => {
        if (editingFile && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingFile]);


    return (
        <div className="bg-white min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
            <header className="w-full max-w-2xl mx-auto text-center py-8">
                <h1 className="text-4xl font-bold text-gray-900">Loyalfly Share</h1>
                <p className="mt-2 text-gray-500">Sube tus archivos para generar enlaces compartibles al instante.</p>
            </header>

            <main className="w-full max-w-2xl mx-auto flex-grow">
                <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                    className={`relative block w-full border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-300 ${isDragging ? 'border-[#4D17FF] bg-purple-50' : 'border-gray-300'} ${isUploading ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer hover:border-gray-400'}`}
                >
                    <input ref={fileInputRef} type="file" accept={acceptedFileTypes.join(',')} onChange={handleFileSelect} className="hidden" disabled={isUploading} />
                    <div className="flex flex-col items-center">
                        {isUploading ? (
                            <>
                                <Spinner />
                                <span className="mt-2 block text-sm font-medium text-gray-900">Subiendo...</span>
                            </>
                        ) : (
                            <>
                                <UploadIcon />
                                <span className="mt-2 block text-sm font-medium text-gray-900">Arrastra y suelta tu archivo aquí</span>
                                <span className="block text-xs text-gray-500">o haz clic para seleccionar</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-8 space-y-4">
                    {isLoading ? (
                         <div className="flex justify-center py-8"><Spinner /></div>
                    ) : files.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">Tu historial de archivos aparecerá aquí.</p>
                    ) : (
                        files.map(file => (
                            <div key={file.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between shadow-sm transition-all duration-300 animate-fade-in">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center bg-gray-200 rounded-md">
                                        {file.type.startsWith('image/') ? (
                                            <img src={file.dataUrl} alt="Vista previa" className="h-full w-full object-cover rounded-md" />
                                        ) : (
                                            <FileIcon />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {editingFile?.id === file.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    ref={editInputRef}
                                                    type="text"
                                                    value={newDisplayName}
                                                    onChange={(e) => setNewDisplayName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit();
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                    onBlur={handleSaveEdit}
                                                    className="text-sm font-medium text-gray-900 truncate bg-white border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-1 focus:ring-[#4D17FF] focus:border-[#4D17FF]"
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-sm font-medium text-gray-900 truncate" title={file.displayName}>{file.displayName}</p>
                                        )}
                                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 ml-4">
                                    <button onClick={() => handleCopyUrl(file)} className="text-xs sm:text-sm bg-gray-800 text-white font-semibold py-2 px-3 rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4D17FF] transition-transform duration-200 hover:scale-105">
                                        {copiedUrlId === file.id ? '¡Copiado!' : 'Copiar URL'}
                                    </button>
                                    <button onClick={() => handleEdit(file)} title="Editar nombre" className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-200 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => handleDelete(file)} title="Eliminar archivo" className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            <footer className="py-4 mt-8">
                <p className="text-sm text-gray-400">powered by Loyalfly</p>
            </footer>
            
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

// --- APP COMPONENT WITH ROUTING LOGIC ---
const App: React.FC = () => {
    const [route, setRoute] = useState({ path: 'home', id: null });

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1); // Remove '#'
            const parts = hash.split('/').filter(p => p); // -> ['view', 'fileId']

            if (parts[0] === 'view' && parts[1]) {
                setRoute({ path: 'view', id: parts[1] });
            } else {
                setRoute({ path: 'home', id: null });
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Initial check

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    if (route.path === 'view' && route.id) {
        return <FileViewer fileId={route.id} />;
    }

    return <Uploader />;
};


export default App;