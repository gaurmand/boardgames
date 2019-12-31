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

boardgames.get('/matches/new',(req, res) => {res.send('New match')})

boardgames.get('/players/new',(req, res) => {
    res.render('new_player', { title: "New Player", message: "Create a new player record"})
})
boardgames.post('/players/new',(req, res) => {
  console.log(req.body)
  insertRecord(res, 'INSERT INTO player(name) VALUES($1)', [req.body.name])
})

boardgames.get('/games/new',(req, res) => {
  res.render('new_game', { title: "New Game", message: "Create a new game record"})
})
boardgames.post('/games/new',(req, res) => {
  console.log(req.body)
  
  let name = req.body.name
  let desc = req.body.desc

  beginTransaction(() => {
    client.query('INSERT INTO game(name, description) VALUES($1, $2) RETURNING game_id', [name, desc], (err, result) => {
      if (err){
        console.error(err)
        res.send('Error on insert')
        rollbackTransaction()
      } else{
        client.query('SELECT * FROM player;', (err, result) => {
          if (err){
            console.error(err)
            res.send('Error on select')
            rollbackTransaction()
          } else{
            let players = result.rows;
            let query_text = 'INSERT INTO player_stat(game_id, player_id, num_wins, num_losses, num_draws, elo) VALUES'
            players.forEach((player, i) => {query_text+=`($${2*i+1},$${2*i+2},0,0,0,0)` + (i==players.length-1 ? ';':',')})
            
            console.log('query text: '+query_text)
            console.log('game_id: '+result)
            let values = []
          }
        })
      }
    }
  })

})

function getWinPercentage(wins, losses, draws){
  let num_games = wins + losses + draws
  return num_games ? (100*wins/num_games).toFixed(2)+'%' : "0%"
}

function insertRecord(res, queryText, values){
  client.query(queryText, values, (err, result) => {
    if (err){
      console.error(err)
      res.send('Error on insert')
    } else
      res.redirect('/')
  })
}

function performQuery(query_text, values, error, success){

}

function beginTransaction(next){
  client.query('BEGIN', err => {
    if (err)
      console.error(err)
    else
      next()
  })
}

function rollbackTransaction(next){
  client.query('ROLLBACK', err => {
    if (err)
      console.error(err)
    else if (next)
      next()
  })
}

function commitTransaction(next){
  client.query('COMMIT', err => {
    if (err)
      console.error(err)
    else if (next)
      next()
  })
}

module.exports = boardgames