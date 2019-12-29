const express = require('express')
const app = express()
const PORT = 3000

//set pug as templating engine
app.set('views', './views')
app.set('view engine', 'pug')

// middleware that logs request
app.use((req, res, next) => {
  console.log(`[LOG] ${new Date().toLocaleTimeString()}: Received ${req.method} request for ${req.originalUrl} (${req.protocol}://${req.hostname}) `)
  next()
})

const boardgames = require('./boardgames')
app.use('/boardgames', boardgames)

app.get('/', (req, res) => res.send('Requewt for root'))

app.listen(PORT, () => console.log(`Listening on port ${PORT}!`))