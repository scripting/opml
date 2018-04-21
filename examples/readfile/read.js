const utils = require ("daveutils");
const opml = require ("daveopml");

const whenstart = new Date ();

opml.readOpmlFile ("states.opml", function (theOpml) {
	if (theOpml === undefined) {
		console.log ("There was an error reading the OPML file.");
		}
	else {
		console.log ("It took " + utils.secondsSince (whenstart) + " seconds to read and parse the feed.");
		console.log (utils.jsonStringify (theOpml));
		}
	});
