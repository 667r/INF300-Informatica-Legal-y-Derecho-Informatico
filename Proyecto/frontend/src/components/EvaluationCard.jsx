import React, { useEffect, useState } from 'react';

function EvaluationCard({ rule, onAnswerChange, onVerifyEmail, onVerifyFile }) {
    // Estado para rastrear qué archivos se están verificando
    const [verifyingFiles, setVerifyingFiles] = useState({});
    
    const answer = rule.user_answer || { 
        status: 'NOT_EVALUATED', 
        notes: '', 
        evidence: null,
        name: '',
        email: '',
        phone: '',
        email_status: null,
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

    // Función para calcular el estado automáticamente basado en los campos requeridos
    const calculateAutoStatus = () => {
        // Regla 1: Campos de texto (name, email, phone)
        const requiresName = rule.requires_name === 1;
        const requiresEmail = rule.requires_mail === 1;
        const requiresPhone = rule.requires_phone === 1;
        
        // Verificar campos de texto
        const hasName = requiresName && answer.name && answer.name.trim().length > 0;
        const hasEmail = requiresEmail && answer.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer.email);
        const emailStatus = answer.email_status;
        const hasPhone = requiresPhone && answer.phone && answer.phone.replace(/\D/g, '').length === 9;
        
        // Verificar archivos requeridos
        const requiredFiles = rule.required_files || {};
        const requiredFileTypes = Object.keys(requiredFiles);
        
        // Contar archivos subidos y verificar sus estados
        let filesWithVerification = []; // Archivos con número > 0
        let filesWithoutVerification = []; // Archivos con número = 0
        
        requiredFileTypes.forEach(fileType => {
            const verificationMonths = requiredFiles[fileType] || 0;
            const file = getFileByType(fileType);
            
            if (verificationMonths > 0) {
                // Archivo que requiere verificación de fecha
                filesWithVerification.push({ fileType, file, verificationMonths });
            } else {
                // Archivo que solo requiere estar subido
                filesWithoutVerification.push({ fileType, file });
            }
        });
        
        // Lógica de evaluación
        
        // Si requiere campos de texto
        if (requiresName || requiresEmail || requiresPhone) {
            // Caso: name + email
            if (requiresName && requiresEmail && !requiresPhone) {
                if (hasName && emailStatus === 'valid') {
                    return 'COMPLIANT';
                }
                if ((emailStatus === 'pending' && hasName) || (emailStatus === 'bounced' && hasName)) {
                    return 'PARTIAL';
                }
                if ((emailStatus === 'pending' && !hasName) || (emailStatus === 'bounced' && !hasName)) {
                    return 'NON_COMPLIANT';
                }
                return 'NOT_EVALUATED';
            }
            
            // Caso: solo phone
            if (!requiresName && !requiresEmail && requiresPhone) {
                if (hasPhone) {
                    return 'COMPLIANT';
                }
                if (answer.phone && answer.phone.trim().length > 0) {
                    return 'NON_COMPLIANT';
                }
                return 'NOT_EVALUATED';
            }
        }
        
        // Si requiere archivos con verificación (número > 0)
        if (filesWithVerification.length > 0) {
            // Solo evaluamos el primer archivo con verificación (asumiendo que hay uno)
            const { file } = filesWithVerification[0];
            
            if (!file || !file.file_verification_status || file.file_verification_status === 'pending') {
                return 'NOT_EVALUATED';
            }
            
            if (file.file_verification_status === 'up_to_date') {
                return 'COMPLIANT';
            }
            
            if (file.file_verification_status === 'outdated') {
                return 'PARTIAL';
            }
            
            if (file.file_verification_status === 'very_outdated' || file.file_verification_status === 'error') {
                return 'NON_COMPLIANT';
            }
        }
        
        // Si requiere archivos sin verificación (número = 0)
        if (filesWithoutVerification.length > 0) {
            const uploadedFiles = filesWithoutVerification.filter(({ file }) => file != null);
            
            if (uploadedFiles.length === filesWithoutVerification.length) {
                return 'COMPLIANT';
            }
            
            if (uploadedFiles.length > 0) {
                return 'PARTIAL';
            }
            
            return 'NOT_EVALUATED';
        }
        
        // Si no hay campos requeridos, mantener el estado actual o NOT_EVALUATED
        return answer.status || 'NOT_EVALUATED';
    };

    // --- Handlers (manejadores de eventos) ---
    const handleStatusChange = (e) => {
        // El dropdown está deshabilitado, pero por si acaso
        // onAnswerChange(rule.id, { status: e.target.value });
    };

    const handleFileUpload = async (fileType, e) => {
        const file = e.target.files[0];
        if (file) {
            // Upload the file first
            const result = await onAnswerChange(rule.id, { [`file_${fileType}`]: file });
            
            // Actualizar estado automáticamente después de subir archivo
            if (result && result.data) {
                const newStatus = calculateAutoStatus();
                if (newStatus !== answer.status) {
                    await onAnswerChange(rule.id, { status: newStatus });
                }
            }
            
            // Check if this file type requires verification (number > 0)
            const verificationMonths = requiredFiles[fileType] || 0;
            if (verificationMonths > 0) {
                // Get the updated answer ID from the response
                let answerId = answer.id;
                if (result && result.data && result.data.id) {
                    answerId = result.data.id;
                }
                
                if (answerId && onVerifyFile) {
                    // Set verifying state
                    setVerifyingFiles(prev => ({ ...prev, [fileType]: true }));
                    
                    // Wait a bit for the file to be saved, then verify
                    setTimeout(async () => {
                        try {
                            await onVerifyFile(answerId, fileType);
                            // Actualizar estado después de verificar
                            const updatedResult = await onAnswerChange(rule.id, {});
                            if (updatedResult && updatedResult.data) {
                                const newStatus = calculateAutoStatus();
                                if (newStatus !== answer.status) {
                                    await onAnswerChange(rule.id, { status: newStatus });
                                }
                            }
                        } catch (err) {
                            console.error('Error verificando archivo:', err);
                        } finally {
                            // Remove verifying state
                            setVerifyingFiles(prev => {
                                const newState = { ...prev };
                                delete newState[fileType];
                                return newState;
                            });
                        }
                    }, 2000); // Wait 2 seconds for file to be saved and processed
                }
            }
        } else {
            // If no file selected, reset the input
            e.target.value = '';
        }
    };

    const handleFileRemove = async (fileType, e) => {
        e.preventDefault();
        // Reset the file input so the user can upload the same file again
        const fileInput = document.getElementById(`file-${rule.id}-${fileType}`);
        if (fileInput) {
            fileInput.value = '';
        }
        const response = await onAnswerChange(rule.id, { [`file_${fileType}`]: '' });
        
        // Actualizar estado automáticamente después de eliminar archivo
        if (response && response.data) {
            const newStatus = calculateAutoStatus();
            if (newStatus !== answer.status) {
                await onAnswerChange(rule.id, { status: newStatus });
            }
        }
    };

    const handleTextFieldChange = (fieldName, e) => {
        onAnswerChange(rule.id, { [fieldName]: e.target.value });
    };

    const handleTextFieldBlur = async (fieldName, e) => {
        let value = e.target.value.trim();
        // Para teléfono, guardar solo los dígitos (sin +56, ya que se muestra fijo)
        if (fieldName === 'phone') {
            value = value.replace(/\D/g, ''); // Solo números
        }
        const response = await onAnswerChange(rule.id, { [fieldName]: value });
        
        // Actualizar estado automáticamente después de guardar
        if (response && response.data) {
            const newStatus = calculateAutoStatus();
            if (newStatus !== answer.status) {
                await onAnswerChange(rule.id, { status: newStatus });
            }
        }
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

    // Efecto para actualizar el estado automáticamente cuando cambian los campos
    useEffect(() => {
        // Solo calcular y actualizar si hay un answer.id (ya existe en la BD)
        if (!answer.id) {
            return;
        }
        
        const newStatus = calculateAutoStatus();
        
        // Solo actualizar si el estado calculado es diferente al actual
        // Usamos un pequeño delay para evitar múltiples actualizaciones rápidas
        if (newStatus !== answer.status) {
            const timeoutId = setTimeout(() => {
                onAnswerChange(rule.id, { status: newStatus });
            }, 300);
            
            return () => clearTimeout(timeoutId);
        }
    }, [
        answer.name,
        answer.email,
        answer.email_status,
        answer.phone,
        answer.files,
        answer.id,
        answer.status, // Necesario para comparar
        rule.requires_name,
        rule.requires_mail,
        rule.requires_phone,
        rule.required_files,
        rule.id
    ]);
    
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
                {/* Selector de Estado (Deshabilitado - se calcula automáticamente) */}
                <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 150px' }}>
                    <label className="control-label" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Estado</label>
                    <select 
                        value={answer.status} 
                        onChange={handleStatusChange} 
                        disabled
                        className="border border-gray-300 rounded-md p-2 text-sm"
                        style={{ 
                            backgroundColor: '#f3f4f6',
                            cursor: 'not-allowed',
                            opacity: 0.7
                        }}
                        title="El estado se calcula automáticamente según los campos requeridos"
                    >
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
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <input 
                                            type="email"
                                            placeholder="correo@ejemplo.com"
                                            defaultValue={answer.email || ''}
                                            onBlur={(e) => {
                                                const emailValue = e.target.value.trim();
                                                handleTextFieldBlur('email', e);
                                            }}
                                            onChange={(e) => {
                                                // Validate email format in real-time
                                                const emailValue = e.target.value;
                                                const emailInput = e.target;
                                                
                                                // Basic email validation regex
                                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                                const isValid = emailValue === '' || emailRegex.test(emailValue);
                                                
                                                // Update border color based on validity
                                                if (emailValue && !isValid) {
                                                    emailInput.style.borderColor = '#ef4444';
                                                } else {
                                                    emailInput.style.borderColor = '#d1d5db';
                                                }
                                                
                                                // Show/hide error message
                                                let errorMsg = emailInput.parentElement.querySelector('.email-error');
                                                if (!errorMsg && emailValue && !isValid) {
                                                    errorMsg = document.createElement('div');
                                                    errorMsg.className = 'email-error';
                                                    errorMsg.style.cssText = 'color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;';
                                                    errorMsg.textContent = 'Por favor introduce un correo válido';
                                                    emailInput.parentElement.appendChild(errorMsg);
                                                } else if (errorMsg && (isValid || !emailValue)) {
                                                    errorMsg.remove();
                                                }
                                            }}
                                            className="border border-gray-300 rounded-md p-2 text-sm"
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                    {(() => {
                                        console.log('DEBUG Email field - answer.id:', answer.id, 'answer.email:', answer.email, 'answer.email_status:', answer.email_status);
                                        return null;
                                    })()}
                                    {answer.id && answer.email && (() => {
                                        // Validate email format before showing button
                                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                        const isValidFormat = emailRegex.test(answer.email);
                                        
                                        if (!isValidFormat) return null;
                                        
                                        return (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    console.log('Botón Verificar clickeado. answer.id:', answer.id, 'answer.email:', answer.email);
                                                    if (onVerifyEmail) {
                                                        onVerifyEmail(answer.id);
                                                    } else {
                                                        console.error('onVerifyEmail no está definido');
                                                    }
                                                }}
                                                disabled={answer.email_status === 'pending'}
                                                style={{
                                                    backgroundColor: answer.email_status === 'pending' ? '#9ca3af' : '#1e40af',
                                                    color: 'white',
                                                    padding: '0.5rem 1rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500',
                                                    border: 'none',
                                                    borderRadius: '0.375rem',
                                                    cursor: answer.email_status === 'pending' ? 'not-allowed' : 'pointer',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {answer.email_status === 'pending' ? 'Verificando...' : 'Verificar'}
                                            </button>
                                        );
                                    })()}
                                </div>
                                {answer.email && (() => {
                                    // Validate email format
                                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                    const isValidFormat = emailRegex.test(answer.email);
                                    
                                    if (!isValidFormat) {
                                        return (
                                            <div style={{ 
                                                fontSize: '0.75rem', 
                                                marginTop: '0.25rem',
                                                color: '#ef4444'
                                            }}>
                                                Por favor introduce un correo válido
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                                {answer.email_status && (() => {
                                    // Validate email format before showing status
                                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                    const isValidFormat = emailRegex.test(answer.email);
                                    
                                    if (!isValidFormat) return null;
                                    
                                    return (
                                        <div style={{ 
                                            fontSize: '0.875rem', 
                                            marginTop: '0.25rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            {answer.email_status === 'pending' && (
                                                <span style={{ color: '#f59e0b' }}>
                                                    Verificando email…
                                                </span>
                                            )}
                                            {answer.email_status === 'valid' && (
                                                <span style={{ color: '#10b981' }}>
                                                    Email verificado ✅
                                                </span>
                                            )}
                                            {answer.email_status === 'bounced' && (
                                                <span style={{ color: '#ef4444' }}>
                                                    Email inválido / rebotado ❌
                                                </span>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                        {rule.requires_phone === 1 && (
                            <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 200px' }}>
                                <label className="control-label" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Teléfono *</label>
                                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                    <span style={{ 
                                        fontSize: '0.875rem', 
                                        color: '#374151', 
                                        fontWeight: '500',
                                        padding: '0.5rem',
                                        backgroundColor: '#f3f4f6',
                                        borderRadius: '0.375rem 0 0 0.375rem',
                                        border: '1px solid #d1d5db',
                                        borderRight: 'none',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        +56
                                    </span>
                                    <input 
                                        type="tel"
                                        placeholder="912345678"
                                        defaultValue={answer.phone ? answer.phone.replace(/\D/g, '') : ''}
                                        onBlur={(e) => {
                                            const phoneValue = e.target.value.replace(/\D/g, '');
                                            e.target.value = phoneValue; // Asegurar que solo tenga números
                                            handleTextFieldBlur('phone', e);
                                        }}
                                        onChange={(e) => {
                                            // Solo permitir números y limitar a 9 dígitos
                                            const phoneValue = e.target.value.replace(/\D/g, '').slice(0, 9);
                                            e.target.value = phoneValue;
                                            
                                            // Actualizar el borde basado en la validación
                                            const isValid = phoneValue.length === 9;
                                            if (phoneValue && !isValid) {
                                                e.target.style.borderColor = '#ef4444';
                                                // También actualizar el borde del +56
                                                const prefixSpan = e.target.previousElementSibling;
                                                if (prefixSpan) {
                                                    prefixSpan.style.borderColor = '#ef4444';
                                                }
                                            } else {
                                                e.target.style.borderColor = '#d1d5db';
                                                // Restaurar el borde del +56
                                                const prefixSpan = e.target.previousElementSibling;
                                                if (prefixSpan) {
                                                    prefixSpan.style.borderColor = '#d1d5db';
                                                }
                                            }
                                        }}
                                        className="border border-gray-300 rounded-md p-2 text-sm"
                                        style={{ 
                                            flex: 1,
                                            borderRadius: '0 0.375rem 0.375rem 0',
                                            borderLeft: 'none'
                                        }}
                                    />
                                </div>
                                {answer.phone && (() => {
                                    // Validar formato de teléfono (9 dígitos)
                                    const phoneDigits = answer.phone.replace(/\D/g, '');
                                    const isValidFormat = phoneDigits.length === 9;
                                    
                                    if (!isValidFormat) {
                                        return (
                                            <div style={{ 
                                                fontSize: '0.75rem', 
                                                marginTop: '0.25rem',
                                                color: '#ef4444'
                                            }}>
                                                Por favor introduce un número válido (9 dígitos)
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
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
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                <div className="evidence-badge flex items-center justify-between" style={{ display: 'inline-flex', padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.375rem', width: '100%' }}>
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
                                                {/* Mostrar indicador de carga o estado de verificación si el archivo requiere verificación */}
                                                {requiredFiles[fileType] > 0 && (
                                                    <div>
                                                        {verifyingFiles[fileType] ? (
                                                            <div style={{ 
                                                                fontSize: '0.875rem',
                                                                padding: '0.5rem',
                                                                borderRadius: '0.375rem',
                                                                backgroundColor: '#eff6ff',
                                                                color: '#1e40af',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem'
                                                            }}>
                                                                <div style={{
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    border: '2px solid #1e40af',
                                                                    borderTop: '2px solid transparent',
                                                                    borderRadius: '50%',
                                                                    animation: 'spin 1s linear infinite'
                                                                }}></div>
                                                                Verificando archivo...
                                                            </div>
                                                        ) : file.file_verification_status && (
                                                            <div style={{ 
                                                                fontSize: '0.875rem',
                                                                padding: '0.5rem',
                                                                borderRadius: '0.375rem',
                                                                backgroundColor: 
                                                                    file.file_verification_status === 'up_to_date' ? '#d1fae5' :
                                                                    file.file_verification_status === 'outdated' ? '#fef3c7' :
                                                                    file.file_verification_status === 'very_outdated' ? '#fee2e2' :
                                                                    '#f3f4f6',
                                                                color: 
                                                                    file.file_verification_status === 'up_to_date' ? '#065f46' :
                                                                    file.file_verification_status === 'outdated' ? '#92400e' :
                                                                    file.file_verification_status === 'very_outdated' ? '#991b1b' :
                                                                    '#374151'
                                                            }}>
                                                                {file.file_verification_status === 'up_to_date' && '✅ Registros al día'}
                                                                {file.file_verification_status === 'outdated' && '⚠️ Registros con >6 meses de antigüedad'}
                                                                {file.file_verification_status === 'very_outdated' && '❌ Registros no están al día'}
                                                                {file.file_verification_status === 'error' && '❌ Error: ' + (file.file_verification_message || 'Error al verificar')}
                                                                {file.file_verification_message && file.file_verification_status !== 'error' && (
                                                                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>
                                                                        {file.file_verification_message}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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