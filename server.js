var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var exphbs = require('express-handlebars');
var Note = require('./models/Note.js');
var Article = require('./models/Article.js');
var request = require('request');
var cheerio = require('cheerio');

mongoose.Promise = Promise;

var app = express();

app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(express.static('public'));

app.engine('handlebars', exphbs({ defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

mongoose.connect('mongodb://localhost/newsScraper');
var db = mongoose.connection;

db.on('error', function(error) {
    console.log('Mongoose Error: ', error);
});

db.once('open', function() {
    console.log('Mongoose connection sccessful.');
});

//Routes
app.get('/', function(req, res) {
    Article.find({}, function(error, doc) {
        var hbsObject = {
            articles: doc
        };
        if (error) {
            console.log(error);
        }
        else {
            res.render('home', hbsObject);
        }
    });
});

app.get('/scrape', function(req, res) {
    request('http://www.statesman.com/sports/sports-columns/bDL84HyYnF2J6aY3cYEn0L/', function(error, response, html) {
        var $ = cheerio.load(html);

        $('.tiles.small-story-tiles .small-story-tile .tile-headline').each(function(i, element) {
            var result = {};


            result.title = $(this).children('a').text();
            result.link = $(this).children('a').attr('href');

            

            var entry = new Article(result);

    

            entry.save(function(err, doc) {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log(doc);
                }
            });
        });
        //res.send(result.length + 'articles scraped!');
    });
    res.send('articles scraped!');
});

app.post('/:id', function(req, res) {
    Article.findByIdAndUpdate(req.params.id, {saved:true}, function(err, newdoc) {
        if (err) {
            res.send(err);
        }
        else{
            res.redirect('/');
        }
    });
});


app.get("/articles", function(req, res) {
    Article.find({'saved': true }, function(error, doc) {
        var hbsObject = {
            articles: doc
        };
        if (error) {
            console.log(error);
        }
        else {
            res.render('index', hbsObject);
        }
    });
});

app.get('/articles/:id', function(req, res) {
    Article.findOne({'_id': req.params.id})
    .populate('note')
    .exec(function(error, doc) {
        var hbsNotes = {
            notes: doc
        };
        if (error) {
            console.log(error);
        }
        else{
            res.render('notes', hbsObject);
        }
    });
});

app.post('/articles/:id', function(req, res) {
    var newNote = new Note(req.body);

    newNote.save(function(error, doc) {
        if(error) {
            console.log(error);
        }
        else {
            Article.findOneAndUpdate({'_id': req.params.id}, {"note": doc._id})
            .exec(function(err, doc) {
                if(err) {
                    console.log(err);
                }
                else{
                    res.send(doc);
                }
            });
        }
    });
});


app.listen(3000, function() {
    console.log('App running on port 3000!');
});