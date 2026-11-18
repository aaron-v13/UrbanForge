const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const { getDbStatus } = require("../config/db");
const { readUsers, writeUsers } = require("../services/fileStorage");

function sanitizeUser(user) {
    return {
        id: (user.id || user._id || "").toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
    };
}

async function signup(req, res) {
    try {
        const { name, email, password } = req.body || {};

        if (!email || typeof email !== "string" || !email.trim()) {
            return res.status(400).json({ success: false, message: "Email address is required." });
        }

        if (!password || typeof password !== "string" || password.length < 4) {
            return res.status(400).json({ success: false, message: "Password must be at least 4 characters long." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email address." });
        }

        const userName = (name && typeof name === "string" && name.trim().length > 0)
            ? name.trim()
            : normalizedEmail.split("@")[0];

        const hashedPassword = await bcrypt.hash(password, 10);
        const useMongo = getDbStatus();

        if (useMongo) {
            const existingUser = await User.findOne({ email: normalizedEmail });
            if (existingUser) {
                return res.status(409).json({ success: false, message: "An account with this email already exists." });
            }

            const newUser = await User.create({
                name: userName,
                email: normalizedEmail,
                password: hashedPassword
            });

            req.session.userId = newUser._id.toString();
            return res.status(201).json({
                success: true,
                message: "Account created and saved in MongoDB!",
                user: sanitizeUser(newUser)
            });
        } else {
            // File-based fallback
            const users = await readUsers();
            const existingUser = users.find(u => u.email === normalizedEmail);
            if (existingUser) {
                return res.status(409).json({ success: false, message: "An account with this email already exists." });
            }

            const newUser = {
                id: crypto.randomUUID ? crypto.randomUUID() : `usr_${Date.now()}`,
                name: userName,
                email: normalizedEmail,
                password: hashedPassword,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            await writeUsers(users);

            req.session.userId = newUser.id;
            return res.status(201).json({
                success: true,
                message: "Account created and saved in users.json!",
                user: sanitizeUser(newUser)
            });
        }
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ success: false, message: "Signup failed due to a server error." });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body || {};

        if (!email || !password || typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ success: false, message: "Both email and password are required." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const useMongo = getDbStatus();
        let user = null;

        if (useMongo) {
            user = await User.findOne({ email: normalizedEmail });
        }

        // If not found in MongoDB or MongoDB not active, check file storage
        if (!user) {
            const users = await readUsers();
            user = users.find(u => u.email === normalizedEmail);
        }

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        req.session.userId = (user.id || user._id).toString();

        res.json({
            success: true,
            message: "Login successful.",
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Login failed due to a server error." });
    }
}

async function getMe(req, res) {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ success: false, message: "Not logged in." });
        }

        const useMongo = getDbStatus();
        let user = null;

        if (useMongo && mongoose.Types.ObjectId.isValid(req.session.userId)) {
            user = await User.findById(req.session.userId);
        }

        if (!user) {
            const users = await readUsers();
            user = users.find(u => (u.id || "").toString() === req.session.userId || (u._id || "").toString() === req.session.userId);
        }

        if (!user) {
            req.session.destroy(() => {});
            return res.status(401).json({ success: false, message: "User account not found." });
        }

        res.json({
            success: true,
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error("Session error:", error);
        res.status(500).json({ success: false, message: "Could not check login status." });
    }
}

function logout(req, res) {
    req.session.destroy(error => {
        if (error) {
            return res.status(500).json({ success: false, message: "Logout failed." });
        }
        res.clearCookie("connect.sid");
        res.json({ success: true, message: "Logged out successfully." });
    });
}

module.exports = { signup, login, getMe, logout };
