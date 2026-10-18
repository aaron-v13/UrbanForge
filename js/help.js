/* Only hide things for the scroll animation once this script is running,
   so the page is never left blank if the script fails to load. */
document.documentElement.classList.add("js");

/* ---------- Helpers ---------- */
const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

/* ---------- Navbar: shadow on scroll + mobile menu ---------- */
const navbar = document.getElementById("navbar");
const menuToggle = document.getElementById("menuToggle");
const toTop = document.getElementById("toTop");

function onScroll() {
    navbar.classList.toggle("scrolled", window.scrollY > 10);
    toTop.classList.toggle("show", window.scrollY > 500);
}

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

function setMenu(open) {
    navbar.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menuToggle.firstElementChild.className = open ? "fa-solid fa-xmark" : "fa-solid fa-bars";
}

menuToggle.addEventListener("click", () => setMenu(!navbar.classList.contains("open")));

document.querySelectorAll("#navLinks a").forEach((a) => {
    a.addEventListener("click", () => setMenu(false));
});

document.addEventListener("click", (e) => {
    if (!navbar.contains(e.target)) setMenu(false);
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
});

toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

/* ---------- Scroll reveal animations ---------- */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        el.classList.add("visible");
        revealObserver.unobserve(el);

        // once finished, hand control back to the normal hover styles
        setTimeout(() => {
            el.classList.remove("reveal", "visible");
            el.style.transitionDelay = "";
        }, 1400);
    });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((el) => {
    const index = Array.from(el.parentElement.children).indexOf(el);
    el.style.transitionDelay = Math.min(index, 5) * 0.1 + "s";
    revealObserver.observe(el);
});

/* ---------- Light that follows the mouse on the form card ---------- */
const formCard = document.getElementById("formCard");

formCard.addEventListener("mousemove", (e) => {
    const rect = formCard.getBoundingClientRect();
    formCard.style.setProperty("--mx", e.clientX - rect.left + "px");
    formCard.style.setProperty("--my", e.clientY - rect.top + "px");
});

/* ---------- Contact form ---------- */

// To really receive messages, put your form service URL here,
// for example a Formspree link: "https://formspree.io/f/xxxxxxxx".
// While this is empty the form only pretends to send (demo mode).
const FORM_ENDPOINT = "";

const form = document.getElementById("contactForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const subjectInput = document.getElementById("subject");
const messageInput = document.getElementById("message");
const privacyInput = document.getElementById("privacy");
const honeypot = document.getElementById("website");
const counter = document.getElementById("counter");
const sendBtn = document.getElementById("sendBtn");
const formStatus = document.getElementById("formStatus");
const sendAnother = document.getElementById("sendAnother");

const MIN_MESSAGE = 10;

function showError(input, message) {
    const field = input.closest(".field");
    field.classList.add("invalid");
    field.querySelector(".error").textContent = message;

    // restart the shake animation
    field.classList.remove("shake");
    void field.offsetWidth;
    field.classList.add("shake");
}

function clearError(input) {
    const field = input.closest(".field");
    field.classList.remove("invalid", "shake");
    field.querySelector(".error").textContent = "";
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validate() {
    let firstBad = null;
    const fail = (input, message) => {
        showError(input, message);
        if (!firstBad) firstBad = input;
    };

    const name = nameInput.value.trim();
    if (!name) fail(nameInput, "Please enter your name.");
    else if (name.length < 2) fail(nameInput, "Name is too short.");

    const email = emailInput.value.trim();
    if (!email) fail(emailInput, "Please enter your email.");
    else if (!isValidEmail(email)) fail(emailInput, "Please enter a valid email address.");

    if (!subjectInput.value) fail(subjectInput, "Please choose a subject.");

    const message = messageInput.value.trim();
    if (!message) fail(messageInput, "Please write a message.");
    else if (message.length < MIN_MESSAGE) fail(messageInput, "Message must be at least " + MIN_MESSAGE + " characters.");

    if (!privacyInput.checked) fail(privacyInput, "Please accept the privacy policy.");

    if (firstBad) firstBad.focus();
    return !firstBad;
}

[nameInput, emailInput, subjectInput, messageInput, privacyInput].forEach((input) => {
    const eventName = input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input";
    input.addEventListener(eventName, () => {
        clearError(input);
        formStatus.textContent = "";
        formStatus.classList.remove("error-msg");
    });
});

emailInput.addEventListener("blur", () => {
    const value = emailInput.value.trim();
    if (value && !isValidEmail(value)) showError(emailInput, "Please enter a valid email address.");
});

// Show the chosen subject in white instead of grey
subjectInput.addEventListener("change", () => subjectInput.classList.add("chosen"));

// Live character counter
messageInput.addEventListener("input", () => {
    const length = messageInput.value.length;
    const max = messageInput.maxLength;
    counter.textContent = length + " / " + max;
    counter.classList.toggle("near", length >= max - 50);
});

function setLoading(loading) {
    sendBtn.disabled = loading;
    sendBtn.innerHTML = loading
        ? '<span class="spinner"></span><span class="btn-label">Sending...</span>'
        : '<i class="fa-regular fa-paper-plane"></i><span class="btn-label">Send Message</span><i class="fa-solid fa-arrow-right"></i>';
}

function sendMessage(data) {
    if (!FORM_ENDPOINT) {
        // demo mode: wait a moment and report success
        return new Promise((resolve) => setTimeout(resolve, 1300));
    }

    return fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
    }).then((response) => {
        if (!response.ok) throw new Error("Request failed");
    });
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formStatus.textContent = "";
    formStatus.classList.remove("error-msg");

    if (!validate()) return;

    // A filled honeypot means a bot: pretend it worked and drop the message
    if (honeypot.value) {
        formCard.classList.add("sent");
        return;
    }

    setLoading(true);

    try {
        await sendMessage({
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            subject: subjectInput.value,
            message: messageInput.value.trim()
        });

        formCard.classList.add("sent");
        form.reset();
        subjectInput.classList.remove("chosen");
        counter.textContent = "0 / " + messageInput.maxLength;
        counter.classList.remove("near");
    } catch (err) {
        formStatus.textContent = "Something went wrong. Please try again or email us directly.";
        formStatus.classList.add("error-msg");
    } finally {
        setLoading(false);
    }
});

sendAnother.addEventListener("click", () => {
    formCard.classList.remove("sent");
    nameInput.focus();
});

/* ---------- Map zoom buttons ---------- */
const mapCanvas = document.getElementById("mapCanvas");
const zoomIn = document.getElementById("zoomIn");
const zoomOut = document.getElementById("zoomOut");

const ZOOM_MIN = 1;
const ZOOM_MAX = 2.2;
const ZOOM_STEP = 0.3;
let zoom = 1;

function applyZoom() {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
    mapCanvas.style.setProperty("--zoom", zoom);
    zoomIn.disabled = zoom >= ZOOM_MAX - 0.001;
    zoomOut.disabled = zoom <= ZOOM_MIN + 0.001;
}

zoomIn.addEventListener("click", () => { zoom += ZOOM_STEP; applyZoom(); });
zoomOut.addEventListener("click", () => { zoom -= ZOOM_STEP; applyZoom(); });
applyZoom();

/* ---------- Links that do not go anywhere yet ---------- */
document.querySelectorAll('a[href="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const label = link.getAttribute("aria-label") || link.textContent.trim();
        showToast(label + " link coming soon.");
    });
});

/* ---------- Footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();