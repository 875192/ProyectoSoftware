import { api } from '../../js/core/api.js';

        // DOM Elements
        const form = document.getElementById('register-form');
        const stepSubtitle = document.getElementById('step-subtitle');
        const step1 = document.getElementById('step-1');
        const step2 = document.getElementById('step-2');
        const stepIndicators = document.querySelectorAll('.step');
        
        const btnSiguiente = document.getElementById('btn-siguiente');
        const btnAtras = document.getElementById('btn-atras');
        
        const nombreInput = document.getElementById('nombre');
        const rolSelect = document.getElementById('rol');
        const correoInput = document.getElementById('correo');
        const passwordInput = document.getElementById('password');
        const passwordConfirmInput = document.getElementById('password-confirm');
        const aceptarTerminosCheckbox = document.getElementById('aceptar-terminos');
        
        const nombreError = document.getElementById('nombre-error');
        const rolError = document.getElementById('rol-error');
        const correoError = document.getElementById('correo-error');
        const passwordError = document.getElementById('password-error');
        const passwordConfirmError = document.getElementById('password-confirm-error');
        const terminosError = document.getElementById('terminos-error');
        
        const registerStatus = document.getElementById('register-status');
        const togglePasswordBtns = document.querySelectorAll('.toggle-password-btn');

        let currentStep = 1;
        const STEP_SUBTITLES = {
            1: '¿Cómo te llamas?',
            2: 'Configura tu acceso'
        };

        function showError(input, errorElement, message) {
            input.setAttribute('aria-invalid', 'true');
            if(errorElement) errorElement.textContent = message;
        }

        function clearError(input, errorElement) {
            input.removeAttribute('aria-invalid');
            if(errorElement) errorElement.textContent = '';
        }

        function setStatus(message, isSuccess = false) {
            registerStatus.textContent = message;
            registerStatus.className = 'register-status ' + (isSuccess ? 'register-status--success' : '');
        }

        function goToStep(stepNumber) {
            currentStep = stepNumber;
            step1.classList.toggle('form-step--active', stepNumber === 1);
            step2.classList.toggle('form-step--active', stepNumber === 2);
            
            stepIndicators.forEach(indicator => {
                const indicatorStep = parseInt(indicator.dataset.step);
                indicator.classList.remove('step--active', 'step--completed');
                if (indicatorStep === stepNumber) {
                    indicator.classList.add('step--active');
                } else if (indicatorStep < stepNumber) {
                    indicator.classList.add('step--completed');
                }
            });
            
            stepSubtitle.textContent = STEP_SUBTITLES[stepNumber];
            if (stepNumber === 1) nombreInput.focus();
            if (stepNumber === 2) correoInput.focus();
        }

        function validateStep1() {
            let isValid = true;
            const nombre = nombreInput.value.trim();
            if (!nombre || nombre.split(' ').length < 2) {
                showError(nombreInput, nombreError, 'Incluye tu nombre y apellido.');
                isValid = false;
            } else {
                clearError(nombreInput, nombreError);
            }

            if (!rolSelect.value) {
                showError(rolSelect, rolError, 'Selecciona un rol.');
                isValid = false;
            } else {
                clearError(rolSelect, rolError);
            }
            return isValid;
        }

        function validateStep2() {
            let isValid = true;
            
            const correo = correoInput.value.trim();
            if (!correo || !correo.includes('@')) {
                showError(correoInput, correoError, 'Ingresa un correo válido.');
                isValid = false;
            } else {
                clearError(correoInput, correoError);
            }

            const pass = passwordInput.value;
            if (pass.length < 8) {
                showError(passwordInput, passwordError, 'Mínimo 8 caracteres.');
                isValid = false;
            } else {
                clearError(passwordInput, passwordError);
            }

            if (pass !== passwordConfirmInput.value) {
                showError(passwordConfirmInput, passwordConfirmError, 'Las contraseñas no coinciden.');
                isValid = false;
            } else {
                clearError(passwordConfirmInput, passwordConfirmError);
            }

            if (!aceptarTerminosCheckbox.checked) {
                terminosError.textContent = 'Debes aceptar los términos.';
                isValid = false;
            } else {
                terminosError.textContent = '';
            }

            return isValid;
        }

        // DOM Events
        btnSiguiente.addEventListener('click', () => {
            if (validateStep1()) goToStep(2);
        });

        btnAtras.addEventListener('click', () => {
            goToStep(1);
        });

        togglePasswordBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.target);
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.textContent = 'Ocultar';
                } else {
                    input.type = 'password';
                    btn.textContent = 'Mostrar';
                }
            });
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            setStatus('');

            if (!validateStep2()) return;

            try {
                setStatus('Creando cuenta...');
                await api.register({
                    nombre_completo: nombreInput.value.trim(),
                    email: correoInput.value.trim(),
                    password: passwordInput.value,
                    rol: rolSelect.value
                });
                setStatus('¡Cuenta creada con éxito! Redirigiendo...', true);
                setTimeout(() => { window.location.href = 'login.html'; }, 1500);
            } catch (err) {
                if (err.message && err.message.toLowerCase().includes('correo')) {
                    showError(correoInput, correoError, err.message);
                } else {
                    setStatus(err.message || 'Error al crear la cuenta. Inténtalo de nuevo.');
                }
            }
        });
