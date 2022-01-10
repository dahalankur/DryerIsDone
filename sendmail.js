const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: false,
    requireTLS: true,
    from: 'dryerisdone123@gmail.com',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
})

function sendmail(mailheader) {
    transporter.sendMail(mailheader)
        .then(() => console.log('Successfully sent mail!'))
        .catch(err => console.error(err))
}

module.exports = sendmail