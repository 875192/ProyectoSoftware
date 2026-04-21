const API_BASE = 'http://localhost:3000';

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      document.getElementById('resetForm').style.display = 'none';
      document.getElementById('invalidToken').style.display = 'block';
    }

    function toggleVisibility(inputId, _btn) {
      const input = document.getElementById(inputId);
      input.type = input.type === 'password' ? 'text' : 'password';
    }

    document.getElementById('resetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorMsg = document.getElementById('errorMsg');
      errorMsg.style.display = 'none';

      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        errorMsg.textContent = 'Las contraseñas no coinciden';
        errorMsg.style.display = 'block';
        return;
      }

      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando...';

      try {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 400 && data.message.includes('inválido')) {
            document.getElementById('resetForm').style.display = 'none';
            document.getElementById('invalidToken').style.display = 'block';
            return;
          }
          throw new Error(data.message || 'Error al actualizar la contraseña');
        }

        document.getElementById('resetForm').style.display = 'none';
        const successMsg = document.getElementById('successMsg');
        successMsg.style.display = 'block';

        // Redirigir al login después de 2 segundos
        setTimeout(() => { window.location.href = '../login_registro/login.html'; }, 2000);
      } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar contraseña';
      }
    });
