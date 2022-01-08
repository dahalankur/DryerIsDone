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
    }//, 
    // user_info: {
    //     type: {
    //         name: {
    //             type: String,
    //             required: true
    //         },
    //         email: {
    //             type: String,
    //             required: true
    //         }
    //     },
    //     required: true,
    //     default: null
    // }
})
module.exports = mongoose.model('Status', statusSchema)