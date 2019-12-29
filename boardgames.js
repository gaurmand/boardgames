const express = require('express')
const boardgames = express.Router()

//connect to db
const { Client } = require('pg')
const client = new Client()
client.connect()

boardgames.get('/',(req, res, next) => {
    client.query('SELECT * FROM player_stat;', (err, result) => {
      client.end()
      if (err)
          next(err)
      else{
        console.log(result.rows)
        res.render('index', { title: "Leo's Board Game Corner", message: 'coming soon' })
      }
    })  
})

boardgames.get('/new',(req, res) => {})
boardgames.get('/delete',(req, res) => {})
boardgames.get('/update',(req, res) => {})

module.exports = boardgames