const mongoose = require('mongoose')

const statusSchema = new mongoose.Schema({
    washer_available: {
        type: Boolean,
        required: true,
        default: false
    }, 
    dryer_available: {
        type: Boolean,
        required: true,
        default: false
    }, 
    washer_user_info: {
        name: {
            type: String,
            default: "-",
            required: true
        },
        email: {
            type: String,
            default: "-",
            required: true
        }
    },
    dryer_user_info: {
        name: {
            type: String,
            default: "-",
            required: true
        },
        email: {
            type: String,
            default: "-",
            required: true
        }
    },
    washer_start_time: {
        type: Date,
        required: true,
        default: Date.now()
    },
    dryer_start_time: {
        type: Date,
        required: true,
        default: Date.now()
    }
})
module.exports = mongoose.model('Status', statusSchema)