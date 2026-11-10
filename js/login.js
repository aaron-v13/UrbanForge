(function () {
    "use strict";

    const form = document.getElementById("loginForm");
    if (!form) return;

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const rememberInput = document.getElementById("rememberme");
    const submitButton = document.getElementById("signinBtn");
    const status = document.getElementById("formStatus");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const togglePassword = document.getElementById("togglePassword");

    function showStatus(message, success = false) {
        status.textContent = message;
        status.style.color = success ? "#2ecc71" : "#e74c3c";
    }

    function clearErrors() {
        emailError.textContent = "";
        passwordError.textContent = "";
        showStatus("");
    }

    function validEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function togglePasswordVisibility() {
        const showing = passwordInput.type === "password";
        passwordInput.type = showing ? "text" : "password";
        togglePassword.classList.toggle("fa-eye", !showing);
        togglePassword.classList.toggle("fa-eye-slash", showing);
        togglePassword.setAttribute(
            "aria-label",
            showing ? "Hide password" : "Show password"
        );
    }

    togglePassword.addEventListener("click", togglePasswordVisibility);
    togglePassword.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            togglePasswordVisibility();
        }
    });

    passwordInput.addEventListener("keyup", event => {
        if (event.getModifierState && event.getModifierState("CapsLock")) {
            passwordInput.title = "Caps Lock is on";
        } else {
            passwordInput.title = "";
        }
    });

    emailInput.addEventListener("input", () => {
        emailError.textContent = "";
    });

    passwordInput.addEventListener("input", () => {
        passwordError.textContent = "";
    });

    // Remember the email address only, not the password.
    try {
        emailInput.value = localStorage.getItem("urbanforge_email") || "";
    } catch {
        // Storage may be unavailable in some browser configurations.
    }

    const forgotPassword = document.getElementById("forgotPassword");
    forgotPassword?.addEventListener("click", event => {
        event.preventDefault();
        showStatus("Password reset is not configured yet. Please register or re-enter your password.");
    });

    document.querySelectorAll(".social-btn").forEach(button => {
        button.addEventListener("click", () => {
            showStatus(button.dataset.provider + " sign-in is not configured yet.");
        });
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        clearErrors();

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        let valid = true;

        if (!validEmail(email)) {
            emailError.textContent = "Please enter a valid email address.";
            valid = false;
        }

        if (!password) {
            passwordError.textContent = "Please enter your password.";
            valid = false;
        }

        if (!valid) return;

        if (!window.UrbanForgeAuth) {
            showStatus("Authentication failed to load. Refresh and try again.");
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Signing in...";

        try {
            const result = await window.UrbanForgeAuth.login(
                email,
                password,
                rememberInput.checked
            );

            if (!result || !result.success) {
                showStatus(result && result.message ? result.message : "Invalid email or password.", false);
                return;
            }

            if (rememberInput.checked) {
                localStorage.setItem("urbanforge_email", email);
            } else {
                localStorage.removeItem("urbanforge_email");
            }

            showStatus("Login successful! Redirecting...", true);
            setTimeout(() => {
                window.location.href = "/index.html";
            }, 600);
        } catch (error) {
            showStatus(error.message || "Unable to sign in. Please try again.", false);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Sign In";
        }
    });
})();
