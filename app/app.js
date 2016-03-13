var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var exphbs  = require('express-handlebars');
var url = require('url');
var pg = require('pg');
var conString = "postgres://postgres:collab@localhost/collab";

server.listen(3000);

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use('/', express.static(__dirname + '/home'));

app.get('/collaboard/:word', function (req, res) {

  pg.connect(conString, function(err, client, done) {
    if(err) return console.error('error fetching client from pool', err);
    client.query('SELECT * FROM message_data WHERE room_id=' + req.params.word, function(err, result) {
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

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('room', function (data) {
    u = url.parse(data.url);
    socket.path = u.path.split('/')[2];
    socket.join(socket.path);
    io.to(socket.path).emit('joined', data.name + " joined!");
  });

  socket.on('message', function(msg){
    console.log('message: ' + msg);
    console.log("THE PATH:" + socket.path);
    if(!socket.path) return;
    pg.connect(conString, function(err, client, done) {
      if(err) return console.error('error fetching client from pool', err);
      var query_string = 'INSERT INTO message_data VALUES (' + socket.path + ', \'' + msg + '\');'
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
});

function pgFormatDate() {
  /* Via http://stackoverflow.com/questions/3605214/javascript-add-leading-zeroes-to-date */
  function zeroPad(d) {
    return ("0" + d).slice(-2)
  }

  var parsed = new Date();

  return [parsed.getUTCFullYear(), zeroPad(parsed.getMonth() + 1), zeroPad(parsed.getDate()), zeroPad(parsed.getHours()), zeroPad(parsed.getMinutes()), zeroPad(parsed.getSeconds())].join(" ");
}
