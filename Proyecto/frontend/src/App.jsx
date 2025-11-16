import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar'; 
import Dashboard from './components/Dashboard';
import EvaluationCard from './components/EvaluationCard'; 
import GoToTop from './components/gototop';


function App() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastAnswerTime, setLastAnswerTime] = useState(null);

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
    fetchEvaluation();
  }, []);

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
        if (value) {
          formData.append(key, value);
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
    } catch (err) {
      setError('Error al guardar. Inténtalo de nuevo.');
      console.error(err);
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
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </main>
      <GoToTop />
    </div>
  );
}

export default App;