/**
 * login.js
 * Lógica de validación y comportamiento para la pantalla de login
 */

(function () {
    'use strict';

    // ========================================
    // ELEMENTOS DEL DOM
    // ========================================
    const form = document.getElementById('login-form');
    const usuarioInput = document.getElementById('usuario');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const btnAcceder = document.getElementById('btn-acceder');
    const loginStatus = document.getElementById('login-status');
    const usuarioError = document.getElementById('usuario-error');
    const passwordError = document.getElementById('password-error');

    // ========================================
    // CONSTANTES
    // ========================================
    const MIN_PASSWORD_LENGTH = 4;
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // ========================================
    // FUNCIONES DE UTILIDAD
    // ========================================

    function showError(input, errorElement, message) {
        input.setAttribute('aria-invalid', 'true');
        errorElement.textContent = message;

        // Animación shake
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            formGroup.classList.add('shake');
            setTimeout(() => formGroup.classList.remove('shake'), 350);
        }
    }

    function clearError(input, errorElement) {
        input.removeAttribute('aria-invalid');
        errorElement.textContent = '';
    }

    function setStatus(message, type = '') {
        loginStatus.className = 'login-status';
        if (type) {
            loginStatus.classList.add(`login-status--${type}`);
        }
        loginStatus.textContent = message;
    }

    function clearStatus() {
        loginStatus.className = 'login-status';
        loginStatus.textContent = '';
    }

    // ========================================
    // VALIDACIÓN
    // ========================================

    function validateUsuario() {
        const valor = usuarioInput.value.trim();

        if (!valor) {
            showError(usuarioInput, usuarioError, 'El usuario o correo es obligatorio.');
            return false;
        }

        if (valor.includes('@') && !EMAIL_REGEX.test(valor)) {
            showError(usuarioInput, usuarioError, 'El formato del correo no es válido.');
            return false;
        }

        clearError(usuarioInput, usuarioError);
        return true;
    }

    function validatePassword() {
        const valor = passwordInput.value;

        if (!valor) {
            showError(passwordInput, passwordError, 'La contraseña es obligatoria.');
            return false;
        }

        if (valor.length < MIN_PASSWORD_LENGTH) {
            showError(passwordInput, passwordError, `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
            return false;
        }

        clearError(passwordInput, passwordError);
        return true;
    }

    function validateForm() {
        const isUsuarioValid = validateUsuario();
        const isPasswordValid = validatePassword();
        return isUsuarioValid && isPasswordValid;
    }

    // ========================================
    // MOSTRAR/OCULTAR CONTRASEÑA
    // ========================================

    function togglePasswordVisibility() {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.textContent = isPassword ? 'Ocultar' : 'Mostrar';
        togglePasswordBtn.setAttribute(
            'aria-label',
            isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
        );
    }

    // ========================================
    // SIMULACIÓN DE LOGIN
    // ========================================

    function simulateLogin(usuario) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulación: en producción, esto vendría de la BD
                // Por ahora, todos los usuarios son "Estudiante"
                const nombre = usuario.includes('@') 
                    ? usuario.split('@')[0].replace(/[._]/g, ' ')
                    : usuario;
                
                // Capitalizar nombre
                const nombreFormateado = nombre
                    .split(' ')
                    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
                    .join(' ');

                resolve({
                    success: true,
                    user: {
                        name: nombreFormateado,
                        email: usuario.includes('@') ? usuario : usuario + '@ejemplo.com',
                        role: 'Estudiante', // Por defecto estudiante, la BD determinará el rol real
                        initials: nombreFormateado.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
                    },
                    // Mapeo de roles a dashboards
                    redirectMap: {
                        'Estudiante': 'dashboard_estudiante.html',
                        'Profesorado': 'dashboard_profesor.html',
                        'Personal': 'dashboard_personal.html',
                        'Mantenimiento': 'dashboard_mantenimiento.html'
                    }
                });
            }, 700);
        });
    }

    /**
     * Llamada real al backend (descomenta cuando esté listo)
     */
    /*
    async function loginRequest(usuario, password) {
        const API_URL = '/api/auth/login';
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario,
                password,
                recordarme: document.getElementById('recordarme').checked
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error de autenticación');
        }

        return response.json();
    }
    */

    // ========================================
    // ENVÍO DEL FORMULARIO
    // ========================================

    async function handleSubmit(event) {
        event.preventDefault();
        clearStatus();

        if (!validateForm()) {
            return;
        }

        btnAcceder.disabled = true;
        btnAcceder.textContent = 'Accediendo…';
        btnAcceder.classList.add('btn-primary--loading');
        setStatus('Validando credenciales…', 'loading');

        try {
            // Reemplazar simulateLogin() por loginRequest() cuando el backend esté listo
            const resultado = await simulateLogin(usuarioInput.value.trim());
            
            // Guardar datos del usuario en localStorage para el dashboard
            localStorage.setItem('currentUser', JSON.stringify(resultado.user));
            
            setStatus('¡Bienvenido! Redirigiendo...', 'success');

            // Determinar el dashboard según el rol
            // Por ahora siempre es estudiante, cuando haya BD se usará el rol real
            const dashboard = resultado.redirectMap[resultado.user.role] || 'dashboard_estudiante.html';

            // Redirigir al dashboard correspondiente
            setTimeout(() => {
                window.location.href = dashboard;
            }, 500);

        } catch (error) {
            setStatus(error.message || 'Error al iniciar sesión.', 'error');
            btnAcceder.disabled = false;
            btnAcceder.textContent = 'Acceder';
            btnAcceder.classList.remove('btn-primary--loading');
        }
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================

    form.addEventListener('submit', handleSubmit);
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    usuarioInput.addEventListener('blur', validateUsuario);
    passwordInput.addEventListener('blur', validatePassword);

    usuarioInput.addEventListener('input', () => {
        if (usuarioInput.hasAttribute('aria-invalid')) {
            clearError(usuarioInput, usuarioError);
        }
    });

    passwordInput.addEventListener('input', () => {
        if (passwordInput.hasAttribute('aria-invalid')) {
            clearError(passwordInput, passwordError);
        }
    });

})();
