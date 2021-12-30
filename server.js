require('dotenv').config()
const sendmail = require('./sendmail') // NOTE: call sendmail(header) to send email!
const express = require('express')
const app = express()
const userModel = require('./models/user')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
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

app.get('/', (req, res) => {
    res.render('index')
})

app.post('/signup', async (req, res) => {
    await userModel.create(
        { name: req.body.name, 
          email: req.body.email, 
          password: await bcrypt.hash(req.body.password, saltRounds)})
    // TODO: redirect user to their personal page (render user home page, passing user object)
    res.send('Signed up!')
})

app.post('/login', async (req, res) => {
    const user_info = await userModel.findOne({ email: req.body.email })
    const valid_pass = await bcrypt.compare(req.body.password, user_info.password)
    if (valid_pass) {
        res.send('Correct password!') // TODO: do something later (render login page with user details)
    } else {
        res.send('Wrong password!')
    }
})


app.listen(PORT, () => console.log(`Server running on port ${PORT}`))