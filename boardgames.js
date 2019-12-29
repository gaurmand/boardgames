const express = require('express')
const boardgames = express.Router()

boardgames.get('/',(req, res) => {
  res.render('index', { title: "Leo's Board Game Corner", message: 'coming soon' })
})

boardgames.get('/new',(req, res) => {})
boardgames.get('/delete',(req, res) => {})
boardgames.get('/update',(req, res) => {})

module.exports = boardgames