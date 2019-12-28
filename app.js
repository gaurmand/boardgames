const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
    console.log('Received request')
    res.sendFile(__dirname+'/public/app/index.html')
})

app.listen(port, () => console.log(`Listening on port ${port}!`))