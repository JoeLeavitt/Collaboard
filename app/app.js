var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var exphbs  = require('express-handlebars');
var url = require('url');
var pg = require('pg');

server.listen(3000);

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use('/', express.static(__dirname + '/home'));

app.get('/collaboard/:word', function (req, res) {
  res.render("home", {
    test: req.params.word
  });

  var conString = "postgres://postgres:collab@localhost/collab";

  pg.connect(conString, function(err, client, done) {
    if(err) {
      return console.error('error fetching client from pool', err);
    }
    client.query('SELECT * FROM message_data WHERE room_id=' + req.params.word, function(err, result) {
      //call `done()` to release the client back to the pool
      done();

      if(err) {
        return console.error('error running query', err);
      }
      console.log(result.rows);
    });
  });
});

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('room', function (data) {
    u = url.parse(data.url);
    console.log(u.path);
    socket.join(u.path);
    io.to(u.path).emit('joined', data.name + " joined!");
    socket.path = u.path;
  });

  socket.on('message', function(msg){
    console.log('message: ' + msg);
    console.log("THE PATH:" + socket.path);
    io.to(socket.path).emit('message', msg);
  });

  socket.on('drawRequest', function(data){
    io.to(socket.path).emit('drawRequest', data);
  });
});
