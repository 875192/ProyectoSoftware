import { auth } from '../../js/core/auth.js';

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
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('email');
      const passInput  = document.getElementById('password');

      try {
        const user = await auth.login(emailInput.value, passInput.value);
        redirectByRole(user);
      } catch (err) {
        emailInput.setAttribute('aria-invalid', 'true');
        passInput.setAttribute('aria-invalid', 'true');
        emailInput.addEventListener('input', () => {
          emailInput.setAttribute('aria-invalid', 'false');
          passInput.setAttribute('aria-invalid', 'false');
        }, { once: true });
      }
    });

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
