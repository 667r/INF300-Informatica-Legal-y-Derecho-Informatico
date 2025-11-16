import React from 'react';

function EvaluationCard({ rule, onAnswerChange }) {
    
    const answer = rule.user_answer || { status: 'NOT_EVALUATED', notes: '', evidence: null };
    
    // Mapea tu estado a las clases CSS
    const statusMap = {
        'COMPLIANT': 'compliant',
        'NON_COMPLIANT': 'non-compliant',
        'PARTIAL': 'partial',
        'NOT_EVALUATED': 'not-evaluated'
    };
    const statusClass = statusMap[answer.status] || 'not-evaluated';
    const statusText = answer.status.replace('_', ' ').toLowerCase();

    // --- Handlers (manejadores de eventos) ---
    const handleStatusChange = (e) => {
        onAnswerChange(rule.id, { status: e.target.value });
    };

    const handleEvidenceUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            onAnswerChange(rule.id, { evidence: file });
            // Lógica simple para mostrar el nombre del archivo (opcional)
            e.target.nextElementSibling.textContent = file.name;
            e.target.nextElementSibling.style.display = 'inline-flex';
        }
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

            {/* Controles (Selector, Notas, Evidencia) */}
            <div className="controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1rem' }}>
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
                        onBlur={handleNotesBlur} // Guardar cuando el usuario saca el foco
                        className="border border-gray-300 rounded-md p-2 text-sm"
                    ></textarea>
                </div>

                {/* Evidencia */}
                <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 200px' }}>
                    <label className="control-label" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Evidencia</label>
                    <input type="file" id={`file-${rule.id}`} onChange={handleEvidenceUpload} style={{ display: 'none' }} />
                    <label htmlFor={`file-${rule.id}`} className="cursor-pointer bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm font-medium text-center">
                        Adjuntar Archivo
                    </label>
                    <span className="evidence-badge" style={{ display: answer.evidence ? 'inline-flex' : 'none' }}>
                        {answer.evidence ? <a href={answer.evidence} target="_blank" rel="noopener noreferrer">Ver Evidencia</a> : ''}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default EvaluationCard;