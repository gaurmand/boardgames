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
        let games_stats = []
        result.rows.forEach(row => {
          let player_stat = {
            player: row.player,
            elo: row.elo,
            num_wins: row.num_wins,
            num_losses: row.num_losses,
            num_draws: row.num_draws,
            win_percentage: parseInt((100*row.num_wins/(row.num_wins+row.num_losses+row.num_draws)).toFixed(2)),
            plusminus: row.num_wins - row.num_losses
          }
          
          let game_stats = games_stats.find(gs => gs.game == row.game)
          
          if (!game_stats){
            games_stats.push({
              game: row.game,
              stats: [player_stat]
            })
          } else{
            game_stats.stats.push(player_stat)
          }
        })
        console.log(games_stats)
        res.render('index', { title: "Leo's Board Game Corner", message: 'Game Stats', games_stats: games_stats})
      }
    })  
})

boardgames.get('/new',(req, res) => {res.send('New')})
boardgames.get('/delete',(req, res) => {res.send('Delete')})
boardgames.get('/update',(req, res) => {res.send('Update')})

module.exports = boardgames