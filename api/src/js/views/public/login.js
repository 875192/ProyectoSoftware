import { auth } from '../../core/auth.js';

console.log("Login.js cargado correctamente");

    // Inicializar iconos de Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    /* =============================================
       CONFIGURACIÓN — Pon aquí tus Client IDs reales
       ============================================= */
    const GOOGLE_CLIENT_ID = 'TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
    const APPLE_CLIENT_ID  = 'com.tudominio.servicio'; // Apple Service ID
    const APPLE_REDIRECT   = window.location.href;

    /* ---------- Redirect helper ---------- */
    function redirectByRole(user) {
      const routes = {
        estudiante: '../student/dashboard_estudiante.html',
        profesor:   '../profesor/dashboard_profesor.html',
        personal_gestion: '../staff/dashboard_personal.html',
        mantenimiento: '../maintenance/dashboard.html'
      };
      window.location.href = routes[user.role] || '../public/login.html';
    }

    /* ---------- Email / password login ---------- */
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passInput  = document.getElementById('password');
    const rememberCheckbox = document.getElementById('rememberMe');
    const submitBtn = document.getElementById('submitBtn');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Guardar o borrar según checkbox
        if (rememberCheckbox && rememberCheckbox.checked) {
            localStorage.setItem('unigear_remember', JSON.stringify({ 
                email: emailInput.value.trim(), 
                password: passInput.value 
            }));
        } else {
            localStorage.removeItem('unigear_remember');
        }

        // Estado de carga del botón
        const originalBtnContent = submitBtn.innerHTML;
        submitBtn.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 0.8s linear infinite;">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
        `;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.85';

        try {
          const user = await auth.login(emailInput.value.trim(), passInput.value);
          
          // Animación de éxito
          submitBtn.innerHTML = `
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>¡Bienvenido!</span>
          `;
          submitBtn.style.background = '#059669';
          submitBtn.style.opacity = '1';

          // Esperar un momento para mostrar la animación antes de redirigir
          setTimeout(() => {
              redirectByRole(user);
          }, 800);
          
        } catch (err) {
          // Mostrar error y restaurar botón
          submitBtn.innerHTML = originalBtnContent;
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          
          // Mostrar mensaje de error (usando alert u otra forma en el DOM)
          alert(err.message || 'Credenciales incorrectas');
          
          emailInput.style.borderColor = 'var(--danger)';
          passInput.style.borderColor = 'var(--danger)';
          emailInput.addEventListener('input', () => {
            emailInput.style.borderColor = '';
            passInput.style.borderColor = '';
          }, { once: true });
        }
      });
    }

    /* ---------- Google Sign-In (real OAuth popup) ---------- */
    let googleTokenClient = null;

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
          const user = auth.loginSocial(info.email);
          if (user) {
            redirectByRole(user);
          } else {
            alert('No existe una cuenta registrada con el correo ' + info.email + '. Por favor, crea una cuenta primero.');
          }
        }
      });
    }

    document.getElementById('btnGoogle').addEventListener('click', () => {
      if (!googleTokenClient) initGoogle();
      if (googleTokenClient) {
        googleTokenClient.requestAccessToken();
      } else {
        alert('El SDK de Google aún no ha cargado. Verifica tu Client ID y conexión a Internet.');
      }
    });

    /* ---------- Apple Sign-In (real OAuth popup) ---------- */
    function initApple() {
      if (typeof AppleID === 'undefined') return false;
      AppleID.auth.init({
        clientId:    APPLE_CLIENT_ID,
        scope:       'name email',
        redirectURI: APPLE_REDIRECT,
        usePopup:    true
      });
      return true;
    }

    document.getElementById('btnApple').addEventListener('click', async () => {
      if (!initApple()) {
        alert('El SDK de Apple aún no ha cargado. Verifica tu Service ID y conexión a Internet.');
        return;
      }
      try {
        const data  = await AppleID.auth.signIn();
        const token = data.authorization.id_token;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const email = payload.email;
        if (!email) {
          alert('No se pudo obtener el correo de Apple. Inténtalo de nuevo.');
          return;
        }
        const user = auth.loginSocial(email);
        if (user) {
          redirectByRole(user);
        } else {
          alert('No existe una cuenta registrada con el correo ' + email + '. Por favor, crea una cuenta primero.');
        }
      } catch (err) {
        if (err.error !== 'popup_closed_by_user') {
          console.error('Apple Sign-In error:', err);
        }
      }
    });

    /* Intentar inicializar Google cuando el SDK termine de cargar */
    window.addEventListener('load', () => setTimeout(initGoogle, 500));
