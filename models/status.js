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
    }
})

module.exports = mongoose.model('Status', statusSchema)