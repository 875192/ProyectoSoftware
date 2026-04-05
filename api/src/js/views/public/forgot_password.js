const API_BASE = 'http://localhost:3000';

const form = document.getElementById('forgotForm');
const formState = document.getElementById('formState');
const successMsg = document.getElementById('successMsg');
const errorMsg = document.getElementById('errorMsg');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';

    const email = document.getElementById('email').value.trim();
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 0.8s linear infinite;">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span>Enviando...</span>
    `;

    console.log('[UniGear] Enviando petición a:', `${API_BASE}/auth/forgot-password`);
    console.log('[UniGear] Email:', email);

    try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        console.log('[UniGear] Respuesta status:', res.status);

        const data = await res.json();
        console.log('[UniGear] Respuesta body:', data);

        if (!res.ok) {
            throw new Error(data.message || 'Error al enviar el correo');
        }

        // Éxito: ocultar todo el formState y mostrar successMsg
        formState.style.display = 'none';
        successMsg.classList.add('visible');
        lucide.createIcons();

    } catch (err) {
        console.error('[UniGear] Error:', err);

        // Mostrar error
        errorMsg.innerHTML = `<i data-lucide="alert-circle"></i><span>${err.message}</span>`;
        errorMsg.style.display = 'flex';
        lucide.createIcons();

        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <span>Enviar enlace de recuperación</span>
            <div class="btn-arrow"><i data-lucide="arrow-right"></i></div>
        `;
        lucide.createIcons();
    }
});