var config;
try {
    config = require('./config.js');
} catch (err) { // If there is no config file
    config = {};
}

var API = require('groupme').Stateless;
var express = require('express');
var path        = require('path');
var exphbs  = require('express-handlebars');

// Set express settings
var app = express();

app.set('views', __dirname + '/public');
app.use(express.static(__dirname + '/public'));
app.engine('hjs', exphbs());
app.set('view engine', 'hjs');


// Start the server
app.listen(process.env.PORT || 4000, function(){
    console.log("Node app is running. Better go catch it.");
});

// Handle main page requests
app.get('/', function(req, res) {
	var AT = req.query.access_token;
	return res.render('home', {GMAT: AT})});

// Handle main page requests
app.get('/login', function(req, res) {
  res.redirect('https://oauth.groupme.com/oauth/authorize?client_id=eZH5ubU8yf6CuQXQNcp3ZeqCGf9DWbd09XPdyysRlQi3IkRo');
});

app.get('/callback/', function(req, res) {
	var AT = req.query.access_token;
	console.log(AT)
	return res.render('callback', {GMAT: AT})
});

app.get('/home/', function(req, res) {
	var AT = req.query.access_token;
	return res.render('home', {GMAT: AT})
});

// Handle main page requests
app.get('/api/listgroups/', function(req, res) {
	var AT = req.query.access_token;
	var gID = req.query.gID;
	console.log(gID)
	API.Groups.index(AT, function(err,ret) {
		console.log(ret)
		return res.send(ret)
	})
});
// Handle main page requests
app.get('/api/getmessages/', function(req, res) {
	var AT = req.query.access_token;
	var gID = req.query.gID;
	var messages = [];
	var lastID;
	fetchMessages(res, AT, gID, lastID, messages);
});

function fetchMessages(res, AT, gID, lastID, messageArray) {
	var opts = {limit: 100};
	if (lastID) {
		opts.before_id = lastID;
	}

	API.Messages.index(AT, gID, opts, function(err,ret) {
		if (err) {console.log(err)}
		messageArray = messageArray.concat(minifyMessages(ret.messages));
		var max = ret.messages.length;
		lastID = ret.messages[max-1].id;
		console.log(lastID, messageArray.length)
		if (messageArray.length < (ret.count - 1)) {
			fetchMessages(res, AT, gID, lastID, messageArray);
		} else {
			console.log('done')
			console.log(messageArray[0])
			return res.send(generateStats(messageArray));
		}
	})
}

function minifyMessages(messages) {
	for (m in messages) {
		delete messages[m].avatar_url;
		delete messages[m].group_id;
		delete messages[m].sender_type;
		delete messages[m].source_guid;
	}
	return messages;
}

function generateStats(messages) {

    var stats = {};
    stats = {};
	var users = messages.map(function(m) {return m.user_id;}).filter(function(elem, index, self) {
        return index == self.indexOf(elem);
    });
    for (u in users) {
    	if (!stats[users[u]]) {stats[users[u]] = {};}
    	var user_comments = messages.filter(function(m) {return m.user_id == users[u]});
    	var sumlikes = 0;
    	for (c in user_comments) {
    		sumlikes += user_comments[c].favorited_by.length;
    	}
    	var user_name = user_comments[0].name;

    	stats[users[u]].numComments = user_comments.length;
    	stats[users[u]].numLikes = sumlikes;
    	stats[users[u]].userName = user_name;
    	stats[users[u]].user_id = user_comments[0].user_id;
    }

    var arrResp = [];
    for (key in stats) { if (stats.hasOwnProperty(key)) {
    	stats[key]
        arrResp.push(stats[key]);
    }}

    return arrResp;
}

API.Users.me(config.GMToken, function(err,ret) {
  if (!err) {
    console.log("Your user id is", ret.id, "and your name is", ret.name);        
  }
});