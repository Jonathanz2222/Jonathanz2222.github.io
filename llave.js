async function loginWithKey() {
    console.log("Botón presionado ✅");

    const allUsers = JSON.parse(localStorage.getItem("usuarios") || "[]");
    if (allUsers.length === 0) {
        showNotification("No hay cuentas registradas en este dispositivo");
        return;
    }

    const usuarioActivo = JSON.parse(localStorage.getItem("usuarioActivo")) || allUsers[0];
    if (!usuarioActivo.credentialId) {
        showNotification("Este usuario no tiene llave registrada. Primero inicia sesión normal para configurarla.");
        return;
    }

    try {
        showNotification("Verificando tu identidad...");
        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge: new Uint8Array(32),
                allowCredentials: [{
                    type: "public-key",
                    id: base64ToBuffer(usuarioActivo.credentialId),
                    transports: ["internal"]
                }],
                userVerification: "required",
                timeout: 60000
            }
        });

        localStorage.setItem("logueado", "true");
        localStorage.setItem("usuarioActivo", JSON.stringify(usuarioActivo));
        isAuthenticated = true;
        updateUI();
        showNotification(`¡Bienvenido ${usuarioActivo.email}!`);
        window.location.href = "perfil.html";

    } catch (err) {
        console.error("Error al iniciar sesión con llave:", err);
        showNotification("No se pudo verificar la llave de acceso");
    }
}