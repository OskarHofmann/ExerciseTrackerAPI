var express = require('express');
var app = express();
var router = express.Router();
var bodyParser = require('body-parser');
var mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useFindAndModify', false);

router.use(bodyParser.urlencoded({ extended: false }));

const exerciseSchema = new mongoose.Schema({
	description: String, 
	duration: Number, 
	date: {type: Date, default: Date.now}
})

const userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true
	},
	log: [exerciseSchema]
}, {
	versionKey: false
});

const Exercise = mongoose.model('exercise', exerciseSchema);
const User = mongoose.model('users', userSchema);

router.post("/", function(req, res, next) {
	let submittedUsername = req.body.username;
	User.create({username: submittedUsername}, function(err, user) {
		if (err) {
			return res.status(500).send('An error occured during user creation.');
		}
		res.json({username: user.username, _id: user._id});
	});
});


router.get("/", function(req, res, next) {
	let query = User.find({}).select("_id username");
	query.exec(function(err, users) {
		if (err) {
			console.log(err);
			return res.status(500).send('An error occured during data retrieval.');
		};
		res.json(users);
	});
});


router.post("/:id/exercises", function(req, res, next) {
	let exercise = new Exercise({
		description: req.body.description,
		duration: req.body.duration
		});
	//check if a date was provided, if so, add it to the document. Otherwise the dafault value Date.now will be used
	if (req.body.date) {
		exercise["date"] =  req.body.date;
	}

	User.findByIdAndUpdate(req.params.id, {$push: {log : exercise}}, {new: true, select: "_id username"}, function(err, user) {
		//findByIdAndUpdate returns an error if the id is not a valid id
		if (err) {
			console.log(err);
			return res.status(400).send("Invalid user id!");
		} 
		//A valid id might still not be connected to a user in the database
		if (!user) return res.json({});

		res.json({
			_id: user._id, 
			username: user.username, 
			date: exercise.date.toDateString(), 
			duration: exercise.duration, 
			description: exercise.description
		});
	});
});


router.get("/:id/logs", function (req, res, next) {
	let fromDate = req.query.from;
	let toDate = req.query.to;
	let queryLimit = req.query.limit;
	//console.log(fromDate);
	//console.log(toDate);
	//console.log(queryLimit);
	
	//build pipeline to select only the desired number of exercises that fit the from/to/limit criteria from the log
	//first find the user
	let pipeline = [
		{ $match: {
        "_id":  mongoose.Types.ObjectId(req.params.id)
    }}
		
	];

	//filter based on from argument
	if (fromDate) {
		pipeline.push(
			{
				$project: {
					log: {
						$filter: {
							input: "$log",
							cond: { $gte: [ "$$this.date", new Date(fromDate) ] }
						}
					}
				}
			}
		);
	}

	//filter based on to argument
	if (toDate) {
		pipeline.push(
			{	
				$project: {
					log: {
						$filter: {
							input: "$log",
							cond: { $lte: [ "$$this.date", new Date(toDate) ] }
						}
					}
				}
			}
		);
	}

	//filter based on limit argument
	if (queryLimit) {
		pipeline.push(
			{ 
				$project: { 
					log: { 
						$slice: [ "$log", parseInt(queryLimit) ] 
					}
				}
			}
		);
	}

	//do not show the ids of the individual exercises
	pipeline.push({ $unset: "log._id" });

	User.aggregate(pipeline).exec(function(err, result) {
		if (err) {
			console.log(err);
			return res.status(400).send("Invalid request!");
		} 

		//if the aggregation result is empty, return an empty JSON
		if (!result) return res.json({});
		//otherwise return the desired result
		let user = result[0]; //as we matched ids, there can only be one entry in the result array (if there is one as checked before)
		res.json({
			_id: user._id,
			username: user.username,
			count: user.log.length,
			log: user.log
		})
	});
	
});



module.exports = router;
