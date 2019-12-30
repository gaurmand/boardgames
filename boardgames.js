const express = require('express')
const boardgames = express.Router()

//connect to db
const { Client } = require('pg')
const client = new Client()
client.connect()

boardgames.get('/',(req, res, next) => {
    client.query('SELECT * FROM player_stat ORDER BY game DESC, elo DESC;', (err, result) => {
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
            win_percentage: getWinPercentage(row.num_wins, row.num_losses, row.num_draws),
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
        res.render('index', { title: "Leo's Board Game Corner", message: "Welcome to Leo's Board Game Corner", games_stats: games_stats})
      }
    })  
})

boardgames.get('/new',(req, res) => {res.send('New')})
boardgames.get('/delete',(req, res) => {res.send('Delete')})
boardgames.get('/update',(req, res) => {res.send('Update')})

function getWinPercentage(wins, losses, draws){
  let num_games = wins + losses + draws
  return num_games ? (100*wins/num_games).toFixed(2)+'%' : "0%"
}

module.exports = boardgames