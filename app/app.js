var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var exphbs  = require('express-handlebars');
var url = require('url');
var pg = require('pg');
var imgur = require('imgur-node-api');

var keys = require('./keys');
var conString = keys.postgres.url;
imgur.setClientID(keys.imgur.client_id);

server.listen(3000);

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use('/', express.static(__dirname + '/home'));

app.get('/collaboard/:word', function (req, res) {

  pg.connect(conString, function(err, client, done) {
    if(err) return console.error('error fetching client from pool', err);
    client.query('SELECT * FROM message_data WHERE room_id=' + req.params.word, function(err, result) {
      var query_string = 'SELECT * FROM files_data WHERE room_id=' + req.params.word;
      client.query(query_string, function(error, query_result){
        done();
        if(err) return console.error('error running query', err);
        console.log(result.rows);
        res.render("collaboard", {
          test: req.params.word,
          messages: result.rows
        });
      });
    });
  });
});

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('room', function (data) {
    u = url.parse(data.url);
    socket.path = u.path.split('/')[2];
    socket.user = data.name;
    socket.join(socket.path);
    io.to(socket.path).emit('joined', data.name + " joined!");

    // pg.connect(conString, function(err, client, done) {
    //   if(err) return console.error('error fetching client from pool', err);
    //   var query_string = 'SELECT * FROM drawing_data WHERE room_id=' + req.params.word;
    //   client.query(query_string, function(err, result) {
    //     done();
    //     if(err) return console.error('error running query', err);
    //     console.log(result.rows);
    //     result.rows.forEach(function(row){
    //       socket.emit('draw', row);
    //     });
    //   });
    // });
  });

  socket.on('message', function(msg){
    console.log('message: ' + msg);
    console.log("THE PATH:" + socket.path);
    if(!socket.path) return;
    pg.connect(conString, function(err, client, done) {
      if(err) return console.error('error fetching client from pool', err);
      var query_string = 'INSERT INTO message_data (room_id, message, sender) VALUES (' + socket.path + ', \'' + msg + '\', \'' + socket.user + '\');'
      console.log(query_string);
      client.query(query_string, function(err, result) {
        done();
        if(err) return console.error('error running query', err);
      });
    });
    io.to(socket.path).emit('message', msg);
  });

  socket.on('drawRequest', function(data){
    if(!socket.path) return;
    io.to(socket.path).emit('drawRequest', data);
  });

  socket.on('file', function(data){
    imgur.upload(data.file), function (err, res) {
      console.log(res.data.link);

      pg.connect(conString, function(err, client, done) {
        if(err) return console.error('error fetching client from pool', err);
        var query_string = 'INSERT INTO file_data (room_id, url) VALUES (' + socket.path + ', \'' + res.data.link + '\');'
        console.log(query_string);
        client.query(query_string, function(err, result) {
          done();
          io.to(socket.path).emit('file', {url:res.data.link, time:new Date()});
          if(err) return console.error('error running query', err);
        });
      });
    });
  });
});
