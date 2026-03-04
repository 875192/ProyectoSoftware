document.getElementById("resetForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const pass1 = document.getElementById("newPassword").value;
    const pass2 = document.getElementById("confirmPassword").value;

    if (pass1.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    if (pass1 !== pass2) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    alert("Contraseña actualizada correctamente.");

    window.location.href = "login.html";
});