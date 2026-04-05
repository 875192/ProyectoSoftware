import { auth } from '../../core/auth.js';

const API_BASE = 'http://localhost:3000';

/* =========================================================
   TOGGLE PANEL (animación v2)
   ========================================================= */
const container    = document.getElementById('container');
const registerBtn  = document.getElementById('register');
const loginBtn     = document.getElementById('login');

registerBtn.addEventListener('click', () => container.classList.add('active'));
loginBtn.addEventListener('click',    () => container.classList.remove('active'));

/* =========================================================
   HELPERS
   ========================================================= */
function redirectByRole(user) {
    const routes = {
        estudiante:       '../student/dashboard_estudiante.html',
        profesor:         '../profesor/dashboard_profesor.html',
        personal_gestion: '../staff/dashboard_personal.html',
        mantenimiento:    '../maintenance/dashboard.html'
    };
    window.location.href = routes[user.role] || '../public/login.html';
}

function setLoading(btn, loading, originalHTML) {
    if (loading) {
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                 style="animation: spin 0.8s linear infinite;">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
        `;
        btn.disabled = true;
        btn.style.opacity = '0.8';
    } else {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
}

function clearError(id) {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
}

/* =========================================================
   INICIAR SESIÓN
   ========================================================= */
const loginForm    = document.getElementById('loginForm');
const emailInput   = document.getElementById('email');
const passInput    = document.getElementById('password');
const rememberChk  = document.getElementById('rememberMe');
const submitBtn    = document.getElementById('submitBtn');

// Restaurar credenciales guardadas
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('unigear_remember');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            emailInput.value = data.email || '';
            passInput.value  = data.password || '';
            rememberChk.checked = true;
        } catch {
            localStorage.removeItem('unigear_remember');
        }
    }
});

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError('login-error');

        // Gestionar "Recordar contraseña"
        if (rememberChk && rememberChk.checked) {
            localStorage.setItem('unigear_remember', JSON.stringify({
                email:    emailInput.value.trim(),
                password: passInput.value
            }));
        } else {
            localStorage.removeItem('unigear_remember');
        }

        const originalHTML = submitBtn.innerHTML;
        setLoading(submitBtn, true, originalHTML);

        try {
            const user = await auth.login(emailInput.value.trim(), passInput.value);

            // Animación de éxito
            submitBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"
                     stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>¡Bienvenido!</span>
            `;
            submitBtn.style.background = '#059669';
            submitBtn.style.opacity = '1';

            setTimeout(() => redirectByRole(user), 800);

        } catch (err) {
            setLoading(submitBtn, false, originalHTML);
            showError('login-error', err.message || 'Credenciales incorrectas');
            emailInput.style.boxShadow = '0 0 0 2px #e53935';
            passInput.style.boxShadow  = '0 0 0 2px #e53935';
            emailInput.addEventListener('input', () => {
                emailInput.style.boxShadow = '';
                passInput.style.boxShadow  = '';
                clearError('login-error');
            }, { once: true });
        }
    });
}

/* =========================================================
   REGISTRARSE
   ========================================================= */
const registerForm  = document.getElementById('registerForm');
const regNombre     = document.getElementById('reg-nombre');
const regEmail      = document.getElementById('reg-email');
const regPassword   = document.getElementById('reg-password');
const regConfirm    = document.getElementById('reg-confirm');
const registerBtnEl = document.getElementById('registerBtn');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError('reg-error');

        const nombre   = regNombre.value.trim();
        const email    = regEmail.value.trim();
        const password = regPassword.value;
        const confirm  = regConfirm.value;
        const rolInput = document.querySelector('input[name="reg-rol"]:checked');
        const rol      = rolInput ? rolInput.value : '';

        // Validaciones
        if (password.length < 8) {
            showError('reg-error', 'La contraseña debe tener al menos 8 caracteres');
            return;
        }
        if (password !== confirm) {
            showError('reg-error', 'Las contraseñas no coinciden');
            return;
        }
        if (!rol) {
            showError('reg-error', 'Selecciona un rol');
            return;
        }

        const originalHTML = registerBtnEl.innerHTML;
        setLoading(registerBtnEl, true, originalHTML);

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre_completo: nombre, email, password, rol })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error al crear la cuenta');

            // Éxito → most volver al login
            registerBtnEl.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"
                     stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>¡Cuenta creada!</span>
            `;
            registerBtnEl.style.background = '#059669';
            registerBtnEl.style.opacity = '1';
            registerBtnEl.disabled = false;

            // Volver al panel de login tras 1.2 s
            setTimeout(() => {
                container.classList.remove('active');
                registerBtnEl.innerHTML = originalHTML;
                registerBtnEl.style.background = '';
                registerForm.reset();
            }, 1200);

        } catch (err) {
            setLoading(registerBtnEl, false, originalHTML);
            showError('reg-error', err.message);
        }
    });
}

/* =========================================================
   GOOGLE SIGN-IN (OAuth)
   ========================================================= */
const GOOGLE_CLIENT_ID = 'TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
let googleTokenClient  = null;

function initGoogle() {
    if (typeof google === 'undefined' || !google.accounts) return;
    googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile',
        callback: async (tokenResponse) => {
            if (tokenResponse.error) return;
            const res  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: 'Bearer ' + tokenResponse.access_token }
            });
            const info = await res.json();
            const user = await auth.loginSocial(info.email);
            if (user) {
                redirectByRole(user);
            } else {
                showError('login-error', `No existe cuenta para ${info.email}. Por favor, regístrate primero.`);
            }
        }
    });
}

const btnGoogle = document.getElementById('btnGoogle');
if (btnGoogle) {
    btnGoogle.addEventListener('click', (e) => {
        e.preventDefault();
        if (!googleTokenClient) initGoogle();
        if (googleTokenClient) {
            googleTokenClient.requestAccessToken();
        } else {
            showError('login-error', 'El SDK de Google aún no ha cargado.');
        }
    });
}

window.addEventListener('load', () => setTimeout(initGoogle, 500));
