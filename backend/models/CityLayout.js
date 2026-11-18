const mongoose = require("mongoose");

const CityLayoutSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true
        },
        cityName: {
            type: String,
            default: "My Metropolis"
        },
        cityData: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("CityLayout", CityLayoutSchema);
