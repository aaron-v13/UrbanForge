const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------- PATHS --------------------
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

// -------------------- CORS & HEADERS MIDDLEWARE --------------------
// Allows requests from VS Code Live Server (port 5500/5501), Vite (5173), file://, or port 3000
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
        res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// -------------------- LOGGING MIDDLEWARE --------------------
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// -------------------- BODY PARSERS --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------- SESSION HANDLING --------------------
app.use(
    session({
        secret: process.env.SESSION_SECRET || "urbanforge-secret-key-2026",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: false, // Set to true when configured for HTTPS
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days session
        }
    })
);

// -------------------- JSON FILE STORAGE HELPERS --------------------

/**
 * Ensures data/users.json exists and contains a valid array.
 */
async function ensureUsersFile() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
        await fs.access(USERS_FILE);
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await fs.writeFile(USERS_FILE, "[]", "utf8");
    }
}

/**
 * Reads users from data/users.json.
 */
async function readUsers() {
    await ensureUsersFile();

    try {
        const content = await fs.readFile(USERS_FILE, "utf8");
        const trimmed = content.trim();
        if (!trimmed) {
            await fs.writeFile(USERS_FILE, "[]", "utf8");
            return [];
        }
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Error reading users.json, reinitializing safely:", error.message);
        await fs.writeFile(USERS_FILE, "[]", "utf8");
        return [];
    }
}

/**
 * Saves users into data/users.json.
 */
async function writeUsers(data) {
    await ensureUsersFile();
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2), "utf8");
}

// Helper to sanitize user object for client responses (removes password hash)
function sanitizeUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
    };
}

// -------------------- AUTH CONTROLLERS --------------------

/**
 * Handles user signup / registration.
 * Saves user details (email and bcrypt-hashed password) into data/users.json.
 */
async function handleSignup(req, res) {
    try {
        console.log("[SIGNUP PAYLOAD]:", req.body);
        const { name, email, password } = req.body || {};

        if (!email || typeof email !== "string" || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email address is required."
            });
        }

        if (!password || typeof password !== "string" || password.length < 4) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 4 characters long."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address (e.g. user@example.com)."
            });
        }

        // Fallback for name if left blank
        const userName = (name && typeof name === "string" && name.trim().length > 0)
            ? name.trim()
            : normalizedEmail.split("@")[0];

        const users = await readUsers();

        const existingUser = users.find(
            user => user.email === normalizedEmail
        );

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists. Please sign in."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const now = new Date().toISOString();

        const newUser = {
            id: crypto.randomUUID ? crypto.randomUUID() : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: userName,
            email: normalizedEmail,
            password: hashedPassword,
            createdAt: now
        };

        users.push(newUser);
        await writeUsers(users);

        console.log(`[SUCCESS] Saved new user "${normalizedEmail}" to ${USERS_FILE}`);
        console.log(`[TOTAL USERS NOW]: ${users.length}`);

        // Set session
        req.session.userId = newUser.id;

        res.status(201).json({
            success: true,
            message: "Account created successfully! Your data is saved.",
            user: sanitizeUser(newUser)
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({
            success: false,
            message: "Signup failed due to a server error. Please try again."
        });
    }
}

/**
 * Handles user sign in / authentication.
 * Checks credentials against data/users.json.
 */
async function handleLogin(req, res) {
    try {
        console.log("[LOGIN ATTEMPT]:", req.body?.email);
        const { email, password } = req.body || {};

        if (!email || !password || typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({
                success: false,
                message: "Both email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const users = await readUsers();

        const user = users.find(
            item => item.email === normalizedEmail
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Set session
        req.session.userId = user.id;

        console.log(`[SUCCESS] User "${normalizedEmail}" logged in.`);

        res.json({
            success: true,
            message: "Login successful.",
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Login failed due to a server error. Please try again."
        });
    }
}

/**
 * Handles checking the current logged-in user's session.
 */
async function handleMe(req, res) {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: "Not logged in."
            });
        }

        const users = await readUsers();
        const user = users.find(item => item.id === req.session.userId);

        if (!user) {
            req.session.destroy(() => {});
            return res.status(401).json({
                success: false,
                message: "User account not found."
            });
        }

        res.json({
            success: true,
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error("Session check error:", error);
        res.status(500).json({
            success: false,
            message: "Could not check login status."
        });
    }
}

/**
 * Handles signing out the user by destroying their session.
 */
function handleLogout(req, res) {
    req.session.destroy(error => {
        if (error) {
            console.error("Logout error:", error);
            return res.status(500).json({
                success: false,
                message: "Logout failed."
            });
        }

        res.clearCookie("connect.sid");
        res.json({
            success: true,
            message: "Logged out successfully."
        });
    });
}

// -------------------- AUTH DIRECT ROUTES --------------------
// Registered on both /api/auth/* and /api/* to support all client fetch patterns
app.post(["/api/auth/signup", "/api/signup", "/signup"], handleSignup);
app.post(["/api/auth/login", "/api/login", "/login"], handleLogin);
app.get(["/api/auth/me", "/api/me", "/me"], handleMe);
app.post(["/api/auth/logout", "/api/logout", "/logout"], handleLogout);

// -------------------- API 404 HANDLER (RETURNS JSON) --------------------
app.all("/api/{*path}", (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint ${req.method} ${req.url} not found.`
    });
});

// -------------------- STATIC FILES (served AFTER API routes) --------------------
// Must come after all API routes so POST /api/auth/signup isn't intercepted
app.use(express.static(__dirname));

// -------------------- CATCH-ALL ROUTE --------------------
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// -------------------- GLOBAL ERROR HANDLER (RETURNS JSON) --------------------
app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error"
    });
});

// -------------------- START SERVER --------------------
ensureUsersFile()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`=======================================================`);
            console.log(` UrbanForge Express Server Running!`);
            console.log(` Local URL: http://localhost:${PORT}`);
            console.log(` Users JSON file: ${USERS_FILE}`);
            console.log(`=======================================================`);
        });
    })
    .catch(error => {
        console.error("Could not initialize users JSON file:", error);
        process.exit(1);
    });
