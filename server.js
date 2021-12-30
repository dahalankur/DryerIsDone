const express = require('express')
const PORT = process.env.PORT || 8000
const app = express()

app.set('view engine', 'ejs')

app.get('/', (req, res) => {
    res.render('index')
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))