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
        let game_stats = {}
        result.rows.forEach(row => {
          game_stats[row.game] = {
            player: row.player,
            elo: row.elo,
            num_wins: row.num_wins,
            num_losses: row.num_losses,
            num_draws: row.num_draws,
            win_percentage: parseInt((100*row.num_wins/(row.num_wins+row.num_losses+row.num_draws)).toFixed(2)),
            plusminus: row.num_wins - row.num_losses
          }
        })
        console.log(game_stats)
        res.render('index', { title: "Leo's Board Game Corner", message: 'Game Stats', game_stats: game_stats})
      }
    })  
})

boardgames.get('/new',(req, res) => {})
boardgames.get('/delete',(req, res) => {})
boardgames.get('/update',(req, res) => {})

module.exports = boardgames