const express = require('express')
const boardgames = express.Router()

boardgames.get('/',(req, res) => {
  res.sendFile(__dirname+'/public/app/index.html')
})

boardgames.get('/new',(req, res) => {})
boardgames.get('/delete',(req, res) => {})
boardgames.get('/update',(req, res) => {})

module.exports = boardgames