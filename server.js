require('dotenv').config()
const nodemailer = require('nodemailer')
const express = require('express')
const PORT = process.env.PORT || 8000


const app = express()

// set up sending email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
})

const mailheader = {
    to: 'usertestemail@gmail.com', // replace with the user's email
    subject: 'Ding dong! Your dryer is done!',
    text: 'It works!'
}

// transporter.sendMail(mailheader)
//     .then(() => console.log('Successfully sent mail!'))
//     .catch(err => console.error(err))

app.set('view engine', 'ejs')

app.get('/', (req, res) => {
    res.render('index')
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))