document.getElementById("forgotForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const email = document.getElementById("email").value;

    if (!email.includes("@")) {
        alert("Introduce un correo válido.");
        return;
    }

    // Simulación de envío
    alert("Si el correo existe en el sistema, recibirás instrucciones para restablecer tu contraseña.");

    // Redirigir al login
    window.location.href = "login.html";
});