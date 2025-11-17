import React from 'react';

function Footer() {
  return (
    <footer style={{ 
      backgroundColor: '#1e40af', 
      color: 'white', 
      padding: '3rem 2rem 1.5rem 2rem',
      marginTop: 'auto'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '3rem',
        marginBottom: '2rem'
      }}>
        {/* Left Column - Logo */}
        <div>
          <div style={{
            border: '2px solid white',
            padding: '1.5rem',
            display: 'inline-block',
            backgroundColor: 'white',
            borderRadius: '4px'
          }}>
            <div style={{ 
              textAlign: 'center',
              color: '#1e40af',
              fontSize: '0.75rem',
              fontWeight: '600',
              lineHeight: '1.4'
            }}>
              <div style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>🛡️</div>
              <div>Agencia Nacional de</div>
              <div>Ciberseguridad</div>
              <div style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>Gobierno de Chile</div>
            </div>
          </div>
        </div>

        {/* Middle Column - CONTACTO */}
        <div>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: '700', 
            marginBottom: '1rem',
            textTransform: 'uppercase'
          }}>
            CONTACTO
          </h3>
          <div style={{ marginBottom: '1.5rem', lineHeight: '1.8' }}>
            <div>1510</div>
            <div>ayuda@anci.gob.cl</div>
            <div>Santiago, Chile</div>
          </div>

          <div style={{ lineHeight: '1.8' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>LEY DEL LOBBY</div>
              <div style={{ fontSize: '0.9rem', marginLeft: '0.5rem' }}>Plataforma Ley del Lobby</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>LEY DE TRANSPARENCIA</div>
              <div style={{ fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                <div>Solicitud de Información</div>
                <div>Transparencia Activa</div>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>LEY DE PRESUPUESTOS</div>
            </div>
          </div>
        </div>

        {/* Right Column - SECCIONES */}
        <div>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: '700', 
            marginBottom: '1rem',
            textTransform: 'uppercase'
          }}>
            SECCIONES
          </h3>
          <div style={{ lineHeight: '1.8' }}>
            <div>Quiénes somos</div>
            <div>Noticias</div>
            <div>Eventos</div>
            <div>Política Nacional de Ciberseguridad</div>
            <div>Normativa</div>
            <div>Comité Interministerial</div>
            <div>Ciberconsejos</div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div style={{ 
        borderTop: '1px solid rgba(255, 255, 255, 0.3)',
        paddingTop: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '2rem',
          flexWrap: 'wrap',
          fontSize: '0.9rem'
        }}>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Política de Privacidad</a>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>API Pública Ciberseguridad</a>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Estado de nuestros servicios</a>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '1rem',
          alignItems: 'center'
        }}>
          <a href="#" style={{ color: 'white', fontSize: '1.2rem' }}>𝕏</a>
          <a href="#" style={{ color: 'white', fontSize: '1.2rem' }}>f</a>
          <a href="#" style={{ color: 'white', fontSize: '1.2rem' }}>in</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

