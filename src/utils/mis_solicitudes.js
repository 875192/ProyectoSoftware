document.addEventListener('DOMContentLoaded', () => {
    
    // 1. ANIMACIÓN DE CARGA
    const overlay = document.getElementById('pageTransitionOverlay');
    if (overlay) {
        setTimeout(() => {
            overlay.style.opacity = '0'; 
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500); 
        }, 1000); // Un segundo para que se vea bien el diseño
    }

    // 2. FILTROS POR TARJETAS (Libre de errores de texto)
    const filterButtons = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.request-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            
            // Cambiar estilos de botones
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Leer qué filtro queremos aplicar
            const filterValue = button.getAttribute('data-filter');

            // Filtrar las tarjetas
            cards.forEach(card => {
                const cardStatus = card.getAttribute('data-status');

                // Si pulsamos "todas" o el estado de la tarjeta coincide con el botón
                if (filterValue === 'todas' || filterValue === cardStatus) {
                    card.style.display = 'flex'; // Usamos flex porque la tarjeta tiene flex-direction
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
});