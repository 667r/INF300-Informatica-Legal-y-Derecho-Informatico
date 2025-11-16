// frontend/src/components/GoToTop.jsx

import React, { useState, useEffect } from 'react';

function GoToTop() {
    const [isVisible, setIsVisible] = useState(false);

    // 1. Función para detectar el scroll
    const toggleVisibility = () => {
        // Muestra el botón si el usuario ha bajado más de 300px
        if (window.scrollY > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    // 2. Función para hacer scroll hacia arriba
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth' // Para un scroll suave
        });
    };

    // 3. Añade y limpia el 'event listener' del scroll
    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);

        // Limpia el listener cuando el componente se desmonta
        return () => {
            window.removeEventListener('scroll', toggleVisibility);
        };
    }, []);

    // 4. Llama a feather.replace() cuando el botón aparece
    useEffect(() => {
        if (isVisible && window.feather) {
            window.feather.replace();
        }
    }, [isVisible]);

    return (
        <div className="fixed bottom-8 right-8 z-50">
            {isVisible && (
                <button
                    onClick={scrollToTop}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-opacity duration-300"
                    aria-label="Volver arriba"
                >
                    <i data-feather="arrow-up" style={{ width: '24px', height: '24px' }}></i>
                </button>
            )}
        </div>
    );
}

export default GoToTop;