const express = require('express')
const app = express()
const PORT = 3000

const boardgames = require('./boardgames')
app.use('/boardgames', boardgames)

app.listen(PORT, () => console.log(`Listening on port ${PORT}!`))