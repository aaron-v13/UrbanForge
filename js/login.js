const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const password = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const rememberMe = document.getElementById("rememberme");
const signinBtn = document.getElementById("signinBtn");
const formStatus = document.getElementById("formStatus");

const REMEMBER_KEY = "urbanforge_email";

/* ---------- Helpers ---------- */
function showFieldError(input, message) {
    const field = input.closest(".field");
    field.classList.add("invalid");
    field.querySelector(".error").textContent = message;
}

function clearFieldError(input) {
    const field = input.closest(".field");
    field.classList.remove("invalid");
    field.querySelector(".error").textContent = "";
}

function setStatus(message, type) {
    formStatus.textContent = message;
    formStatus.className = "form-status" + (type ? " " + type + "-msg" : "");
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/* ---------- Show / hide password ---------- */
togglePassword.addEventListener("click", function () {
    const showing = password.type === "text";

    password.type = showing ? "password" : "text";
    togglePassword.classList.toggle("fa-eye", showing);
    togglePassword.classList.toggle("fa-eye-slash", !showing);
    togglePassword.setAttribute("aria-label", showing ? "Show password" : "Hide password");
});

/* ---------- Remember me (saves the email only, never the password) ---------- */
try {
    const savedEmail = localStorage.getItem(REMEMBER_KEY);
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMe.checked = true;
    }
} catch (e) {
    // storage can be blocked in private windows; the page still works without it
}

/* ---------- Live validation ---------- */
emailInput.addEventListener("input", () => {
    clearFieldError(emailInput);
    setStatus("");
});

password.addEventListener("input", () => {
    clearFieldError(password);
    setStatus("");
});

emailInput.addEventListener("blur", () => {
    const value = emailInput.value.trim();
    if (value && !isValidEmail(value)) {
        showFieldError(emailInput, "Please enter a valid email address.");
    }
});

/* Warn if Caps Lock is on while typing the password */
password.addEventListener("keyup", (e) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
        setStatus("Caps Lock is on.");
    } else if (formStatus.textContent === "Caps Lock is on.") {
        setStatus("");
    }
});

/* ---------- Submit ---------- */
function validateForm() {
    let valid = true;
    const email = emailInput.value.trim();

    if (!email) {
        showFieldError(emailInput, "Email is required.");
        valid = false;
    } else if (!isValidEmail(email)) {
        showFieldError(emailInput, "Please enter a valid email address.");
        valid = false;
    }

    if (!password.value) {
        showFieldError(password, "Password is required.");
        valid = false;
    } else if (password.value.length < 6) {
        showFieldError(password, "Password must be at least 6 characters.");
        valid = false;
    }

    return valid;
}

function setLoading(isLoading) {
    signinBtn.disabled = isLoading;
    signinBtn.innerHTML = isLoading
        ? '<span class="spinner"></span>Signing in...'
        : "Sign In";
}

/* Replace this with your real login request (fetch to your backend) */
function loginRequest(email, pass) {
    return new Promise((resolve) => setTimeout(resolve, 1200));
}

form.addEventListener("submit", async function (e) {
    e.preventDefault();
    setStatus("");

    if (!validateForm()) {
        // put the cursor on the first field with a problem
        const firstInvalid = form.querySelector(".field.invalid input");
        if (firstInvalid) firstInvalid.focus();
        return;
    }

    const email = emailInput.value.trim();

    setLoading(true);

    try {
        await loginRequest(email, password.value);

        try {
            if (rememberMe.checked) {
                localStorage.setItem(REMEMBER_KEY, email);
            } else {
                localStorage.removeItem(REMEMBER_KEY);
            }
        } catch (err) {
            // ignore blocked storage
        }

        setStatus("Signed in successfully. (Demo: no server is connected yet.)", "success");
        // window.location.href = "dashboard.html";  // turn on once the dashboard page exists
    } catch (err) {
        setStatus("Something went wrong. Please try again.", "error");
    } finally {
        setLoading(false);
    }
});

/* ---------- Links and social buttons that are not connected yet ---------- */
document.querySelectorAll('a[href="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        setStatus(link.textContent.trim() + " is not available yet.");
    });
});

document.querySelectorAll(".social-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        setStatus(btn.dataset.provider + " sign-in is not connected yet.");
    });
});