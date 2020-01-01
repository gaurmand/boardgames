const express = require('express')
const boardgames = express.Router()

const elo_k = 32;

//connect to db
const { Client } = require('pg')
const client = new Client()
client.connect()

boardgames.get('/',(req, res, next) => {
    let select_query = 'SELECT g.name game_name, p.name player_name, num_wins, num_losses, num_draws, elo '
    let join_query = 'FROM player_stat ps INNER JOIN game g ON ps.game_id=g.game_id INNER JOIN player p ON ps.player_id=p.player_id '
    let order_query = 'ORDER BY game_name DESC, elo DESC;'
    
    client.query(select_query + join_query + order_query, (err, result) => {
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

boardgames.get('/matches/new',(req, res) => {
  renderNewMatchForm(res)
})

boardgames.post('/matches/new',(req, res) => {
  console.log(req.body)
  let match = {date: new Date(), game_id: req.body.game_id}
  
  let match_results = [{},{},{},{}]
  for (let [key, value] of Object.entries(req.body)) {
    let res = /player_id([0-9])/.exec(key)
    if(res){
      let index = parseInt(res[1])
      match_results[index].player_id = value
      continue
    }
    
    res = /result([0-9])/.exec(key)
    if(res){
      let index = parseInt(res[1])
      match_results[index].result = value
    }
  }
  
  console.log(match)
  console.log(match_results)
  
  match_results = match_results.filter(mr => mr.player_id && mr.result)
  console.log(match_results)
  
  if (match_results.length > 0)
    insertMatchRecord(res, match, match_results)
})

boardgames.get('/players/new',(req, res) => {
  res.render('new_player', { title: "New Player", message: "Create a new player record"})
})
boardgames.post('/players/new',(req, res) => {
  console.log(req.body)
  insertPlayerRecord(res, {name: req.body.name})
})

boardgames.get('/games/new',(req, res) => {
  res.render('new_game', { title: "New Game", message: "Create a new game record"})
})
boardgames.post('/games/new',(req, res) => {
  console.log(req.body)
  insertGameRecord(res, {name: req.body.name, desc: req.body.desc})
})

function getWinPercentage(wins, losses, draws){
  let num_games = wins + losses + draws
  return num_games ? (100*wins/num_games).toFixed(2)+'%' : "0%"
}

async function insertGameRecord(res, game){
  let result, game_id;
  
  if (await beginTransaction(res))
    return
  
  //insert game record
  try{
    result = await client.query('INSERT INTO game(name, description) VALUES($1, $2) RETURNING game_id', [game.name, game.desc])
    game_id = result.rows[0].game_id
    console.log('game_id: ' + game_id)
  } catch(err){
    console.error(err)
    rollbackTransaction()
    res.send('Error on game insert')
    return
  }
  
  //get all player records
  let players = await selectAll('player')
  if(!players){
    rollbackTransaction()
    res.send('Error on player select')
    return
  }
  
  if (players.length <= 0 ){ //no need to update player_stat records
    commitTransaction()
    res.redirect('/')
    return
  }

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
    rollbackTransaction()
    res.send('Error on player_stat insert')   
    return
  }
  
  commitTransaction()
  res.redirect('/')
}

async function insertPlayerRecord(res, player){
  let result, player_id;
  
  if (await beginTransaction(res))
    return
  
  //insert player record
  try{
    result = await client.query('INSERT INTO player(name) VALUES($1) RETURNING player_id', [player.name])
    player_id = result.rows[0].player_id
    console.log('player_id: ' + player_id)
  } catch(err){
    console.error(err)
    rollbackTransaction()
    res.send('Error on player insert')
    return
  }
  
  //get all game records
  let games = await selectAll('game')
  if(!games){
    rollbackTransaction()
    res.send('Error on game select')
    return
  }
  
  if (games.length <= 0 ){ //no need to update player_stat records
    commitTransaction()
    res.redirect('/')
    return
  }
    
  //insert player_stat records
  try{
    //construct query text
    let query_text = 'INSERT INTO player_stat(game_id, player_id, num_wins, num_losses, num_draws, elo) VALUES'
    games.forEach((game, i) => {query_text+=`($${i+2},$1,0,0,0,1000)` + (i==games.length-1 ? ';':',')})
    console.log('query text: '+query_text)
    
    //construct values array
    let values = [player_id]
    games.forEach(game => values.push(game.game_id))
    console.log('values: ', values)

    await client.query(query_text,values)
  } catch(err){
    console.error(err)
    rollbackTransaction()
    res.send('Error on player_stat insert')    
    return
  }
  
  commitTransaction()
  res.redirect('/')
}

async function renderNewMatchForm(res){
  let games = await selectAll('game')
  if(!games){
    res.send('Error on game select')
    return
  }
  
  let players = await selectAll('player')
  if(!players){
    res.send('Error on player select')
    return
  }
  
  res.render('new_match', { title: "New Match", message: "Create a new match record", games: games, players: players})
}

async function insertMatchRecord(res, match, match_results){
  let result, match_id, player_stats
  
  if (await beginTransaction(res))
    return

  //insert match record
  try{
    result = await client.query('INSERT INTO match(date, game_id) VALUES($1, $2) RETURNING match_id', [match.date, match.game_id])
    match_id = result.rows[0].match_id
    console.log('match_id: ' + match_id)
  } catch(err){
    console.error(err)
    rollbackTransaction()
    res.send('Error on match insert')
    return
  }
  
  //get player_stat records
  try{
    let player_ids = []
    match_results.forEach(mr => player_ids.push(mr.player_id))
    
    let query_player_ids = '('+player_ids.toString()+')'
    console.log('query_player_ids: '+ query_player_ids)
    
    result = await client.query(`SELECT player_id, elo FROM player_stat WHERE game_id=$1 AND player_id IN ${query_player_ids};`, [match.game_id])
    player_stats = result.rows
    console.log( player_stats)
  } catch(err){
    console.error(err)
    rollbackTransaction()
    res.send('Error on player_stat select')
    return
  }
  
  //set pre_elo fields
  match_results.forEach(mr => {
    let player_stat = player_stats.find(ps => ps.player_id == mr.player_id)
    mr.pre_elo = player_stat.elo
  })
  
  console.log(match_results)
  
  //calculate post_elo fields
  match_results.forEach(mr => {
    let other_elos = []
    match_results.forEach(mr2 => {
      if (mr2.player_id != mr.player_id)
        other_elos.push(mr2.pre_elo)
    })
    mr.post_elo = getNewElo(mr.pre_elo, other_elos, mr.result)
  })
  
  console.log(match_results)
  
  //insert match_result records
  try{
    //construct query text
    let query_text = 'INSERT INTO match_result(match_id, player_id, result, pre_elo, post_elo) VALUES'
    let values = [match_id]
    match_results.forEach((mr, i) => {
      query_text+=`($1,$${4*i+2},$${4*i+3},$${4*i+4},$${4*i+5})` + (i==match_results.length-1 ? ';':',')
      values = values.concat([mr.player_id, mr.result, mr.pre_elo, mr.post_elo])
    })
    console.log('query text: '+query_text)
    console.log('values: '+values)
    
    await client.query(query_text, values)
  } catch(err){
    console.error(err)
    rollbackTransaction()
    res.send('Error on match_result insert')    
    return
  }
  
  //update player_stat records
  try{
    for (let i=0; i<match_results.length; i++){
      let values = [match_results[i].post_elo, match.game_id, match_results[i].player_id]
      await client.query('UPDATE player_stat SET elo=$1 WHERE game_id=$2 AND player_id=$3', values)
    }
  } catch(err){
    console.error(err)
    rollbackTransaction()
    res.send('Error on player_stat update')    
    return
  }
  
  commitTransaction()
  res.redirect('/')
}

async function selectAll(table){
  let result, players
  try{
    result = await client.query(`SELECT * FROM ${table};`)
    return result.rows
  } catch(err){
    console.error(err)
    return null
  }
}

async function beginTransaction(res){
  try{
    await client.query('BEGIN')
  } catch (err){
    console.error(err)
    res.send('Error on begin transaction')
    return true    
  }
}

function rollbackTransaction(){
  client.query('ROLLBACK', err => {
    if (err)
      console.error(err)
  })
}

function commitTransaction(){
  client.query('COMMIT', err => {
    if (err)
      console.error(err)
  })
}

function getNewElo(old_elo, other_elos, result){
  let avg_comp_elo = 0
  other_elos.forEach(oelo => avg_comp_elo+=oelo)
  avg_comp_elo/=avg_comp_elo/other_elos.length
  
  let prob_winning = 1/(1+Math.pow(10,((avg_comp_elo-old_elo)/400)))
  
  let result_val;
  switch (result){
    case 'win': 
      result_val = 1
      break
    case 'loss': 
      result_val = 0
      break
    case 'draw': 
      result_val = 0.5
      break
    default:
      throw 'unknown match result'
  }
  
  let elo_change = elo_k*(result_val-prob_winning)
  let new_elo = old_elo + elo_change
  return Math.round(100*new_elo)/100
}

module.exports = boardgames