import React, { useEffect } from 'react';

// Importa 'feather-icons' si lo instalas con npm, 
// pero si usamos el CDN, necesitamos llamarlo desde el objeto 'window'.
// Usaremos un useEffect para asegurarnos de que se ejecute.

function Navbar() {
  
  // Llama a feather.replace() después de que el componente se monte
  useEffect(() => {
    if (window.feather) {
      window.feather.replace();
    }
  }, []); // El array vacío asegura que se ejecute solo una vez

  return (
    <nav className="navbar" style={{ backgroundColor: '#1e40af', color: 'white', padding: '1rem 2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <div className="navbar-container" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" className="logo" style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'white' }}>
          <i data-feather="shield"></i>
          <span>CoreCompliance</span>
        </a>
        <div className="nav-links" style={{ display: 'flex', gap: '1.5rem' }}>
          {/* Los enlaces por ahora son de ejemplo */}
          <a href="/" className="nav-link" style={{ color: 'white', textDecoration: 'none', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <i data-feather="home"></i>
            Inicio
          </a>
        </div>
        <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Reemplaza 'DV' con las iniciales de tu usuario de Django */}
          <span className="user-avatar" style={{ width: '55px', height: '55px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600' }}>
            CSIRT
          </span>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;