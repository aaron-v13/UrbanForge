const express = require("express");
const router = express.Router();
const { getBuildings, addBuilding, deleteBuilding } = require("../controllers/cityController");

router.get("/buildings", getBuildings);
router.post("/buildings", addBuilding);
router.delete("/buildings/:buildingId", deleteBuilding);

module.exports = router;
