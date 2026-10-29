// Shows a profile icon instead of "Get Started" when the user is logged in.
// The login page must save the user like this:
//   localStorage.setItem("urbanforge_user", JSON.stringify({ name: "...", email: "..." }));

// Everything is wrapped in (function () { ... })(); so the names below
// (init, styles, icons...) can't clash with other scripts on the page.
(function () {

const USER_KEY = "urbanforge_user";

function getUser() {
    try {
        const saved = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch (error) {
        return null;
    }
}

function signOut() {
    try {
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(USER_KEY);
    } catch (error) {}
    location.reload();
}

// ---- Sample login (the only account that works) ----
//   Email:    demo@urbanforge.com
//   Password: urbanforge123
const DEMO_ACCOUNT = { name: "Demo User", email: "demo@urbanforge.com", password: "urbanforge123" };

// Returns true and saves the user if the details match, otherwise returns false.
// Pass remember = true to stay signed in after the browser is closed.
function login(email, password, remember) {
    const emailOk = String(email).trim().toLowerCase() === DEMO_ACCOUNT.email;
    const passwordOk = password === DEMO_ACCOUNT.password;
    if (!emailOk || !passwordOk) return false;

    try {
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem(USER_KEY, JSON.stringify({ name: DEMO_ACCOUNT.name, email: DEMO_ACCOUNT.email }));
        return true;
    } catch (error) {
        return false;
    }
}

// other pages can call UrbanForgeAuth.login() / getUser() / signOut()
window.UrbanForgeAuth = { getUser, signOut, login, USER_KEY };

const styles = `
.uf-menu { position: relative; display: flex; align-items: center; flex-shrink: 0; }

.uf-avatar {
    width: 2.6rem; height: 2.6rem; display: grid; place-items: center; padding: 0;
    border: 2px solid rgba(80, 160, 255, .55); border-radius: 50%;
    background: linear-gradient(135deg, #278cff, #3437e9); color: #fff; cursor: pointer;
    box-shadow: 0 6px 20px rgba(27, 103, 255, .3);
    transition: transform .25s ease, box-shadow .25s ease;
}
.uf-avatar svg { width: 1.3rem; height: 1.3rem; }
.uf-avatar:hover, .uf-menu.open .uf-avatar { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(27, 103, 255, .5); }
.uf-avatar:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }

.uf-dropdown {
    position: absolute; right: 0; top: calc(100% + .8rem); z-index: 100; min-width: 15rem; padding: .5rem;
    border: 1px solid rgba(53, 142, 255, .45); border-radius: .9rem; background: #061630;
    box-shadow: 0 18px 45px rgba(0, 0, 0, .5);
    opacity: 0; visibility: hidden; transform: translateY(-8px) scale(.97); transform-origin: top right;
    transition: opacity .22s ease, transform .22s ease, visibility .22s ease;
}
.uf-menu.open .uf-dropdown { opacity: 1; visibility: visible; transform: none; }

.uf-head {
    display: flex; align-items: center; gap: .8rem; padding: .7rem .7rem .9rem; margin-bottom: .4rem;
    border-bottom: 1px solid rgba(60, 135, 220, .3);
}
.uf-initial {
    width: 2.5rem; height: 2.5rem; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%;
    background: linear-gradient(135deg, #278cff, #3437e9); color: #fff; font-size: 1.05rem; font-weight: 700;
}
.uf-who { min-width: 0; display: flex; flex-direction: column; gap: .15rem; }
.uf-who strong { color: #fff; font-size: .9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uf-who span { color: #8ea0ba; font-size: .75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.uf-dropdown .uf-item {
    width: 100%; display: flex; align-items: center; gap: .7rem; padding: .7rem; margin: 0; border: none;
    border-radius: .55rem; background: transparent; color: #e7edf9;
    font-family: inherit; font-size: .85rem; font-weight: 500; text-align: left; text-decoration: none; cursor: pointer;
    transition: background .2s ease, color .2s ease;
}
.uf-dropdown .uf-item svg { width: 1.1rem; height: 1.1rem; flex-shrink: 0; color: #4a9eff; }
.uf-dropdown .uf-item:hover { background: rgba(27, 124, 255, .18); color: #fff; }
.uf-dropdown .uf-signout:hover { background: rgba(255, 90, 106, .15); color: #ff8a96; }
.uf-dropdown .uf-signout:hover svg { color: #ff8a96; }
`;

const svgStart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

const icons = {
    user: svgStart + '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    dashboard: svgStart + '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    signout: svgStart + '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
};

function init() {
    const user = getUser();
    if (!user) return;                       // not logged in: leave "Get Started" as it is

    const header = document.querySelector("header");
    if (!header) return;

    const name = user.name || (user.email || "User").split("@")[0];
    const email = user.email || "";

    // use the dashboard link the navbar already has, so the path is always right
    const dashLink = header.querySelector('a[href$="dashboard.html"]');
    const dashboardHref = dashLink ? dashLink.getAttribute("href") : "dashboard.html";

    const style = document.createElement("style");
    style.textContent = styles;
    document.head.appendChild(style);

    // build the profile icon + dropdown
    const menu = document.createElement("div");
    menu.className = "uf-menu";
    menu.innerHTML = `
        <button type="button" class="uf-avatar" aria-haspopup="true" aria-expanded="false" aria-label="Open profile menu">${icons.user}</button>
        <div class="uf-dropdown" role="menu">
            <div class="uf-head">
                <span class="uf-initial"></span>
                <div class="uf-who"><strong></strong><span></span></div>
            </div>
            <a class="uf-item" role="menuitem" href="${dashboardHref}">${icons.dashboard}Dashboard</a>
            <button type="button" class="uf-item uf-signout" role="menuitem">${icons.signout}Sign out</button>
        </div>`;

    // textContent keeps the user's name/email from being treated as HTML
    menu.querySelector(".uf-initial").textContent = name.charAt(0).toUpperCase();
    menu.querySelector(".uf-who strong").textContent = name;
    menu.querySelector(".uf-who span").textContent = email;

    // swap the header's "Get Started" button for the profile icon
    header.querySelectorAll("a.nav-cta").forEach((button) => button.remove());   // mobile menu copy
    const buttons = header.querySelectorAll("a.cta, a.get-started");

    if (buttons.length > 0) {
        buttons[0].replaceWith(menu);
        buttons.forEach((button, i) => { if (i > 0) button.remove(); });
    } else {
        (header.querySelector(".navbar") || header).appendChild(menu);
    }

    // other "Get Started" links on the page now go to the dashboard
    document.querySelectorAll('a[href$="Login.html"]').forEach((link) => {
        if (header.contains(link)) return;
        link.setAttribute("href", dashboardHref);
        link.textContent = link.classList.contains("btn") ? "Go to Dashboard" : "Dashboard";
    });

    // open / close the dropdown
    const avatar = menu.querySelector(".uf-avatar");

    function setOpen(open) {
        menu.classList.toggle("open", open);
        avatar.setAttribute("aria-expanded", String(open));
    }

    avatar.addEventListener("click", (e) => {
        e.stopPropagation();
        setOpen(!menu.classList.contains("open"));
    });
    document.addEventListener("click", (e) => {
        if (!menu.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setOpen(false);
    });
    menu.querySelector(".uf-signout").addEventListener("click", signOut);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

})();