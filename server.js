require('dotenv').config()
const sendmail = require('./sendmail') // NOTE: call sendmail(header) to send email!
const express = require('express')
const app = express()
const userModel = require('./models/user')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const shortid = require('shortid')
const saltRounds = 10
const PORT = process.env.PORT || 8000

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to database.'))
    .catch(err => console.error(err))

// snippet for sending email:
// const mailheader = {
//     to: 'email@gmail.com', // replace with the user's email
//     subject: 'Ding dong! Your dryer/washer is done!',
//     text: 'It works!'
// }
// sendmail(mailheader)


app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }))

async function hashPassword(pass) {
    return await bcrypt.hash(pass, saltRounds)
}

app.get('/', (req, res) => {
    res.render('index')
})

app.post('/signup', async (req, res) => {
    await userModel.create(
        { name: req.body.name, 
          email: req.body.email, 
          password: await hashPassword(req.body.password)})
    // TODO: redirect user to their personal page (render user home page, passing user object)
    res.send('Signed up!')
})

app.post('/login', async (req, res) => {
    const user_info = await userModel.findOne({ email: req.body.email })
    if (!user_info) {
        // res.render('signup') TODO!
        return res.send('No user found. Sign up!')
    }
    const valid_pass = await bcrypt.compare(req.body.password, user_info.password)
    if (valid_pass) {
        res.send('Correct password!') // TODO: do something later (render login page with user details)
    } else {
        res.send('Wrong password!')
    }
})

app.get('/reset', (req, res) => {
    res.render('reset')
})

app.post('/reset', async (req, res) => {
    // clear all records of this email from the database
    // send them an email with a new randomly generated password (they can later change their password with /changepassword route -> TODO)
    const user_info = await userModel.findOneAndDelete({ email: req.body.email })
    if (user_info) {
        // user exists
        const user_email = user_info.email
        const random_pass = shortid.generate()
        await userModel.create({ name: user_info.name, 
                                 email: user_email, 
                                 password: await hashPassword(random_pass) })
        
        // send an email to user with their new password
        const mailheader = {
            to: user_email,
            subject: 'DryerisDone Password Reset',
            text: `Your password has been reset. You can log in to your account using your new password, which is ${random_pass}`
        }
        sendmail(mailheader)
        res.send('Password reset! Please check your junk inbox if you do not get an email within a few minutes.')
        // res.render('login') TODO!
    } else {
        // user does not exist, redirect them to sign up page!
        res.send('Sign up! Your account does not exist')
        // res.render('signup') TODO!!
    }
})


app.listen(PORT, () => console.log(`Server running on port ${PORT}`))