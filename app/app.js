var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var exphbs  = require('express-handlebars');
var url = require('url');
var pg = require('pg');

server.listen(3000);

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.get('/app/:word', function (req, res) {
  res.render("home", {
    test: req.params.word
  });

  var conString = "postgres://azureuser@localhost/collab";

  pg.connect(conString, function(err, client, done) {
    if(err) {
      return console.error('error fetching client from pool', err);
    }
    client.query('SELECT $1::int AS number', ['1'], function(err, result) {
      //call `done()` to release the client back to the pool
      done();

      if(err) {
        return console.error('error running query', err);
      }
      console.log(result.rows[0].number);
      //output: 1
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