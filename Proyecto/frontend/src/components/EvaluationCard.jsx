import React, { useEffect } from 'react';

function EvaluationCard({ rule, onAnswerChange }) {
    
    const answer = rule.user_answer || { 
        status: 'NOT_EVALUATED', 
        notes: '', 
        evidence: null,
        name: '',
        email: '',
        phone: '',
        files: []
    };
    
    // Mapea tu estado a las clases CSS
    const statusMap = {
        'COMPLIANT': 'compliant',
        'NON_COMPLIANT': 'non-compliant',
        'PARTIAL': 'partial',
        'NOT_EVALUATED': 'not-evaluated'
    };
    const statusClass = statusMap[answer.status] || 'not-evaluated';
    const statusText = answer.status.replace('_', ' ').toLowerCase();
    
    // Get required files from rule
    const requiredFiles = rule.required_files || {};
    const requiredFileTypes = Object.keys(requiredFiles);

    // --- Handlers (manejadores de eventos) ---
    const handleStatusChange = (e) => {
        onAnswerChange(rule.id, { status: e.target.value });
    };

    const handleFileUpload = (fileType, e) => {
        const file = e.target.files[0];
        if (file) {
            onAnswerChange(rule.id, { [`file_${fileType}`]: file });
        } else {
            // If no file selected, reset the input
            e.target.value = '';
        }
    };

    const handleFileRemove = (fileType, e) => {
        e.preventDefault();
        // Reset the file input so the user can upload the same file again
        const fileInput = document.getElementById(`file-${rule.id}-${fileType}`);
        if (fileInput) {
            fileInput.value = '';
        }
        onAnswerChange(rule.id, { [`file_${fileType}`]: '' });
    };

    const handleTextFieldChange = (fieldName, e) => {
        onAnswerChange(rule.id, { [fieldName]: e.target.value });
    };

    const handleTextFieldBlur = (fieldName, e) => {
        onAnswerChange(rule.id, { [fieldName]: e.target.value });
    };

    // Helper to get file by type
    const getFileByType = (fileType) => {
        return answer.files?.find(f => f.file_type === fileType);
    };

    // Helper to extract filename from URL
    const getFileName = (fileUrl) => {
        if (!fileUrl) return '';
        // Extract filename from URL (e.g., "/media/evidence/file.pdf" -> "file.pdf")
        const parts = fileUrl.split('/');
        return parts[parts.length - 1];
    };

    // Helper to get full file URL
    const getFileUrl = (fileUrl) => {
        if (!fileUrl) return '';
        // If it's already a full URL, return it
        if (fileUrl.startsWith('http')) return fileUrl;
        // Otherwise, prepend the API base URL
        return `http://localhost:8000${fileUrl}`;
    };

    const handleNotesChange = (e) => {
        // Usamos un 'timer' (debounce) para no saturar la API en cada tecla
        const timerId = setTimeout(() => {
            onAnswerChange(rule.id, { notes: e.target.value });
        }, 1000); // Guarda 1 segundo después de dejar de teclear
        
        // Si hay un timer anterior, lo limpiamos
        // (Esto requiere un manejo de estado más complejo, por ahora lo dejamos simple)
        // Por simplicidad, guardamos al desenfocar (onBlur)
        // onAnswerChange(rule.id, { notes: e.target.value }); 
    };

    const handleNotesBlur = (e) => {
        onAnswerChange(rule.id, { notes: e.target.value });
    };

    useEffect(() => {
        if (window.feather) {
            window.feather.replace();
        }
        
        // Reset file inputs when files are removed
        if (requiredFileTypes.length > 0) {
            requiredFileTypes.forEach(fileType => {
                const file = getFileByType(fileType);
                const fileInput = document.getElementById(`file-${rule.id}-${fileType}`);
                if (fileInput && !file) {
                    // If file was removed, reset the input
                    fileInput.value = '';
                }
            });
        }
        
        // Reset legacy evidence input when evidence is removed
        if (!answer.evidence) {
            const legacyInput = document.getElementById(`file-legacy-${rule.id}`);
            if (legacyInput) {
                legacyInput.value = '';
            }
        }
    }, [answer.files, answer.evidence, rule.id, requiredFileTypes]);

    return (
        <div className="card" style={{ padding: '1.5rem', transition: 'all 0.2s' }}>
            <div className="rule-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span className="rule-reference" style={{ fontWeight: '600', color: '#1e40af' }}>{rule.reference}</span>
                <span className={`status-badge status-${statusClass}`}>
                    {statusText}
                </span>
            </div>
            <p className="rule-text" style={{ color: '#4b5563', marginBottom: '1.rem' }}>
                {rule.text}
            </p>

            {/* Accion Sugerida (Funcionalidad 3) */}
            {answer.status === 'NON_COMPLIANT' && rule.suggested_action && (
                <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '0.375rem', marginBottom: '1rem' }}>
                    <strong>Acción Sugerida:</strong> {rule.suggested_action}
                </div>
            )}

            {/* Controles Dinámicos */}
            <div className="controls" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                {/* Primera fila: Estado y Notas */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                    {/* Selector de Estado */}
                    <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 150px' }}>
                        <label className="control-label" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Estado</label>
                        <select value={answer.status} onChange={handleStatusChange} 
                                className="border border-gray-300 rounded-md p-2 text-sm">
                            <option value="NOT_EVALUATED">No Evaluado</option>
                            <option value="COMPLIANT">Cumple</option>
                            <option value="NON_COMPLIANT">No Cumple</option>
                            <option value="PARTIAL">Cumple Parcialmente</option>
                        </select>
                    </div>

                    {/* Notas */}
                    <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 300px' }}>
                        <label className="control-label" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Notas / Comentarios</label>
                        <textarea 
                            placeholder="Añadir notas..."
                            defaultValue={answer.notes || ''}
                            onBlur={handleNotesBlur}
                            className="border border-gray-300 rounded-md p-2 text-sm"
                        ></textarea>
                    </div>
                </div>

                {/* Campos de Texto Dinámicos (Nombre, Email, Teléfono) */}
                {(rule.requires_name === 1 || rule.requires_mail === 1 || rule.requires_phone === 1) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                        {rule.requires_name === 1 && (
                            <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 200px' }}>
                                <label className="control-label" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Nombre *</label>
                                <input 
                                    type="text"
                                    placeholder="Ingrese el nombre"
                                    defaultValue={answer.name || ''}
                                    onBlur={(e) => handleTextFieldBlur('name', e)}
                                    className="border border-gray-300 rounded-md p-2 text-sm"
                                />
                            </div>
                        )}
                        {rule.requires_mail === 1 && (
                            <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 200px' }}>
                                <label className="control-label" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Email *</label>
                                <input 
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    defaultValue={answer.email || ''}
                                    onBlur={(e) => handleTextFieldBlur('email', e)}
                                    className="border border-gray-300 rounded-md p-2 text-sm"
                                />
                            </div>
                        )}
                        {rule.requires_phone === 1 && (
                            <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 200px' }}>
                                <label className="control-label" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Teléfono *</label>
                                <input 
                                    type="tel"
                                    placeholder="+56 9 1234 5678"
                                    defaultValue={answer.phone || ''}
                                    onBlur={(e) => handleTextFieldBlur('phone', e)}
                                    className="border border-gray-300 rounded-md p-2 text-sm"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Archivos Dinámicos */}
                {requiredFileTypes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                            {requiredFileTypes.map((fileType) => {
                                const file = getFileByType(fileType);
                                return (
                                    <div key={fileType} className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 200px' }}>
                                        <label className="control-label" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                                            {fileType} {requiredFiles[fileType] !== 0 && `(${requiredFiles[fileType]})`}
                                        </label>
                                        <input 
                                            type="file" 
                                            id={`file-${rule.id}-${fileType}`} 
                                            onChange={(e) => handleFileUpload(fileType, e)} 
                                            style={{ display: 'none' }} 
                                        />
                                        <label 
                                            htmlFor={`file-${rule.id}-${fileType}`} 
                                            className="cursor-pointer bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm font-medium text-center"
                                        >
                                            {file ? 'Cambiar Archivo' : 'Adjuntar Archivo'}
                                        </label>
                                        {file && (
                                            <div className="evidence-badge flex items-center justify-between" style={{ display: 'inline-flex', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.375rem', width: '100%' }}>
                                                <a 
                                                    href={getFileUrl(file.file)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="truncate text-sm text-blue-600 hover:text-blue-800"
                                                    style={{ flex: 1, marginRight: '0.5rem' }}
                                                    title={getFileName(file.file)}
                                                >
                                                    {getFileName(file.file) || `Ver ${fileType}`}
                                                </a>
                                                <button 
                                                    onClick={(e) => handleFileRemove(fileType, e)} 
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Eliminar archivo"
                                                    style={{ flexShrink: 0 }}
                                                >
                                                    <i data-feather="x-circle" style={{ width: '16px', height: '16px' }}></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Evidencia Legacy (para compatibilidad) */}
                {requiredFileTypes.length === 0 && (
                    <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 200px' }}>
                        <label className="control-label" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Evidencia</label>
                        <input type="file" id={`file-legacy-${rule.id}`} onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                onAnswerChange(rule.id, { evidence: file });
                            } else {
                                e.target.value = '';
                            }
                        }} style={{ display: 'none' }} />
                        <label htmlFor={`file-legacy-${rule.id}`} className="cursor-pointer bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm font-medium text-center">
                            Adjuntar Archivo
                        </label>
                        {answer.evidence && (
                            <div className="evidence-badge flex items-center justify-between" style={{ display: 'inline-flex', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.375rem', width: '100%' }}>
                                <a 
                                    href={getFileUrl(answer.evidence)} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="truncate text-sm text-blue-600 hover:text-blue-800"
                                    style={{ flex: 1, marginRight: '0.5rem' }}
                                    title={getFileName(answer.evidence)}
                                >
                                    {getFileName(answer.evidence) || 'Ver Evidencia'}
                                </a>
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        // Reset the file input
                                        const fileInput = document.getElementById(`file-legacy-${rule.id}`);
                                        if (fileInput) {
                                            fileInput.value = '';
                                        }
                                        onAnswerChange(rule.id, { evidence: '' });
                                    }} 
                                    className="text-red-600 hover:text-red-800"
                                    title="Eliminar evidencia"
                                    style={{ flexShrink: 0 }}
                                >
                                    <i data-feather="x-circle" style={{ width: '16px', height: '16px' }}></i>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default EvaluationCard;