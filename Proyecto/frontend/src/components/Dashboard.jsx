import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard({ lastAnswerTime }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = () => {
        setLoading(true);
        axios.get('/api/dashboard-stats/')
            .then(res => {
                setStats(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error cargando stats:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (lastAnswerTime) {
            fetchStats();
        }
    }, [lastAnswerTime]);

    if (loading) return <p>Cargando dashboard...</p>;
    if (!stats) return <p>No se pudieron cargar los datos del dashboard.</p>;

    // Determinar el color de la barra
    const percentage = stats.percentage || 0;
    let barColor = '#3b82f6'; // Azul por defecto
    if (percentage < 40) barColor = '#dc2626'; // --danger
    else if (percentage < 70) barColor = '#f59e0b'; // --warning
    else barColor = '#10b981'; // --success

    return (
        <div className="dashboard-card" style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', padding: '1.5rem', marginBottom: '2rem' }}>
            <h2 className="dashboard-title" style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>Dashboard de Cumplimiento</h2>
            <div className="progress-info" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="progress-percentage" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af' }}>{percentage}%</span>
                <span className="progress-count" style={{ color: '#6b7280' }}>
                    {stats.compliant} de {stats.total} reglas cumplidas
                </span>
            </div>
            <div className="progress-container" style={{ marginTop: '1rem' }}>
                <div className="progress-bar"> {/* 'progress-bar' ya está en style.css */}
                    <div 
                        className="progress-fill" 
                        style={{ 
                            width: `${percentage}%`,
                            backgroundColor: barColor 
                        }}
                    >
                        {percentage}%
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;