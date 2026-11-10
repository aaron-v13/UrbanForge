(function () {
    "use strict";

    const form = document.getElementById("signupForm");
    if (!form) return;

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmInput = document.getElementById("confirmPassword");
    const togglePassword = document.getElementById("togglePassword");
    const submitButton = document.getElementById("signupBtn");
    const status = document.getElementById("formStatus");

    function showStatus(message, success = false) {
        if (!status) return;
        status.textContent = message;
        status.style.color = success ? "#2ecc71" : "#e74c3c";
    }

    function toggleVisibility() {
        const showing = passwordInput.type === "password";
        passwordInput.type = showing ? "text" : "password";
        confirmInput.type = showing ? "text" : "password";

        togglePassword.classList.toggle("fa-eye", !showing);
        togglePassword.classList.toggle("fa-eye-slash", showing);
        togglePassword.setAttribute(
            "aria-label",
            showing ? "Hide passwords" : "Show passwords"
        );
    }

    togglePassword?.addEventListener("click", toggleVisibility);
    togglePassword?.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleVisibility();
        }
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const nameError = document.getElementById("nameError");
        const emailError = document.getElementById("emailError");
        const passwordError = document.getElementById("passwordError");
        const confirmError = document.getElementById("confirmPasswordError");

        if (nameError) nameError.textContent = "";
        if (emailError) emailError.textContent = "";
        if (passwordError) passwordError.textContent = "";
        if (confirmError) confirmError.textContent = "";
        showStatus("");

        const name = (nameInput?.value || "").trim();
        const email = (emailInput?.value || "").trim().toLowerCase();
        const password = passwordInput?.value || "";
        const confirmPassword = confirmInput?.value || "";

        let valid = true;

        if (!email) {
            if (emailError) emailError.textContent = "Please enter an email address.";
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (emailError) emailError.textContent = "Please enter a valid email address (e.g. user@example.com).";
            valid = false;
        }

        if (!password) {
            if (passwordError) passwordError.textContent = "Please create a password.";
            valid = false;
        } else if (password.length < 4) {
            if (passwordError) passwordError.textContent = "Password must be at least 4 characters.";
            valid = false;
        }

        if (confirmPassword && password !== confirmPassword) {
            if (confirmError) confirmError.textContent = "Passwords do not match.";
            valid = false;
        }

        if (!valid) return;

        if (!window.UrbanForgeAuth) {
            showStatus("Authentication script is not loaded. Please refresh the page.", false);
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Saving account...";
        showStatus("Saving your email and password...", true);

        try {
            console.log("Submitting signup with:", { name, email });
            const result = await window.UrbanForgeAuth.signup(name, email, password);

            if (!result || !result.success) {
                showStatus(result && result.message ? result.message : "Unable to create your account.", false);
                return;
            }

            showStatus("Account created successfully! Your data has been saved to users.json. Redirecting...", true);
            setTimeout(() => {
                window.location.href = "/index.html";
            }, 800);
        } catch (error) {
            console.error("Signup submit error:", error);
            showStatus(error.message || "Unable to save your account.", false);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Create Account";
        }
    });
})();
