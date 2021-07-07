// this is just a backup of the corresponding function in exerciseLog.js
//this solution uses elemMatch and therefore only returns the first match, not all (as desired)


router.get("/:id/logs", function (req, res, next) {
	let fromDate = req.query.from;
	let toDate = req.query.to;
	let queryLimit = req.query.limit;
	console.log(fromDate);
	console.log(toDate);
	console.log(queryLimit);

	// define projection to only select exercise from certain dates and only a certain number of exercises if the respective parameters are given in the query
	let projection = {};

	//could be prettier here to go through all the cases
	//why the hell does JS not support the creation of nested objects without literals?
	if ((fromDate) && (toDate)) {
		projection["log"] = {"$elemMatch": {"date": {"$gte": fromDate, "$lte": toDate}}};
	} else if (fromDate) {
		projection["log"] = {"$elemMatch": {"date": {"$gte": fromDate}}};
	} else if (toDate) {
		projection["log"] = {"$elemMatch": {"date": {"$lte": toDate}}};
	} 
	
	if (queryLimit) {
		//projection was not yet filled
		if (Object.keys(projection).length === 0) {
			projection["log"] = {"$slice": parseInt(queryLimit)};
		} else {
			projection["log"]["$slice"] = parseInt(queryLimit);
		}
	} 

	//console.log(projection);

	//check if any projection parameters were given, otherwise change projection to null so that findById ignores the projection (empty object leads to error)
	if (Object.keys(projection).length === 0) {
		projection = null;
	}
	
	User.findById(req.params.id, projection, function(err, user) {
		//findById returns an error if the id is not a valid id
		if (err) {
			console.log(err);
			return res.status(400).send("Invalid user id!");
		} 
		//A valid id might still not be connected to a user in the database
		if (!user) return res.json({});
		
		res.json({
			_id: user._id,
			username: user.username,
			count: user.log.length,
			log: user.log
		})
	});
});

