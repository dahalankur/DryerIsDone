require('dotenv').config()
const sendmail = require('./sendmail')
const express = require('express')
const userModel = require('./models/user')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const shortid = require('shortid')

const saltRounds = 10
const PORT = process.env.PORT || 8000
const app = express()

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
app.use(fetchUserData)

async function hashPassword(pass) {
    return await bcrypt.hash(pass, saltRounds)
}

app.get('/', (req, res) => {
    res.render('index')
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.get('/signup', (req, res) => {
    res.render('signup')
})

// TODO: send status codes in case of errors
app.post('/signup', async (req, res) => {
    // check if user has already signed up with that email
    const user_info = req.user_info
    if (user_info) {
        return res.send('User already exists! Reset your password or log in!')
    }
    await userModel.create(
        { name: req.body.name, 
          email: req.body.email, 
          password: await hashPassword(req.body.password) })
    // TODO: redirect user to their personal page (render user home page, passing user object)
    res.send('Signed up!')
})

// TODO: sanitize user input whenever data is read from the form
// also validate the input even if 'required' flag is set (check that all of email, password, name, new password, etc is supplied here as well)

app.post('/login', async (req, res) => {
    const user_info = req.user_info
    if (!user_info) {
        // res.render('signup') TODO!
        return res.send('No user found. Sign up!')
    }
    const valid_pass = await bcrypt.compare(req.body.password, user_info.password)
    if (valid_pass) {
        res.send('Correct password!')
        // res.render('login', { user: user_info }) TODO!
    } else {
        res.send('Wrong password!')
    }
})

app.get('/reset', (req, res) => {
    res.render('reset')
})

app.post('/reset', async (req, res) => {
    const user_info = req.user_info
    if (user_info) {
        const user_email = user_info.email
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
        // res.render('signup') TODO!!
    }
})

// /changepass needs an old password and new password fields
app.post('/changepass', async (req, res) => {
    const user_info = req.user_info
    if (user_info) {
        const pass_isvalid = await bcrypt.compare(req.body.password, user_info.password)
        if (pass_isvalid) {
            user_info.password = await hashPassword(req.body.newpassword) // NOTE: important! This is newpassword that is being hashed now
            await user_info.save()
            res.send('changed!')
        } else {
            res.send('Wrong password entered!')
        }
    } else {
        res.send('Sign up! Your account does not exist')
        // res.render('signup') TODO!!
    }
})

// fetchUserData is a middleware that gets fired before all the routes
async function fetchUserData(req, res, next) {
    const user_info = await userModel.findOne({ email: req.body.email })
    req.user_info = user_info? user_info : null
    next()
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))