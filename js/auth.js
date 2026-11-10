(function () {
    "use strict";

    const USER_KEY = "urbanforge_user";

    // Dynamic backend base URL:
    // If loaded from Express (port 3000), uses relative URLs.
    // If loaded from Live Server (port 5500, 5173, etc.) or file://, uses http://localhost:3000
    function getApiBase() {
        if (typeof window !== "undefined" && window.location && window.location.port === "3000") {
            return "";
        }
        return "http://localhost:3000";
    }

    // --------------------------------------------------
    // USER STORAGE (CLIENT CACHE)
    // --------------------------------------------------

    function getUser() {
        try {
            const saved =
                localStorage.getItem(USER_KEY) ||
                sessionStorage.getItem(USER_KEY);

            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            return null;
        }
    }

    function saveUser(user, remember = true) {
        const publicUser = {
            id: user.id || "",
            name: user.name || "User",
            email: user.email || "",
            createdAt: user.createdAt || ""
        };

        try {
            localStorage.removeItem(USER_KEY);
            sessionStorage.removeItem(USER_KEY);

            const storage = remember ? localStorage : sessionStorage;
            storage.setItem(USER_KEY, JSON.stringify(publicUser));

            return true;
        } catch (error) {
            return false;
        }
    }

    function clearUser() {
        try {
            localStorage.removeItem(USER_KEY);
            sessionStorage.removeItem(USER_KEY);
        } catch (error) {
            console.error("Could not clear user storage:", error);
        }
    }

    // Helper to safely parse responses from the server
    async function parseApiResponse(response) {
        let text = "";
        try {
            text = await response.text();
            const data = JSON.parse(text);
            return { ok: response.ok, status: response.status, data };
        } catch (err) {
            console.warn("Non-JSON server response:", text);
            return {
                ok: response.ok,
                status: response.status,
                data: {
                    message: response.status === 404
                        ? "API endpoint not found (404). Please ensure the Express server is running on http://localhost:3000."
                        : `Server error (${response.status}): ${text.substring(0, 100) || "Empty response"}`
                }
            };
        }
    }

    // --------------------------------------------------
    // LOGIN — CONNECTED TO THE EXPRESS BACKEND
    // --------------------------------------------------

    async function login(email, password, remember = true) {
        try {
            const endpoint = getApiBase() + "/api/auth/login";
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    email: String(email).trim(),
                    password: String(password)
                })
            });

            const parsed = await parseApiResponse(response);
            const data = parsed.data || {};

            if (!parsed.ok) {
                return {
                    success: false,
                    message: data.message || `Login failed (HTTP ${parsed.status}).`
                };
            }

            if (!data.user) {
                return {
                    success: false,
                    message: "The server returned an invalid response."
                };
            }

            saveUser(data.user, remember);

            return {
                success: true,
                user: data.user,
                message: data.message || "Login successful."
            };
        } catch (error) {
            console.error("Login fetch error:", error);
            return {
                success: false,
                message: "Cannot connect to server at http://localhost:3000. Please start the server by double-clicking start-server.bat."
            };
        }
    }

    // --------------------------------------------------
    // SIGNUP — SAVES USER DATA TO BACKEND data/users.json
    // --------------------------------------------------

    async function signup(name, email, password) {
        try {
            const endpoint = getApiBase() + "/api/auth/signup";
            console.log(`Sending signup request to: ${endpoint}`);

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    name: String(name || "").trim(),
                    email: String(email || "").trim(),
                    password: String(password || "")
                })
            });

            const parsed = await parseApiResponse(response);
            const data = parsed.data || {};

            if (!parsed.ok) {
                return {
                    success: false,
                    message: data.message || `Could not create your account (HTTP ${parsed.status}).`
                };
            }

            if (!data.user) {
                return {
                    success: false,
                    message: "The server returned an invalid response."
                };
            }

            saveUser(data.user, true);

            return {
                success: true,
                user: data.user,
                message: data.message || "Account created successfully."
            };
        } catch (error) {
            console.error("Signup fetch error:", error);
            return {
                success: false,
                message: "Cannot connect to server at http://localhost:3000. Please start the server by double-clicking start-server.bat."
            };
        }
    }

    // --------------------------------------------------
    // SIGN OUT — DESTROY SERVER SESSION
    // --------------------------------------------------

    async function signOut() {
        try {
            const endpoint = getApiBase() + "/api/auth/logout";
            await fetch(endpoint, {
                method: "POST",
                credentials: "include"
            });
        } catch (error) {
            console.error("Logout request error:", error);
        }

        clearUser();
        const homeUrl = window.location.pathname.includes("/pages/") ? "../index.html" : "index.html";
        window.location.href = homeUrl;
    }

    // --------------------------------------------------
    // PROFILE DROPDOWN STYLES
    // --------------------------------------------------

    const styles = `
        .uf-menu {
            position: relative;
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }

        .uf-avatar {
            width: 2.6rem;
            height: 2.6rem;
            display: grid;
            place-items: center;
            padding: 0;
            border: 2px solid rgba(80, 160, 255, .55);
            border-radius: 50%;
            background: linear-gradient(135deg, #278cff, #3437e9);
            color: #fff;
            cursor: pointer;
            box-shadow: 0 6px 20px rgba(27, 103, 255, .3);
            transition: transform .25s ease, box-shadow .25s ease;
        }

        .uf-avatar svg {
            width: 1.3rem;
            height: 1.3rem;
        }

        .uf-avatar:hover,
        .uf-menu.open .uf-avatar {
            transform: translateY(-2px);
            box-shadow: 0 10px 26px rgba(27, 103, 255, .5);
        }

        .uf-avatar:focus-visible {
            outline: 2px solid #fff;
            outline-offset: 3px;
        }

        .uf-dropdown {
            position: absolute;
            right: 0;
            top: calc(100% + .8rem);
            z-index: 1000;
            min-width: 15rem;
            padding: .5rem;
            border: 1px solid rgba(53, 142, 255, .45);
            border-radius: .9rem;
            background: #061630;
            box-shadow: 0 18px 45px rgba(0, 0, 0, .5);
            opacity: 0;
            visibility: hidden;
            transform: translateY(-8px) scale(.97);
            transform-origin: top right;
            transition:
                opacity .22s ease,
                transform .22s ease,
                visibility .22s ease;
        }

        .uf-menu.open .uf-dropdown {
            opacity: 1;
            visibility: visible;
            transform: none;
        }

        .uf-head {
            display: flex;
            align-items: center;
            gap: .8rem;
            padding: .7rem .7rem .9rem;
            margin-bottom: .4rem;
            border-bottom: 1px solid rgba(60, 135, 220, .3);
        }

        .uf-initial {
            width: 2.5rem;
            height: 2.5rem;
            flex-shrink: 0;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: linear-gradient(135deg, #278cff, #3437e9);
            color: #fff;
            font-size: 1.05rem;
            font-weight: 700;
        }

        .uf-who {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: .15rem;
        }

        .uf-who strong {
            color: #fff;
            font-size: .9rem;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .uf-who span {
            color: #8ea0ba;
            font-size: .75rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .uf-dropdown .uf-item {
            width: 100%;
            display: flex;
            align-items: center;
            gap: .7rem;
            padding: .7rem;
            margin: 0;
            border: none;
            border-radius: .55rem;
            background: transparent;
            color: #e7edf9;
            font-family: inherit;
            font-size: .85rem;
            font-weight: 500;
            text-align: left;
            text-decoration: none;
            cursor: pointer;
            transition: background .2s ease, color .2s ease;
        }

        .uf-dropdown .uf-item svg {
            width: 1.1rem;
            height: 1.1rem;
            flex-shrink: 0;
            color: #4a9eff;
        }

        .uf-dropdown .uf-item:hover {
            background: rgba(27, 124, 255, .18);
            color: #fff;
        }

        .uf-dropdown .uf-signout:hover {
            background: rgba(255, 90, 106, .15);
            color: #ff8a96;
        }

        .uf-dropdown .uf-signout:hover svg {
            color: #ff8a96;
        }
    `;

    // --------------------------------------------------
    // SVG ICONS
    // --------------------------------------------------

    const svgStart =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
        'aria-hidden="true">';

    const icons = {
        user:
            svgStart +
            '<circle cx="12" cy="8" r="4"/>' +
            '<path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>' +
            '</svg>',

        build:
            svgStart +
            '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>' +
            '<polyline points="3.27 6.96 12 12.01 20.73 6.96"/>' +
            '<line x1="12" y1="22.08" x2="12" y2="12"/>' +
            '</svg>',

        signout:
            svgStart +
            '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>' +
            '<path d="M16 17l5-5-5-5M21 12H9"/>' +
            '</svg>'
    };

    // --------------------------------------------------
    // PROFILE MENU & SESSION RENDERING
    // --------------------------------------------------

    function init() {
        const header = document.querySelector("header");
        if (!header) return;

        if (header.querySelector(".uf-menu")) return;

        const style = document.createElement("style");
        style.id = "urbanforge-auth-styles";
        style.textContent = styles;
        document.head.appendChild(style);

        const cta = header.querySelector("a.nav-cta, a.cta, a.get-started");
        checkSessionAndRender(header, cta);
    }

    async function checkSessionAndRender(header, cta) {
        let user = null;

        try {
            const endpoint = getApiBase() + "/api/auth/me";
            const response = await fetch(endpoint, {
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                user = data.user || null;
            }
        } catch (error) {
            // Server might not be running or unauthenticated
        }

        if (!user) {
            clearUser();
            return;
        }

        saveUser(user, true);
        renderProfile(header, cta, user);
    }

    function renderProfile(header, cta, user) {
        const name = user.name || (user.email || "User").split("@")[0];
        const email = user.email || "";
        const isPagesDir = window.location.pathname.includes("/pages/");
        const buildHref = isPagesDir ? "main.html" : "/pages/main.html";

        const menu = document.createElement("div");
        menu.className = "uf-menu";

        menu.innerHTML = `
            <button
                type="button"
                class="uf-avatar"
                aria-haspopup="true"
                aria-expanded="false"
                aria-label="Open profile menu"
            >${icons.user}</button>

            <div class="uf-dropdown" role="menu">
                <div class="uf-head">
                    <span class="uf-initial"></span>
                    <div class="uf-who">
                        <strong></strong>
                        <span></span>
                    </div>
                </div>

                <a class="uf-item" role="menuitem"
                   href="${buildHref}">
                    ${icons.build}Start Building
                </a>

                <button type="button"
                    class="uf-item uf-signout"
                    role="menuitem">
                    ${icons.signout}Sign out
                </button>
            </div>
        `;

        // Set user values
        menu.querySelector(".uf-initial").textContent = name.charAt(0).toUpperCase();
        menu.querySelector(".uf-who strong").textContent = name;
        menu.querySelector(".uf-who span").textContent = email;

        // Replace desktop and mobile CTA buttons
        const ctas = header.querySelectorAll("a.nav-cta, a.cta, a.get-started");

        if (ctas.length > 0) {
            ctas[0].replaceWith(menu);
            ctas.forEach((button, index) => {
                if (index > 0) button.remove();
            });
        } else {
            const targetNav = header.querySelector("nav") || header.querySelector(".navbar") || header;
            targetNav.appendChild(menu);
        }

        // Redirect other login links to the 3D builder
        document.querySelectorAll('a[href$="Login.html"]').forEach(link => {
            if (header.contains(link)) return;

            link.setAttribute("href", buildHref);
            link.textContent = link.classList.contains("btn")
                ? "Start Building"
                : "Build";
        });

        const avatar = menu.querySelector(".uf-avatar");
        const dropdown = menu.querySelector(".uf-dropdown");

        function setOpen(open) {
            menu.classList.toggle("open", open);
            avatar.setAttribute("aria-expanded", String(open));
        }

        avatar.addEventListener("click", event => {
            event.stopPropagation();
            setOpen(!menu.classList.contains("open"));
        });

        document.addEventListener("click", event => {
            if (!menu.contains(event.target)) {
                setOpen(false);
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                setOpen(false);
                avatar.focus();
            }
        });

        menu.querySelector(".uf-signout").addEventListener("click", signOut);
    }

    window.UrbanForgeAuth = {
        getUser,
        saveUser,
        clearUser,
        signOut,
        login,
        signup,
        getApiBase,
        USER_KEY
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
