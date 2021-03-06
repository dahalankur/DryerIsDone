require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const sendmail = require('./sendmail')
const userModel = require('./models/user')
const statusModel = require('./models/status')
const bcrypt = require('bcrypt')
const shortid = require('shortid')
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session)

const SIX_WEEKS = 6 * 7 * 24 * 60 * 60 * 1000 // milliseconds
const SALTROUNDS = 10
const PORT = process.env.PORT || 8000
const app = express()

// https://www.npmjs.com/package/connect-mongodb-session
const store = new MongoDBStore(
    {
      uri: process.env.SESSION_URI,
      databaseName: process.env.SESSION_DB,
      collection: process.env.SESSION_COLLECTION
    },
    err => { if (err) console.error(err) })
  
store.on('error', err => {
    if (err) console.error(err)
})

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to database.'))
    .catch(err => console.error(err))


app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }))
app.use(fetchUserData)
app.use(session({
    secret: process.env.SESSION_SECRET,
    store: store,
    saveUninitialized: true,
    cookie: { maxAge: SIX_WEEKS },
    resave: false
}))


// TODO: debug mode only -> this is unsafe as any user can simply send a GET request to change the dryer/washer status //

app.get('/debugWasher', async (req, res) => {
    const status = await getStatusModel()
    status.washer_available = !status.washer_available
    await status.save()
    res.redirect('/')
})

app.get('/debugDryer', async (req, res) => {
    const status = await getStatusModel()
    status.dryer_available = !status.dryer_available
    await status.save()
    res.redirect('/')
})

//  ---------------------------------------  //

app.post('/pokeUser', (req, res) => {
    if (req.session.user_info) {
        const sender = req.body.my_name
        const receiver_email = req.body.email
        const machine_type = req.body.machine
        const email_subject = `${sender} has poked you!`
        const email_body = `${sender} wants to remind you to check on your ${machine_type}!`
        const mailheader = {
            to: receiver_email,
            from: 'DryerIsDone <dryerisdone123@gmail.com>',
            subject: email_subject,
            text: email_body
        }
        sendmail(mailheader)
        res.redirect('/')
    } else {
        res.render('index', { logged_in: false })
    }
})

app.post('/notifyUser', (req, res) => {
    if (req.session.user_info) {
        const email = req.body.email
        const machine = req.body.machine
        const email_subject = `${machine} Status Changed`
        const email_body = `Your ${machine} had been running for quite some time, so we have decided to make it available for other users. If this is an error, please go to the website and re-use the ${machine}.`
        const mailheader = {
            to: email,
            from: 'DryerIsDone <dryerisdone123@gmail.com>',
            subject: email_subject,
            text: email_body
        }
        sendmail(mailheader)
    } else {
        res.render('index', { logged_in: false })
    }
})

app.get('/useWasher', async (req, res) => {
    if (req.session.user_info) {
        const curr_status = await getStatusModel()
        // handle user-induced "race condition"
        if (!curr_status.washer_available) {
            console.error("not allowed!")
            return res.redirect('/') 
        }
        // the user who pressed the button is now set as the current user of the washer
        curr_status.washer_user_info = { name: req.session.user_info.name, email: req.session.user_info.email }
        curr_status.washer_start_time = Date.now()
        curr_status.washer_available = false
        await curr_status.save()
        // TODO: trigger something that starts a 60 min countdown to inform the user that their washer is probably done
        res.redirect('/')
    } else {
        res.render('index', { logged_in: false })
    }
})

app.get('/useDryer', async (req, res) => {
    if (req.session.user_info) {
        const curr_status = await getStatusModel()
        // handle user-induced "race condition"
        if (!curr_status.dryer_available) { 
            console.error("not allowed!")
            return res.redirect('/') 
        } 
        // the user who pressed the button is now set as the current user of the dryer
        curr_status.dryer_user_info = { name: req.session.user_info.name, email: req.session.user_info.email }
        curr_status.dryer_start_time = Date.now()
        curr_status.dryer_available = false
        await curr_status.save()
        // TODO: trigger something that starts a 90 min countdown to inform the user that their dryer is probably done
        res.redirect('/')
    } else {
        res.render('index', { logged_in: false })
    }
})

app.get('/', async (req, res) => {
    if (req.session.user_info) {
        const status = await getStatusModel()
        res.render('index', 
            { 
                user_info: req.session.user_info, 
                logged_in: true, 
                washer_available: status.washer_available, 
                dryer_available: status.dryer_available,
                washer_user_info: status.washer_user_info,
                dryer_user_info: status.dryer_user_info,
                washer_start_time: status.washer_start_time,
                dryer_start_time: status.dryer_start_time
            })
    } else {
        res.render('index', { logged_in: false })
    }
})

app.get('/login', (req, res) => {
    if (req.session.user_info) {
        res.redirect('/')
    } else {
        res.render('login')
    }
})

app.get('/signup', (req, res) => {
    if (req.session.user_info) {
        res.redirect('/')
    } else {
        res.render('signup')
    }
})

app.get('/changepass', (req, res) => {
    if (!req.session.user_info) {
        res.redirect('/')
    } else {
        res.render('changepassword', { user_info: req.session.user_info })
    }
})

app.get('/reset', (req, res) => {
    res.render('reset', { logged_in: req.session.user_info? true : false })
})

app.get('/logout', (req, res) => {
    if (req.session.user_info) {
        req.session.destroy(err => { if (err) console.error(err) })
    }
    res.redirect('/')
})

app.post('/signup', async (req, res) => {
    // check if user has already signed up with that email
    const user_info = req.user_info
    if (user_info) {
        return res.render('login', { msg: "User exists with that email, please log in instead.", email: user_info.email })
    }
    if (!req.session.user_info) {
        const user_name = req.body.name
        const user_email = req.body.email
        const user_password = req.body.password
        if (!user_email || !user_name || !user_password) return res.status(400).send('Insufficient information supplied')
        info = { name: user_name, email: user_email, password: await hashPassword(user_password) }
        await userModel.create(info)
        req.session.user_info = info // save user info in the session
    }
    res.redirect('/')
})

app.post('/login', async (req, res) => {
    const user_info = req.user_info
    if (!user_info) {
        return res.render('signup', { msg: "User does not exist, please create a new account." })
    }
    // check if user is already logged in
    if (req.session.user_info) {
        res.redirect('/')
    } else {
        const password = req.body.password
        if (!password) return res.status(400).send('No password entered')
        const valid_pass = await bcrypt.compare(password, user_info.password)
        if (valid_pass) {
            req.session.user_info = user_info
            res.redirect('/')
        } else {
            res.render('login', { email: user_info.email, msg: "Incorrect password." }) // pre-fill the form with their email
        }
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
            from: 'DryerIsDone <dryerisdone123@gmail.com>',
            subject: 'Account Reset Request',
            text: `Your password has been reset. You can log in to your account using your new password: ${random_pass}`
        }
        sendmail(mailheader)
        res.render('login', { msg: "Password has been reset. Please check your email for your new password." })
    } else {
        res.render('signup', { msg: "Account with that email address does not exist, please create a new account." })
    }
})

app.post('/changepass', async (req, res) => {
    const user_info = req.user_info
    if (!req.session.user_info) {
        res.redirect('/')
    } else {
        if (user_info) {
            const old_pass = req.body.password
            const new_pass = req.body.newpassword
            if (!old_pass || !new_pass) return res.status(400).send('Password not entered')
            const pass_isvalid = await bcrypt.compare(old_pass, user_info.password)
            if (pass_isvalid) {
                user_info.password = await hashPassword(new_pass)
                await user_info.save()
                res.redirect('/')
            } else {
                res.render('changepassword', { msg: "The password you entered is incorrect. Try again or reset your password.", user_info: req.session.user_info })
            }
        } else {
            res.render('signup', { msg: "Account does not exist. Please create a new account." })
        }
    }
})

// fetchUserData is a middleware that gets fired before all the routes
async function fetchUserData(req, res, next) {
    const user_info = await userModel.findOne({ email: req.body.email })
    req.user_info = user_info? user_info : null
    next()
}

// getStatusModel retrieves the washer and dryer status from the database
async function getStatusModel() {
    const status = await statusModel.find()
    return (status.length != 0)? status[0] : statusModel.create({}) // default is false/false
}

// hashPassword takes in a plaintext password `pass` and returns the hashed version of the password
function hashPassword(pass) {
    return bcrypt.hash(pass, SALTROUNDS)
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))