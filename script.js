        function showNotification(message) {
        const notif = document.getElementById("notification");
        notif.textContent = message;
        notif.classList.add("show");
        setTimeout(() => notif.classList.remove("show"), 2500);
        }

        function getCharsetByContext(context) {
        switch (context) {
            case "social":
            return "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            case "bank":
            return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
            case "gaming":
            return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_+!#";
            case "email":
            return "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.";
            default:
            return null; // Se usará la selección manual
        }
        }

        // Convierte un ArrayBuffer a una cadena Base64URL para guardarlo en localStorage
        function bufferToBase64(buffer) {
        return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        }

        // Convierte una cadena Base64URL de vuelta a un ArrayBuffer para usarlo con la API
        function base64ToBuffer(base64) {
        const binaryString = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
        }

        async function accessProfile() {
        // 1. Verificar si el navegador es compatible con WebAuthn
        if (!window.PublicKeyCredential) {
            showNotification("Tu navegador no soporta esta función de seguridad.");
            // Si no hay soporte, lo dejamos pasar al perfil en este prototipo
            window.location.href = 'perfil.html';
            return;
        }

        // 2. Verificar si el usuario tiene un método de seguridad configurado en su dispositivo
        const hasLocalSecurity = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

        if (!hasLocalSecurity) {
            // Si no tiene seguridad (PIN, huella, etc.), se le permite el acceso directo
            showNotification("No se detectó un método de seguridad en el dispositivo. Accediendo directamente.");
            window.location.href = 'perfil.html';
            return;
        }

        // 3. Si tiene seguridad, procedemos a verificar
        const usuarioActivo = JSON.parse(localStorage.getItem("usuarioActivo"));
        if (!usuarioActivo) {
            showNotification("Debes iniciar sesión primero.");
            return;
        }

        // Traemos todos los usuarios para poder guardar la credencial
        const allUsers = JSON.parse(localStorage.getItem("usuarios"));
        const userIndex = allUsers.findIndex(u => u.email === usuarioActivo.email);
        
        // Convertimos el email del usuario a un buffer para el ID de usuario
        const userId = new TextEncoder().encode(usuarioActivo.email);
        
        try {
            // 4. Comprobar si el usuario ya registró este dispositivo antes
            const credentialId = allUsers[userIndex].credentialId;

            if (!credentialId) {
            // --- REGISTRO (Sucede la primera vez en un dispositivo) ---
            showNotification("Configurando seguridad local para este dispositivo...");
            
            const newCredential = await navigator.credentials.create({
                publicKey: {
                challenge: new Uint8Array(32), // Un reto aleatorio debería venir de un servidor, pero para el prototipo está bien así
                rp: { name: "ForgePass" }, // Relying Party (tu aplicación)
                user: { id: userId, name: usuarioActivo.email, displayName: usuarioActivo.email },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }], // Algoritmo ES256
                authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
                timeout: 60000,
                }
            });

            // Guardamos el ID de la credencial en el perfil del usuario para futuras verificaciones
            allUsers[userIndex].credentialId = bufferToBase64(newCredential.rawId);
            localStorage.setItem("usuarios", JSON.stringify(allUsers));
            localStorage.setItem("usuarioActivo", JSON.stringify(allUsers[userIndex])); // Actualizamos el usuario activo

            showNotification("Dispositivo registrado con éxito.");
            window.location.href = 'perfil.html';

            } else {
            // --- AUTENTICACIÓN (Sucede las veces siguientes) ---
            showNotification("Por favor, verifica tu identidad...");
            
            const assertion = await navigator.credentials.get({
                publicKey: {
                challenge: new Uint8Array(32), // De nuevo, debería ser aleatorio
                allowCredentials: [{
                    type: "public-key",
                    id: base64ToBuffer(credentialId), // Usamos el ID guardado
                    transports: ['internal'],
                }],
                userVerification: 'required',
                timeout: 60000,
                }
            });

            // Si el usuario completa el reto (pone su huella, PIN, etc.), lo dejamos pasar
            showNotification("Verificación exitosa. Accediendo...");
            window.location.href = 'perfil.html';
            }
        } catch (err) {
            // El usuario canceló la operación o hubo un error
            console.error("Error de autenticación:", err);
            showNotification("Acceso denegado. No se pudo verificar la identidad.");
        }
        }

        function generatePassword() {
        const length = parseInt(document.getElementById("lengthRange").value);
        const includeUpper = document.getElementById("includeUpper").checked;
        const includeLower = document.getElementById("includeLower").checked;
        const includeNumbers = document.getElementById("includeNumbers").checked;
        const includeSymbols = document.getElementById("includeSymbols").checked;
        const customWord = document.getElementById("customWord").value || "";
        const position = document.getElementById("position").value;
        const context = document.getElementById("context")?.value || "default";

            let charset = "";
            if (includeUpper) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            if (includeLower) charset += "abcdefghijklmnopqrstuvwxyz";
            if (includeNumbers) charset += "0123456789";
            if (includeSymbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";

        if (!charset || charset.length === 0) {
            alert("Selecciona al menos un tipo de carácter");
            return;
        }

        if (customWord.length >= length) {
            alert("La palabra clave es demasiado larga para la longitud seleccionada");
            return;
        }

        const remainingLength = length - customWord.length;
        let filler = "";
        for (let i = 0; i < remainingLength; i++) {
            filler += charset.charAt(Math.floor(Math.random() * charset.length));
        }

        let generated = "";
        switch (position) {
            case "start":
            generated = customWord + filler;
            break;
            case "middle":
            const mid = Math.floor(filler.length / 2);
            generated = filler.slice(0, mid) + customWord + filler.slice(mid);
            break;
            case "end":
            generated = filler + customWord;
            break;
        }

        document.getElementById("passwordOutput").textContent = generated;
        evaluateStrength(generated);

        const currentUser = JSON.parse(localStorage.getItem("usuarioActivo"));
        if (currentUser && currentUser.email) {
        const allUsers = JSON.parse(localStorage.getItem("usuarios") || "[]");
        const index = allUsers.findIndex(u => u.email === currentUser.email);
        if (index !== -1) {
        if (!allUsers[index].passwords) allUsers[index].passwords = [];
        allUsers[index].passwords.push({
        password: generated,
        context: context
        });
        localStorage.setItem("usuarios", JSON.stringify(allUsers));
        localStorage.setItem("usuarioActivo", JSON.stringify(allUsers[index]));
}

        }

        const qrContainer = document.getElementById("qrContainer");
        if (qrContainer) qrContainer.innerHTML = "";
        }

        function evaluateStrength(password) {
        const bar1 = document.getElementById('bar1');
        const bar2 = document.getElementById('bar2');
        const bar3 = document.getElementById('bar3');
        [bar1, bar2, bar3].forEach(bar => bar.className = 'bar');

        let score = 0;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        if (password.length >= 12) score++;

        if (score >= 4) {
            [bar1, bar2, bar3].forEach(bar => bar.classList.add('good'));
        } else if (score >= 2) {
            [bar1, bar2].forEach(bar => bar.classList.add('medium'));
        } else {
            bar1.classList.add('weak');
        }
        }

        function generateQR() {
        const password = document.getElementById("passwordOutput").textContent;
        const qrContainer = document.getElementById("qrContainer");

        if (!password || password === "Tu contraseña aparecerá aquí") {
            showNotification("Primero genera una contraseña");
            return;
        }

        qrContainer.innerHTML = "";
        QRCode.toCanvas(password, { width: 200 }, function (err, canvas) {
            if (err) {
            console.error(err);
            showNotification("Error al generar QR");
            return;
            }
            qrContainer.appendChild(canvas);
            showNotification("Código QR generado");
        });
        }

        // Observadores
        const form = document.getElementById("form");
        const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
            form.classList.add("visible");
            } else {
            form.classList.remove("visible");
            }
        });
        }, { threshold: 0.3 });
        observer.observe(form);

        const hero = document.getElementById("hero");
        const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
            hero.classList.add("visible");
            } else {
            hero.classList.remove("visible");
            }
        });
        }, { threshold: 0.3 });
        heroObserver.observe(hero);

        document.querySelector(".text-box button").addEventListener("click", () => {
        setTimeout(() => {
            document.getElementById("form").classList.add("visible");
        }, 300);
        });

        function copyPassword() {
        const password = document.getElementById("passwordOutput").textContent;
        if (!password) return alert("Primero genera una contraseña");
        navigator.clipboard.writeText(password)
            .then(() => showNotification("Contraseña copiada al portapapeles"))
            .catch(() => showNotification("Error al copiar"));
        }

        function downloadPassword() {
        const password = document.getElementById("passwordOutput").textContent;
        if (!password) return alert("Primero genera una contraseña");
        const blob = new Blob([password], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "contraseña.txt";
        link.click();
        showNotification("Su contraseña se está descargando");
        }

        // Slider de longitud
        const rangeInput = document.getElementById('lengthRange');
        const lengthDisplay = document.getElementById('lengthValue');
        const decreaseBtn = document.getElementById('decreaseLength');
        const increaseBtn = document.getElementById('increaseLength');

        rangeInput.addEventListener('input', () => {
        lengthDisplay.textContent = rangeInput.value;
        });
        decreaseBtn.addEventListener('click', () => {
        if (rangeInput.value > 6) {
            rangeInput.value--;
            lengthDisplay.textContent = rangeInput.value;
        }
        });
        increaseBtn.addEventListener('click', () => {
        if (rangeInput.value < 50) {
            rangeInput.value++;
            lengthDisplay.textContent = rangeInput.value;
        }
        });

        function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        const backToTopBtn = document.getElementById("backToTop");
        window.addEventListener("scroll", () => {
        const formSection = document.getElementById("form");
        if (!formSection || !backToTopBtn) return;
        const formTop = formSection.getBoundingClientRect().top + window.scrollY;
        backToTopBtn.style.display = window.scrollY > formTop - window.innerHeight / 2 ? "block" : "none";
        });

        // Autenticación con correo y contraseña
        let isAuthenticated = localStorage.getItem("logueado") === "true";
        let isLogin = false;

        function updateUI() {
        const authButtons = document.getElementById("authButtons");
        const profileControls = document.getElementById("profileControls");
        authButtons.style.display = isAuthenticated ? "none" : "flex";
        profileControls.style.display = isAuthenticated ? "flex" : "none";

        if (isAuthenticated) {
            const user = JSON.parse(localStorage.getItem("usuarioActivo"));
            console.log("Sesión activa como:", user?.email);
        }
        }

        document.addEventListener("DOMContentLoaded", () => {
            updateUI();
            localStorage.removeItem("myPasswords"); // Limpia contraseñas antiguas si existían

            // 👇 Este bloque detecta cuándo cambia el menú "¿Para qué es la contraseña?"
            const contextSelect = document.getElementById("context");
            contextSelect.addEventListener("change", (e) => {
                const selectedContext = e.target.value;
                applyContextPreset(selectedContext); // Aplica configuración según lo que eligió el usuario
            });
        });

        function showLogin() {
        isLogin = true;
        document.getElementById('modalTitle').textContent = 'Iniciar sesión';
        document.getElementById('emailInput').value = '';
        document.getElementById('passwordInput').value = '';
        document.getElementById('authModal').style.display = 'flex'; // muestra modal
        }

        function showRegister() {
        isLogin = false;
        document.getElementById('modalTitle').textContent = 'Crear cuenta';
        document.getElementById('emailInput').value = '';
        document.getElementById('passwordInput').value = '';
        document.getElementById('authModal').style.display = 'flex';
        }

        function closeModal() {
        document.getElementById('authModal').style.display = 'none'; // oculta modal
        }

        function confirmAuth() {
        const email = document.getElementById("emailInput").value.trim();
        const password = document.getElementById("passwordInput").value;

        if (!email || !password) {
            showNotification("Por favor completa todos los campos");
            return;
        }

        const users = JSON.parse(localStorage.getItem("usuarios") || "[]");

        if (isLogin) {
            const user = users.find(u => u.email === email && u.password === password);
            if (user) {
            localStorage.setItem("logueado", "true");
            localStorage.setItem("usuarioActivo", JSON.stringify(user));
            isAuthenticated = true;
            updateUI();
            closeModal();
            showNotification(`¡Bienvenido ${email}!`);
            } else {
            showNotification("Correo o contraseña incorrectos");
            }
        } else {
            const exists = users.some(u => u.email === email);
            if (exists) {
            showNotification("Este correo ya está registrado");
            return;
            }
            const newUser = { email, password, passwords: [] };
            users.push(newUser);
            localStorage.setItem("usuarios", JSON.stringify(users));
            localStorage.setItem("logueado", "true");
            localStorage.setItem("usuarioActivo", JSON.stringify(newUser));
            isAuthenticated = true;
            updateUI();
            closeModal();
            showNotification(`¡Cuenta creada para ${email}!`);
        }
        }

        function logout() {
        localStorage.removeItem("logueado");
        localStorage.removeItem("usuarioActivo");
        isAuthenticated = false;
        updateUI();
        showNotification("Sesión cerrada");
        }

        function openProfile() {
        const currentUser = JSON.parse(localStorage.getItem("usuarioActivo"));
        if (!currentUser || !currentUser.email) {
            showNotification("Ningún usuario logueado");
            return;
        }

        const passwords = currentUser.passwords || [];
        if (passwords.length === 0) {
            alert("No tienes contraseñas guardadas todavía.");
        } else {
            alert("Tus contraseñas:\n" + passwords.join("\n"));
        }
        }

function applyContextPreset(context) {
    const lengthRange = document.getElementById("lengthRange");
    const includeUpper = document.getElementById("includeUpper");
    const includeLower = document.getElementById("includeLower");
    const includeNumbers = document.getElementById("includeNumbers");
    const includeSymbols = document.getElementById("includeSymbols");

    switch (context) {
        case "R.social":
            lengthRange.value = 12;
            includeUpper.checked = true;
            includeLower.checked = true;
            includeNumbers.checked = true;
            includeSymbols.checked = false;
            break;
        case "Bancos":
            lengthRange.value = 16;
            includeUpper.checked = true;
            includeLower.checked = true;
            includeNumbers.checked = true;
            includeSymbols.checked = true;
            break;
        case "Juegos":
            lengthRange.value = 14;
            includeUpper.checked = true;
            includeLower.checked = true;
            includeNumbers.checked = true;
            includeSymbols.checked = true;
            break;
        case "Correo":
            lengthRange.value = 10;
            includeUpper.checked = false;
            includeLower.checked = true;
            includeNumbers.checked = true;
            includeSymbols.checked = false;
            break;
        default:
            // No aplicar cambios si es personalizado
            return;
    }

    // Actualiza el número mostrado de la longitud
    document.getElementById("lengthValue").textContent = lengthRange.value;

}