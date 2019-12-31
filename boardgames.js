const express = require('express')
const boardgames = express.Router()

//connect to db
const { Client } = require('pg')
const client = new Client()
client.connect()

boardgames.get('/',(req, res, next) => {
    client.query('SELECT g.name game_name, p.name player_name, num_wins, num_losses, num_draws, elo FROM player_stat ps INNER JOIN game g ON ps.game_id=g.game_id INNER JOIN player p ON ps.player_id=p.player_id ORDER BY game_name DESC, elo DESC;', (err, result) => {
      if (err)
          next(err)
      else{
        console.log(result.rows)
        let games_stats = []
        result.rows.forEach(row => {
          let player_stat = {
            player_name: row.player_name,
            elo: row.elo,
            num_wins: row.num_wins,
            num_losses: row.num_losses,
            num_draws: row.num_draws,
            win_percentage: getWinPercentage(row.num_wins, row.num_losses, row.num_draws),
            plusminus: row.num_wins - row.num_losses
          }
          
          let game_stats = games_stats.find(gs => gs.game_name == row.game_name)
          
          if (!game_stats){
            games_stats.push({
              game_name: row.game_name,
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
  let name = req.body.name

  beginTransaction(() => {
    client.query('INSERT INTO player(name) VALUES($1) RETURNING player_id', [name], (err, result) => {
      if (err){
        console.error(err)
        res.send('Error on player insert')
        rollbackTransaction()
      } else{
        //get just inserted player_id
        let player_id = result.rows[0].player_id
        
        client.query('SELECT * FROM game;', (err, result) => {
          if (err){
            console.error(err)
            res.send('Error on game select')
            rollbackTransaction()
          } else if(result.rows.length <= 0){
            commitTransaction()
            res.redirect('/')
          } else{
            let games = result.rows;
            
            //construct query text
            let query_text = 'INSERT INTO player_stat(game_id, player_id, num_wins, num_losses, num_draws, elo) VALUES'
            games.forEach((game, i) => {query_text+=`($${i+2},$1,0,0,0,0)` + (i==games.length-1 ? ';':',')})
            
            console.log('query text: '+query_text)
            console.log('game_id: '+player_id)
            
            //construct values array
            let values = [player_id]
            games.forEach(game => values.push(game.game_id))
            console.log('values: ', values)
            
            client.query(query_text, values, (err, result) => {
              if (err){
                console.error(err)
                res.send('Error on player_stat insert')
                rollbackTransaction()
              } else{
                commitTransaction()
                res.redirect('/')
              }
            })
          }
        })
      }
    })
  })
})

boardgames.get('/games/new',(req, res) => {
  res.render('new_game', { title: "New Game", message: "Create a new game record"})
})
boardgames.post('/games/new',(req, res) => {
  console.log(req.body)
  insertGameRecord(res, {name: req.body.name, desc: req.body.desc})
  // beginTransaction(() => {
    // client.query('INSERT INTO game(name, description) VALUES($1, $2) RETURNING game_id', [name, desc], (err, result) => {
      // if (err){
        // console.error(err)
        // res.send('Error on game insert')
        // rollbackTransaction()
      // } else{
        // //get just inserted game_id
        // let game_id = result.rows[0].game_id
        
        // client.query('SELECT * FROM player;', (err, result) => {
          // if (err){
            // console.error(err)
            // res.send('Error on player select')
            // rollbackTransaction()
          // } else if(result.rows.length <= 0){
            // commitTransaction()
            // res.redirect('/')
          // } else{
            // let players = result.rows;
            
            // //construct query text
            // let query_text = 'INSERT INTO player_stat(game_id, player_id, num_wins, num_losses, num_draws, elo) VALUES'
            // players.forEach((player, i) => {query_text+=`($1,$${i+2},0,0,0,0)` + (i==players.length-1 ? ';':',')})
            
            // console.log('query text: '+query_text)
            // console.log('game_id: '+game_id)
            
            // //construct values array
            // let values = [game_id]
            // players.forEach(player => values.push(player.player_id))
            // console.log('values: ', values)
            
            // client.query(query_text, values, (err, result) => {
              // if (err){
                // console.error(err)
                // res.send('Error on player_stat insert')
                // rollbackTransaction()
              // } else{
                // commitTransaction()
                // res.redirect('/')
              // }
            // })
          // }
        // })
      // }
    // })
  // })

})

function getWinPercentage(wins, losses, draws){
  let num_games = wins + losses + draws
  return num_games ? (100*wins/num_games).toFixed(2)+'%' : "0%"
}

async function insertGameRecord(res, game){
  let result, game_id, players;
  
  //insert game record
  try{
    result = await client.query('INSERT INTO game(name, description) VALUES($1, $2) RETURNING game_id', [game.name, game.desc])
    game_id = result.rows[0].game_id
    console.log('game_id: ' + game_id)
  } catch(err){
    console.error(err)
    res.send('Error on game insert')    
  }
  
  //get all player records
  try{
    result = await client.query('SELECT * FROM player;')
    players = result.rows
    console.log(players)
  } catch(err){
    console.error(err)
    res.send('Error on player select')    
  }
  
  if (players.rows.length <= 0 ) return //no need to update player_stat records
  
  //insert player_stat records
  try{
    //construct query text
    let query_text = 'INSERT INTO player_stat(game_id, player_id, num_wins, num_losses, num_draws, elo) VALUES'
    players.forEach((player, i) => {query_text+=`($1,$${i+2},0,0,0,1000)` + (i==players.length-1 ? ';':',')})
    console.log('query text: '+query_text)
    
    //construct values array
    let values = [game_id]
    players.forEach(player => values.push(player.player_id))
    console.log('values: ', values)
    
    await client.query(query_text,values)
  } catch(err){
    console.error(err)
    res.send('Error on player_stat insert')    
  }
  
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