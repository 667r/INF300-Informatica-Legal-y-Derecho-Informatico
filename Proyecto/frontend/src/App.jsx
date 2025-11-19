import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar'; 
import Dashboard from './components/Dashboard';
import EvaluationCard from './components/EvaluationCard'; 
import GoToTop from './components/gototop';
import Footer from './components/Footer';
import { exportToPDF } from './utils/pdfExport';


function App() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastAnswerTime, setLastAnswerTime] = useState(null);
  const [stats, setStats] = useState(null);

  // logica de carga
  useEffect(() => {
    const fetchEvaluation = async () => {
      try {
        const response = await axios.get('/api/evaluation/');
        setDomains(response.data);
      } catch (err) {
        setError('Error al cargar la evaluación. ¿Iniciaste sesión en /admin?');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/dashboard-stats/');
        setStats(response.data);
      } catch (err) {
        console.error("Error cargando stats:", err);
      }
    };

    fetchEvaluation();
    fetchStats();
  }, []);

  // Poll for email status updates when there are pending verifications
  useEffect(() => {
    const hasPendingEmails = domains.some(domain =>
      domain.rules.some(rule =>
        rule.user_answer?.email_status === 'pending'
      )
    );

    if (!hasPendingEmails) return;

    const interval = setInterval(async () => {
      try {
        let statusChanged = false;
        
        // Check status for all pending emails
        for (const domain of domains) {
          for (const rule of domain.rules) {
            const answer = rule.user_answer;
            if (answer && answer.email_status === 'pending' && answer.id) {
              try {
                // Call check-email-status endpoint
                const response = await axios.post('/api/check-email-status/', {
                  answer_id: answer.id
                });
                
                // Si el estado cambió, marcar para refrescar
                if (response.data && response.data.email_status !== 'pending') {
                  statusChanged = true;
                }
              } catch (err) {
                console.error("Error verificando estado de email:", err);
              }
            }
          }
        }
        
        // Refresh evaluation data si hubo cambios
        if (statusChanged) {
          const response = await axios.get('/api/evaluation/');
          setDomains(response.data);
        }
      } catch (err) {
        console.error("Error actualizando estado de emails:", err);
      }
    }, 10000); // Check every 10 seconds (reduced frequency)

    return () => clearInterval(interval);
  }, [domains]);

  // logica de guardado
  const handleAnswerChange = async (ruleId, changes) => {
    let currentAnswer = null;
    for (const domain of domains) {
      const rule = domain.rules.find(r => r.id === ruleId);
      if (rule) {
        currentAnswer = rule.user_answer;
        break;
      }
    }

    try {
      let response;
      const formData = new FormData();
      formData.append('rule_id', ruleId); 
      
      for (const [key, value] of Object.entries(changes)) {
        // CORRECCIÓN: Permitimos enviar 'null' (para borrar archivos)
        // o valores vacíos (para borrar notas)
        if (value !== undefined) { 
          // Si es un archivo, asegurarse de que se añade correctamente
          if (value instanceof File) {
            formData.append(key, value, value.name);
          } else {
            formData.append(key, value);
          }
        }
      }

      // Debug: mostrar qué se está enviando
      console.log('Enviando cambios para regla', ruleId, ':', Object.keys(changes));
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(key, ':', value.name, '(archivo)');
        } else {
          console.log(key, ':', value);
        }
      }

      if (currentAnswer) {
        response = await axios.patch(`/api/answers/${currentAnswer.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await axios.post('/api/answers/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      console.log('Respuesta recibida:', response.data);
      const updatedAnswer = response.data;
      setDomains(prevDomains => 
        prevDomains.map(domain => ({
          ...domain,
          rules: domain.rules.map(rule => 
            rule.id === ruleId 
            ? { ...rule, user_answer: updatedAnswer } 
            : rule
          )
        }))
      );
      setLastAnswerTime(new Date());
      
      // Update stats after saving
      try {
        const statsResponse = await axios.get('/api/dashboard-stats/');
        setStats(statsResponse.data);
      } catch (err) {
        console.error("Error actualizando stats:", err);
      }
      
      // Return the response so handleFileUpload can use it
      return response;
    } catch (err) {
      setError('Error al guardar. Inténtalo de nuevo.');
      console.error('Error completo:', err);
      if (err.response) {
        console.error('Respuesta del servidor:', err.response.data);
      }
    }
  };

  // Función para exportar a PDF
  const handleExportPDF = async () => {
    try {
      // Fetch latest stats if needed
      const statsResponse = await axios.get('/api/dashboard-stats/');
      const currentStats = statsResponse.data;
      
      // Export PDF
      exportToPDF(domains, currentStats);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      setError('Error al exportar PDF. Inténtalo de nuevo.');
    }
  };

  // Función para verificar email
  const handleVerifyEmail = async (answerId) => {
    console.log('handleVerifyEmail llamado con answerId:', answerId);
    try {
      console.log('Enviando POST a /api/verify-email/ con answer_id:', answerId);
      const response = await axios.post('/api/verify-email/', {
        answer_id: answerId
      });
      
      console.log('Respuesta del servidor:', response.data);
      
      // Refresh the evaluation data to get updated email_status
      const evalResponse = await axios.get('/api/evaluation/');
      setDomains(evalResponse.data);
      
      console.log('Email verification iniciada:', response.data);
    } catch (err) {
      console.error('Error al verificar email:', err);
      if (err.response) {
        console.error('Respuesta del servidor:', err.response.data);
        console.error('Status code:', err.response.status);
      }
      setError('Error al verificar email. Inténtalo de nuevo.');
    }
  };

  // Función para verificar archivo
  const handleVerifyFile = async (answerId, fileType) => {
    console.log('handleVerifyFile llamado con answerId:', answerId, 'fileType:', fileType);
    try {
      const response = await axios.post('/api/verify-file/', {
        answer_id: answerId,
        file_type: fileType
      });
      
      console.log('Respuesta verificación archivo:', response.data);
      
      // Refresh the evaluation data to get updated file verification status
      const evalResponse = await axios.get('/api/evaluation/');
      setDomains(evalResponse.data);
      
      return response.data;
    } catch (err) {
      console.error('Error al verificar archivo:', err);
      if (err.response) {
        console.error('Respuesta del servidor:', err.response.data);
      }
      setError('Error al verificar archivo. Inténtalo de nuevo.');
      throw err; // Re-throw para que el componente pueda manejar el error
    }
  };

  // rendering
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <Navbar /> {/* <-- Nuevo Navbar */}

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Autoevaluación de Cumplimiento</h1>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <Dashboard lastAnswerTime={lastAnswerTime} /> {/* <-- Nuevo Dashboard */}

          <div id="evaluation-container" className="space-y-8">
            {loading ? (
              <p>Cargando reglas...</p>
            ) : (
              domains.map(domain => (
                <section key={domain.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">{domain.name}</h2>
                    <p className="text-gray-600 mt-1">{domain.description}</p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {domain.rules.map(rule => (
                      <EvaluationCard 
                        key={rule.id}
                        rule={rule} 
                        onAnswerChange={handleAnswerChange}
                        onVerifyEmail={handleVerifyEmail}
                        onVerifyFile={handleVerifyFile}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          {/* Export PDF Button */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginTop: '3rem', 
            marginBottom: '2rem' 
          }}>
            <button
              onClick={handleExportPDF}
              disabled={loading || !domains.length}
              style={{
                backgroundColor: '#1e40af',
                color: 'white',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: loading || !domains.length ? 'not-allowed' : 'pointer',
                opacity: loading || !domains.length ? 0.6 : 1,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading && domains.length) {
                  e.target.style.backgroundColor = '#1e3a8a';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && domains.length) {
                  e.target.style.backgroundColor = '#1e40af';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              Exportar a PDF
            </button>
          </div>
        </div>
      </main>
      <Footer />
      <GoToTop />
    </div>
  );
}

export default App;