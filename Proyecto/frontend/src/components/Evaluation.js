import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Necesitarás 'npm install axios'

// Asumimos que tienes un 'api' helper que maneja la autenticación (Tokens)
import api from '../api'; 

function Evaluation() {
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Cargar todas las reglas y respuestas al iniciar
        api.get('/api/evaluation/')
            .then(res => {
                setDomains(res.data);
                setLoading(false);
            })
            .catch(err => console.error("Error cargando la evaluación:", err));
    }, []);

    // 2. Función para guardar una respuesta
    const handleAnswerChange = (ruleId, newStatus) => {
        // Aquí manejas el guardado de estado (Compliance, Non-compliant, etc.)
        // Esto es una simplificación. Necesitarás un endpoint 
        // para "crear o actualizar" una respuesta.
        console.log(`Guardando Regla ${ruleId} con estado ${newStatus}`);
        
        // Aquí iría el api.post(`/api/answers/${ruleId}/`, { status: newStatus })
        // para actualizar la respuesta.
    };

    // 3. Función para subir evidencia [cite: 27]
    const handleEvidenceUpload = (answerId, file) => {
        const formData = new FormData();
        formData.append('evidence', file);

        // Hacemos un PATCH al endpoint de la respuesta para subir el archivo
        api.patch(`/api/answers/${answerId}/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        .then(res => {
            console.log("Evidencia subida!", res.data);
            // Aquí deberías actualizar el estado local para mostrar el archivo
        })
        .catch(err => console.error("Error subiendo evidencia:", err));
    };

    if (loading) return <p>Cargando...</p>;

    return (
        <div>
            <h1>Autoevaluación de Cumplimiento</h1>
            {domains.map(domain => (
                <div key={domain.id}>
                    <h2>{domain.name}</h2>
                    {domain.rules.map(rule => (
                        <div key={rule.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
                            <p><strong>Regla:</strong> {rule.text}</p>
                            
                            {/* Selector de Cumplimiento */}
                            <select 
                                value={rule.user_answer ? rule.user_answer.status : 'NOT_EVALUATED'}
                                onChange={(e) => handleAnswerChange(rule.id, e.target.value)}
                            >
                                <option value="NOT_EVALUATED">No Evaluado</option>
                                <option value="COMPLIANT">Cumple</option>
                                <option value="NON_COMPLIANT">No Cumple</option>
                                <option value="PARTIAL">Parcialmente</option>
                            </select>

                            {/* Input para subir Evidencia */}
                            <input 
                                type="file" 
                                onChange={(e) => handleEvidenceUpload(rule.user_answer.id, e.target.files[0])}
                                disabled={!rule.user_answer} // Solo se activa si ya existe una respuesta
                            />

                            {/* Mostrar acción sugerida si no cumple (Func 3) */}
                            {rule.user_answer && rule.user_answer.status === 'NON_COMPLIANT' && (
                                <p style={{color: 'red'}}>
                                    <strong>Acción Sugerida:</strong> {rule.suggested_action}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export default Evaluation;