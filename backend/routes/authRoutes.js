const express = require("express");
const router = express.Router();
const { signup, login, getMe, logout } = require("../controllers/authController");

router.post(["/signup", "/auth/signup"], signup);
router.post(["/login", "/auth/login"], login);
router.get(["/me", "/auth/me"], getMe);
router.post(["/logout", "/auth/logout"], logout);

module.exports = router;
