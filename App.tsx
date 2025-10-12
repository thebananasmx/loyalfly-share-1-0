import React, { useState, useRef, useCallback, useEffect } from 'react';

// --- TYPE DEFINITION ---
interface UploadedFile {
    id: string;
    file: File;
    displayName: string;
    url: string;
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

const App: React.FC = () => {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
    const [editingFile, setEditingFile] = useState<UploadedFile | null>(null);
    const [newDisplayName, setNewDisplayName] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const acceptedFileTypes = ['image/svg+xml', 'image/jpeg', 'image/png', 'application/pdf'];

    const processFile = useCallback((selectedFile: File) => {
        if (selectedFile && acceptedFileTypes.includes(selectedFile.type)) {
            const newFile: UploadedFile = {
                id: `${selectedFile.name}-${Date.now()}`,
                file: selectedFile,
                displayName: selectedFile.name,
                url: URL.createObjectURL(selectedFile),
            };
            setFiles(prevFiles => [newFile, ...prevFiles]);
        } else {
            alert('Formato de archivo no válido. Por favor sube un SVG, JPG, PNG, o PDF.');
        }
    }, []);
    
    // --- DRAG AND DROP HANDLERS ---
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };
    
    // --- FILE INPUT HANDLERS ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };
    const triggerFileSelect = () => fileInputRef.current?.click();

    // --- FILE ACTIONS ---
    const handleCopyUrl = (file: UploadedFile) => {
        navigator.clipboard.writeText(file.url).then(() => {
            setCopiedUrlId(file.id);
            setTimeout(() => setCopiedUrlId(null), 2000);
        });
    };

    const handleDelete = (fileToDelete: UploadedFile) => {
        setFiles(files => files.filter(f => f.id !== fileToDelete.id));
        URL.revokeObjectURL(fileToDelete.url);
    };

    const handleEdit = (file: UploadedFile) => {
        setEditingFile(file);
        setNewDisplayName(file.displayName);
    };

    const handleSaveEdit = () => {
        if (editingFile) {
            setFiles(files => files.map(f =>
                f.id === editingFile.id ? { ...f, displayName: newDisplayName || f.displayName } : f
            ));
            setEditingFile(null);
            setNewDisplayName('');
        }
    };
    
    const handleCancelEdit = () => {
        setEditingFile(null);
        setNewDisplayName('');
    };

    // --- LIFECYCLE FOR CLEANUP ---
    useEffect(() => {
        return () => {
            files.forEach(file => URL.revokeObjectURL(file.url));
        };
    }, [files]);

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
                {/* --- DROPZONE --- */}
                <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                    className={`relative block w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-300 ${isDragging ? 'border-[#4D17FF] bg-purple-50' : 'border-gray-300 hover:border-gray-400'}`}
                >
                    <input ref={fileInputRef} type="file" accept={acceptedFileTypes.join(',')} onChange={handleFileSelect} className="hidden" />
                    <div className="flex flex-col items-center">
                        <UploadIcon />
                        <span className="mt-2 block text-sm font-medium text-gray-900">Arrastra y suelta tu archivo aquí</span>
                        <span className="block text-xs text-gray-500">o haz clic para seleccionar</span>
                    </div>
                </div>

                {/* --- FILES LIST --- */}
                <div className="mt-8 space-y-4">
                    {files.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">Tu historial de archivos aparecerá aquí.</p>
                    ) : (
                        files.map(file => (
                            <div key={file.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between shadow-sm transition-all duration-300 animate-fade-in">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center">
                                        {file.file.type.startsWith('image/') ? (
                                            <img src={file.url} alt="Vista previa" className="h-full w-full object-cover rounded-md" />
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
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                                    onBlur={handleCancelEdit}
                                                    className="text-sm font-medium text-gray-900 truncate bg-white border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-1 focus:ring-[#4D17FF] focus:border-[#4D17FF]"
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-sm font-medium text-gray-900 truncate" title={file.displayName}>{file.displayName}</p>
                                        )}
                                        <p className="text-xs text-gray-500">{(file.file.size / 1024).toFixed(1)} KB</p>
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

export default App;
