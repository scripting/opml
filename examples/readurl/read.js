const utils = require ("daveutils");
const opml = require ("daveopml");

const urlOpmlFile = "http://scripting.com/states.opml";
const whenstart = new Date ();

opml.readOpmlUrl (urlOpmlFile, function (theOpml) {
	if (theOpml === undefined) {
		console.log ("There was an error reading the OPML file.");
		}
	else {
		console.log ("It took " + utils.secondsSince (whenstart) + " seconds to read and parse the file.");
		console.log (utils.jsonStringify (theOpml));
		}
	});
