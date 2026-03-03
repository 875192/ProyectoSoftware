/**
 * register.js
 * Lógica de validación y comportamiento para la pantalla de crear cuenta
 * Con navegación por pasos (wizard)
 */

(function () {
    'use strict';

    // ========================================
    // ELEMENTOS DEL DOM
    // ========================================
    const form = document.getElementById('register-form');
    const stepSubtitle = document.getElementById('step-subtitle');
    
    // Pasos
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const stepIndicators = document.querySelectorAll('.step');
    
    // Botones de navegación
    const btnSiguiente = document.getElementById('btn-siguiente');
    const btnAtras = document.getElementById('btn-atras');
    const btnCrear = document.getElementById('btn-crear');
    
    // Campos paso 1
    const nombreInput = document.getElementById('nombre');
    const rolSelect = document.getElementById('rol');
    
    // Campos paso 2
    const correoInput = document.getElementById('correo');
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('password-confirm');
    const aceptarTerminosCheckbox = document.getElementById('aceptar-terminos');
    
    // Elementos de error
    const nombreError = document.getElementById('nombre-error');
    const rolError = document.getElementById('rol-error');
    const correoError = document.getElementById('correo-error');
    const passwordError = document.getElementById('password-error');
    const passwordConfirmError = document.getElementById('password-confirm-error');
    const terminosError = document.getElementById('terminos-error');
    
    // Estado y mensajes
    const registerStatus = document.getElementById('register-status');
    
    // Botones de toggle password
    const togglePasswordBtns = document.querySelectorAll('.toggle-password-btn');

    // ========================================
    // ESTADO
    // ========================================
    let currentStep = 1;

    // ========================================
    // CONSTANTES
    // ========================================
    const MIN_NAME_LENGTH = 3;
    const MIN_PASSWORD_LENGTH = 8;
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const PERSONAL_EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'live.com', 'icloud.com'];
    
    const STEP_SUBTITLES = {
        1: '¿Cómo te llamas?',
        2: 'Configura tu acceso'
    };

    // ========================================
    // FUNCIONES DE UTILIDAD
    // ========================================

    function showError(input, errorElement, message) {
        input.setAttribute('aria-invalid', 'true');
        errorElement.textContent = message;

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

    function showWarning(errorElement, message) {
        errorElement.textContent = message;
        errorElement.classList.add('warning-message');
        errorElement.classList.remove('error-message');
    }

    function resetMessageType(errorElement) {
        errorElement.classList.remove('warning-message');
        errorElement.classList.add('error-message');
    }

    function setStatus(message, type = '') {
        registerStatus.className = 'register-status';
        if (type) {
            registerStatus.classList.add(`register-status--${type}`);
        }
        registerStatus.textContent = message;
    }

    function clearStatus() {
        registerStatus.className = 'register-status';
        registerStatus.textContent = '';
    }

    // ========================================
    // NAVEGACIÓN ENTRE PASOS
    // ========================================

    function goToStep(stepNumber) {
        currentStep = stepNumber;
        
        // Actualizar visibilidad de pasos
        step1.classList.toggle('form-step--active', stepNumber === 1);
        step2.classList.toggle('form-step--active', stepNumber === 2);
        
        // Actualizar indicadores
        stepIndicators.forEach(indicator => {
            const indicatorStep = parseInt(indicator.dataset.step);
            indicator.classList.remove('step--active', 'step--completed');
            
            if (indicatorStep === stepNumber) {
                indicator.classList.add('step--active');
            } else if (indicatorStep < stepNumber) {
                indicator.classList.add('step--completed');
            }
        });
        
        // Actualizar subtítulo
        stepSubtitle.textContent = STEP_SUBTITLES[stepNumber];
        
        // Focus al primer campo del paso
        if (stepNumber === 1) {
            nombreInput.focus();
        } else if (stepNumber === 2) {
            correoInput.focus();
        }
    }

    // ========================================
    // VALIDACIÓN PASO 1
    // ========================================

    function validateNombre() {
        const valor = nombreInput.value.trim();

        if (!valor) {
            showError(nombreInput, nombreError, 'El nombre completo es obligatorio.');
            return false;
        }

        if (valor.length < MIN_NAME_LENGTH) {
            showError(nombreInput, nombreError, `Mínimo ${MIN_NAME_LENGTH} caracteres.`);
            return false;
        }

        const palabras = valor.split(/\s+/).filter(p => p.length > 0);
        if (palabras.length < 2) {
            showError(nombreInput, nombreError, 'Incluye nombre y apellido.');
            return false;
        }

        clearError(nombreInput, nombreError);
        return true;
    }

    function validateRol() {
        const valor = rolSelect.value;

        if (!valor) {
            showError(rolSelect, rolError, 'Selecciona un rol.');
            return false;
        }

        clearError(rolSelect, rolError);
        return true;
    }

    function validateStep1() {
        const isNombreValid = validateNombre();
        const isRolValid = validateRol();
        return isNombreValid && isRolValid;
    }

    // ========================================
    // VALIDACIÓN PASO 2
    // ========================================

    function validateCorreo() {
        const valor = correoInput.value.trim();
        resetMessageType(correoError);

        if (!valor) {
            showError(correoInput, correoError, 'El correo es obligatorio.');
            return false;
        }

        if (!EMAIL_REGEX.test(valor)) {
            showError(correoInput, correoError, 'El formato del correo no es válido.');
            return false;
        }

        const dominio = valor.split('@')[1]?.toLowerCase();
        if (dominio && PERSONAL_EMAIL_DOMAINS.includes(dominio)) {
            clearError(correoInput, correoError);
            showWarning(correoError, 'Se recomienda usar un correo institucional.');
            return true;
        }

        clearError(correoInput, correoError);
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

    function validatePasswordConfirm() {
        const valor = passwordConfirmInput.value;
        const password = passwordInput.value;

        if (!valor) {
            showError(passwordConfirmInput, passwordConfirmError, 'Confirma la contraseña.');
            return false;
        }

        if (valor !== password) {
            showError(passwordConfirmInput, passwordConfirmError, 'Las contraseñas no coinciden.');
            return false;
        }

        clearError(passwordConfirmInput, passwordConfirmError);
        return true;
    }

    function validateTerminos() {
        if (!aceptarTerminosCheckbox.checked) {
            terminosError.textContent = 'Debes aceptar los términos para continuar.';
            return false;
        }

        terminosError.textContent = '';
        return true;
    }

    function validateStep2() {
        const isCorreoValid = validateCorreo();
        const isPasswordValid = validatePassword();
        const isPasswordConfirmValid = validatePasswordConfirm();
        const isTerminosValid = validateTerminos();

        return isCorreoValid && isPasswordValid && isPasswordConfirmValid && isTerminosValid;
    }

    // ========================================
    // MOSTRAR/OCULTAR CONTRASEÑA
    // ========================================

    function togglePasswordVisibility(event) {
        const btn = event.currentTarget;
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.textContent = isPassword ? 'Ocultar' : 'Mostrar';
        btn.setAttribute(
            'aria-label',
            isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
        );
    }

    // ========================================
    // SIMULACIÓN DE REGISTRO
    // ========================================

    function simulateRegister(datos) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const rolMap = {
                    'Estudiante':    { initials: datos.nombre.slice(0, 2).toUpperCase() },
                    'Profesorado':  { initials: datos.nombre.slice(0, 2).toUpperCase() },
                    'Personal':     { initials: datos.nombre.slice(0, 2).toUpperCase() },
                    'Mantenimiento':{ initials: datos.nombre.slice(0, 2).toUpperCase() }
                };

                resolve({
                    success: true,
                    user: {
                        name:     datos.nombre,
                        email:    datos.correo,
                        role:     datos.rol,
                        initials: (rolMap[datos.rol] || {}).initials || datos.nombre.slice(0, 2).toUpperCase()
                    },
                    redirectMap: {
                        'Estudiante':    'dashboard_estudiante.html',
                        'Profesorado':   'dashboard_profesor.html',
                        'Personal':      'dashboard_personal.html',
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
    async function registerRequest(datos) {
        const API_URL = '/api/auth/register';
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al crear la cuenta');
        }

        return response.json();
    }
    */

    // ========================================
    // MANEJADORES DE EVENTOS
    // ========================================

    function handleSiguiente() {
        if (validateStep1()) {
            goToStep(2);
        }
    }

    function handleAtras() {
        goToStep(1);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        clearStatus();

        if (!validateStep2()) {
            return;
        }

        btnCrear.disabled = true;
        btnCrear.textContent = 'Creando…';
        btnCrear.classList.add('btn-primary--loading');
        setStatus('Creando cuenta…', 'loading');

        const datos = {
            nombre: nombreInput.value.trim(),
            correo: correoInput.value.trim(),
            rol: rolSelect.value,
            password: passwordInput.value
        };

        try {
            // ============================================
            // AQUÍ VA LA LLAMADA AL BACKEND
            // Reemplazar simulateRegister() por registerRequest(datos)
            // ============================================
            const resultado = await simulateRegister(datos);

            // Guardar datos del usuario en localStorage para el dashboard
            localStorage.setItem('currentUser', JSON.stringify(resultado.user));

            setStatus('Cuenta creada correctamente. Redirigiendo…', 'success');

            // Determinar el dashboard según el rol y redirigir
            const dashboard = resultado.redirectMap[resultado.user.role] || 'dashboard_estudiante.html';
            setTimeout(() => {
                window.location.href = dashboard;
            }, 800);

        } catch (error) {
            setStatus(error.message || 'Error al crear la cuenta.', 'error');
        } finally {
            btnCrear.disabled = false;
            btnCrear.textContent = 'Crear cuenta';
            btnCrear.classList.remove('btn-primary--loading');
        }
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================

    // Navegación
    btnSiguiente.addEventListener('click', handleSiguiente);
    btnAtras.addEventListener('click', handleAtras);
    form.addEventListener('submit', handleSubmit);

    // Toggle password
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', togglePasswordVisibility);
    });

    // Validación en blur - Paso 1
    nombreInput.addEventListener('blur', validateNombre);
    rolSelect.addEventListener('blur', validateRol);

    // Validación en blur - Paso 2
    correoInput.addEventListener('blur', validateCorreo);
    passwordInput.addEventListener('blur', validatePassword);
    passwordConfirmInput.addEventListener('blur', validatePasswordConfirm);

    // Limpiar errores al escribir - Paso 1
    nombreInput.addEventListener('input', () => {
        if (nombreInput.hasAttribute('aria-invalid')) {
            clearError(nombreInput, nombreError);
        }
    });

    rolSelect.addEventListener('change', () => {
        if (rolSelect.hasAttribute('aria-invalid')) {
            clearError(rolSelect, rolError);
        }
    });

    // Limpiar errores al escribir - Paso 2
    correoInput.addEventListener('input', () => {
        if (correoInput.hasAttribute('aria-invalid')) {
            clearError(correoInput, correoError);
            resetMessageType(correoError);
        }
    });

    passwordInput.addEventListener('input', () => {
        if (passwordInput.hasAttribute('aria-invalid')) {
            clearError(passwordInput, passwordError);
        }
        if (passwordConfirmInput.value) {
            validatePasswordConfirm();
        }
    });

    passwordConfirmInput.addEventListener('input', () => {
        if (passwordConfirmInput.hasAttribute('aria-invalid')) {
            clearError(passwordConfirmInput, passwordConfirmError);
        }
    });

})();
