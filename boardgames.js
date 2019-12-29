const express = require('express')
const boardgames = express.Router()

// middleware that is specific to this router
boardgames.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()}: Received ${req.method} request for ${req.originalUrl}: `)
  next()
})

// define the home page route
boardgames.get('/',(req, res) => {
  res.sendFile(__dirname+'/public/app/index.html')
})

boardgames.get('/new',(req, res) => {})
boardgames.get('/delete',(req, res) => {})
boardgames.get('/update',(req, res) => {})

module.exports = boardgames