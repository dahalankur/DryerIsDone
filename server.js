require('dotenv').config()
const sendmail = require('./sendmail')
const express = require('express')
const userModel = require('./models/user')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const shortid = require('shortid')
const cookieParser = require('cookie-parser')
const sessions = require('express-session')

const TWELVE_HOURS = 12 * 60 * 60 * 1000 // milliseconds
const SALTROUNDS = 10
const PORT = process.env.PORT || 8000
const app = express()
const session_options = {
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    cookie: { maxAge: TWELVE_HOURS },
    resave: false 
}

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
app.use(cookieParser());
app.use(sessions(session_options))
app.use(fetchUserData)


async function hashPassword(pass) {
    return await bcrypt.hash(pass, SALTROUNDS)
}

// TODO: figure out a way to manage authorization for certain routes (like changepass should only be accessible when a user is logged in, etc.)
app.get('/', (req, res) => {
    if (req.session.user_info) 
        res.send(`Welcome ${req.session.user_info.name}.`) // send them personalized page with logout link
    else 
        res.render('index')
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.get('/signup', (req, res) => {
    res.render('signup')
})

app.get('/changepass', (req, res) => {
    res.render('changepassword')
})

app.get('/reset', (req, res) => {
    res.render('reset')
})

app.get('/logout', (req, res) => {
    req.session.destroy()
    res.send('Logged out')
    // TODO: clear the cookies and destroy session, then redirect to home page / login page
})

// TODO: add session stuff here
app.post('/signup', async (req, res) => {
    // check if user has already signed up with that email
    const user_info = req.user_info
    if (user_info) {
        return res.send('User already exists! Reset your password or log in!')
    }
    const user_name = req.body.name
    const user_email = req.body.email
    const user_password = req.body.password
    if (!user_email || !user_name || !user_password) return res.status(400).send('Insufficient information supplied')
    await userModel.create(
        { name: user_name, 
          email: user_email, 
          password: await hashPassword(user_password) })
    // TODO: redirect user to their personal page (render user home page, passing user object)
    res.send('Signed up!')
})

// TODO: worried about parallel requests to the server. How does session handle that? investigate. There was something about using redis store (or sth), check that out.

app.post('/login', async (req, res) => {
    const user_info = req.user_info
    if (!user_info) {
        // res.render('signup') TODO!
        return res.send('No user found. Sign up!')
    }
    const password = req.body.password
    if (!password) return res.status(400).send('No password entered')
    const valid_pass = await bcrypt.compare(password, user_info.password)
    if (valid_pass) {
        req.session.user_info = user_info
        res.send('Correct password!')
        // res.render('login', { user: user_info }) TODO!
    } else {
        res.send('Wrong password!')
    }
})

app.post('/reset', async (req, res) => {
    const user_info = req.user_info
    if (user_info) {
        const user_email = user_info.email
        if (!user_email) return res.status(400).send('No email entered')
        const random_pass = shortid.generate()
        user_info.password = await hashPassword(random_pass)
        await user_info.save()
        
        // send an email to user with their new password
        const mailheader = {
            to: user_email,
            subject: 'DryerisDone Password Reset',
            text: `Your password has been reset. You can log in to your account using your new password: ${random_pass}`
        }
        sendmail(mailheader)
        res.send('Password reset! Please check your junk inbox if you do not get an email within a few minutes.')
        // res.render('login', { user: user_info }) TODO!
    } else {
        res.send('Sign up! Your account does not exist')
    }
})

// /changepass needs an old password and new password fields
app.post('/changepass', async (req, res) => {
    const user_info = req.user_info
    if (user_info) {
        const old_pass = req.body.password
        const new_pass = req.body.newpassword
        if (!old_pass || !new_pass) return res.status(400).send('Password not entered')
        const pass_isvalid = await bcrypt.compare(old_pass, user_info.password)
        if (pass_isvalid) {
            user_info.password = await hashPassword(new_pass)
            await user_info.save()
            res.send('changed!')
        } else {
            res.send('Wrong password entered!')
        }
    } else {
        res.send('Sign up! Your account does not exist')
    }
})

// fetchUserData is a middleware that gets fired before all the routes
async function fetchUserData(req, res, next) {
    const user_info = await userModel.findOne({ email: req.body.email })
    req.user_info = user_info? user_info : null
    next()
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))