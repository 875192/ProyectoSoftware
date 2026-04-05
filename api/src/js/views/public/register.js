const API_BASE = 'http://localhost:3000';

const registerForm = document.getElementById('registerForm');
const errorMsg3 = document.getElementById('errorMsg3');
const submitBtn = document.getElementById('submitBtn');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg3.style.display = 'none';

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const rol = document.querySelector('input[name="rol"]:checked').value;

    // Validaciones
    if (password.length < 8) {
        showStepError('errorMsg3', 'La contraseña debe tener al menos 8 caracteres');
        return;
    }

    if (password !== confirmPassword) {
        showStepError('errorMsg3', 'Las contraseñas no coinciden');
        return;
    }

    // Loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 0.8s linear infinite;">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span>Creando cuenta...</span>
    `;

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre_completo: nombre,
                email,
                password,
                rol
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Error al crear la cuenta');
        }

        // Éxito
        submitBtn.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>¡Cuenta creada!</span>
        `;
        submitBtn.style.background = '#059669';

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1200);

    } catch (err) {
        showStepError('errorMsg3', err.message);

        submitBtn.disabled = false;
        submitBtn.style.background = '';
        submitBtn.innerHTML = `
            <span>Crear Cuenta</span>
            <div class="btn-arrow"><i data-lucide="arrow-right"></i></div>
        `;
        lucide.createIcons();
    }
});