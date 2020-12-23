const myProductName = "daveopml", myVersion = "0.4.7";   

exports.readOpmlString = readOpmlString;
exports.readOpmlFile = readOpmlFile;
exports.readOpmlUrl = readOpmlUrl;
exports.outlineVisiter = outlineVisiter;
exports.processOpmlSubscriptionList = processOpmlSubscriptionList; //12/23/20 AM by DW

const request = require ("request");
const stream = require ("stream"); //6/23/15 by DW
const opmlParser = require ("opmlparser"); //6/23/15 by DW
const fs = require ("fs"); //11/9/17 by DW


var opmlData = { 
	flUseOutlineCache: false,
	outlineCache: new Object (), 
	}

function getBoolean (val) { //12/5/13 by DW
	switch (typeof (val)) {
		case "string":
			if (val.toLowerCase () == "true") {
				return (true);
				}
			break;
		case "boolean":
			return (val);
		case "number":
			if (val == 1) {
				return (true);
				}
			break;
		}
	return (false);
	}
function getNameAtt (theNode) {
	function isAlpha (ch) {
		return (((ch >= 'a') && (ch <= 'z')) || ((ch >= 'A') && (ch <= 'Z')));
		}
	function isNumeric (ch) {
		return ((ch >= '0') && (ch <= '9'));
		}
	function stripMarkup (s) { //5/24/14 by DW
		if ((s === undefined) || (s == null) || (s.length == 0)) {
			return ("");
			}
		return (s.replace (/(<([^>]+)>)/ig, ""));
		}
	function innerCaseName (text) { //8/12/14 by DW
		var s = "", ch, flNextUpper = false;
		text = stripMarkup (text); 
		for (var i = 0; i < text.length; i++) {
			ch = text [i];
			if (isAlpha (ch) || isNumeric (ch)) { 
				if (flNextUpper) {
					ch = ch.toUpperCase ();
					flNextUpper = false;
					}
				else {
					ch = ch.toLowerCase ();
					}
				s += ch;
				}
			else {
				if (ch == ' ') { 
					flNextUpper = true;
					}
				}
			}
		return (s);
		}
	var nameatt = theNode.name;
	if (nameatt === undefined) {
		nameatt = innerCaseName (theNode.text);
		}
	return (nameatt);
	}
function getNodeType (theNode) {
	if (theNode.type == "include") {
		return (theNode.includetype); //this allows include nodes to have types
		}
	else {
		return (theNode.type);
		}
	}
function copyScalars (source, dest) { //8/31/14 by DW
	for (var x in source) { 
		var type, val = source [x];
		if (val instanceof Date) { 
			val = val.toString ();
			}
		type = typeof (val);
		if ((type != "object") && (type != undefined)) {
			dest [x] = val;
			}
		}
	}
function outlineVisiter (theOutline, inlevelcallback, outlevelcallback, nodecallback, visitcompletecallback, flStopAtDocs) {
	function readInclude (theIncludeNode, callback) {
		console.log ("readInclude: url == " + theIncludeNode.url);
		readOpmlUrl (theIncludeNode.url, function (theOutline) {
			if (theOutline === undefined) {
				callback (undefined);
				}
			else {
				expandIncludes (theOutline, function (expandedOutline) {
					callback (expandedOutline); 
					}, flStopAtDocs);
				}
			});
		}
	function typeIsDoc (theNode) {
		if (flStopAtDocs) {
			var type = getNodeType (theNode);
			return ((type !== undefined) && (type != "include") && (type != "link") && (type != "tweet"));
			}
		else {
			return (false);
			}
		}
	function doLevel (head, path, levelcompletecallback) {
		function doOneSub (head, ixsub) {
			if ((head.subs !== undefined) && (ixsub < head.subs.length)) {
				var sub = head.subs [ixsub], subpath = path + getNameAtt (sub);
				if (!getBoolean (sub.iscomment)) { 
					if ((sub.type == "include") && (!typeIsDoc (sub))) {
						nodecallback (sub, subpath);
						readInclude (sub, function (theIncludedOutline) {
							if (theIncludedOutline !== undefined) {
								doLevel (theIncludedOutline, subpath + "/", function () { 
									outlevelcallback ();
									doOneSub (head, ixsub +1);
									});
								}
							else { //6/25/15 by DW -- don't let errors derail us
								doOneSub (head, ixsub +1);
								}
							});
						}
					else {
						if (typeIsDoc (sub)) {
							if (sub.type == "index") {
								subpath += "/";
								}
							nodecallback (sub, subpath);
							doOneSub (head, ixsub +1);
							}
						else {
							nodecallback (sub, subpath);
							if (sub.subs !== undefined) {
								doLevel (sub, subpath + "/", function () { 
									outlevelcallback ();
									doOneSub (head, ixsub +1);
									});
								}
							else {
								doOneSub (head, ixsub +1);
								}
							}
						}
					}
				else {
					doOneSub (head, ixsub +1);
					}
				}
			else {
				levelcompletecallback ();
				}
			}
		inlevelcallback ();
		if (head.type == "include") {
			readInclude (head, function (theIncludedOutline) {
				if (theIncludedOutline !== undefined) {
					doOneSub (theIncludedOutline, 0);
					}
				});
			}
		else {
			doOneSub (head, 0);
			}
		}
	
	if (flStopAtDocs === undefined) { //7/15/15 by DW -- see note at top of routine
		flStopAtDocs = true;
		}
	
	doLevel (theOutline, "", function () {
		outlevelcallback ();
		visitcompletecallback ();
		});
	}
function expandIncludes (theOutline, callback, flStopAtDocs) {
	var theNewOutline = new Object (), lastNewNode = theNewOutline, stack = new Array (), currentOutline;
	function inlevelcallback () {
		stack [stack.length] = currentOutline;
		currentOutline = lastNewNode;
		if (currentOutline.subs === undefined) {
			currentOutline.subs = new Array ();
			}
		}
	function nodecallback (theNode, path) {
		var newNode = new Object ();
		copyScalars (theNode, newNode);
		currentOutline.subs [currentOutline.subs.length] = newNode;
		lastNewNode = newNode;
		}
	function outlevelcallback () {
		currentOutline = stack [stack.length - 1];
		stack.length--; //pop the stack
		}
	
	if (flStopAtDocs === undefined) { //7/15/15 by DW
		flStopAtDocs = true;
		}
	
	outlineVisiter (theOutline, inlevelcallback, outlevelcallback, nodecallback, function () {
		callback (theNewOutline);
		}, flStopAtDocs);
	}
function readOpmlString (s, callback, flExpandIncludes) {
	var opmlparser = new opmlParser ();
	var outlineArray = new Array ();
	var metadata = undefined;
	var flparseerror = false;
	var theStream = new stream.Readable ();
	theStream._read = function noop () {}; 
	theStream.push (s);
	theStream.push (null);
	theStream.pipe (opmlparser);
	
	opmlparser.on ("error", function (error) {
		console.log ("readOpmlString: opml parser error == " + error.message);
		if (callback != undefined) {
			callback (undefined, error);
			}
		flparseerror = true;
		});
	opmlparser.on ("readable", function () {
		var outline;
		while (outline = this.read ()) {
			var ix = Number (outline ["#id"]);
			outlineArray [ix] = outline;
			if (metadata === undefined) {
				metadata = this.meta;
				}
			}
		});
	opmlparser.on ("end", function () {
		if (flparseerror) {
			return;
			}
		var theOutline = new Object ();
		
		//copy elements of the metadata object into the root of the outline
			function copyone (name) {
				if (metadata !== undefined) { //3/11/18 by DW
					var val = metadata [name];
					if ((val !== undefined) && (val != null)) {
						theOutline [name] = val;
						}
					}
				}
			copyone ("title");
			copyone ("datecreated");
			copyone ("datemodified");
			copyone ("ownername");
			copyone ("owneremail");
			copyone ("description");
		
		for (var i = 0; i < outlineArray.length; i++) {
			var obj = outlineArray [i];
			if (obj != null) {
				var idparent = obj ["#parentid"], parent;
				if (idparent == 0) {
					parent = theOutline;
					}
				else {
					parent = outlineArray [idparent];
					}
				if (parent.subs === undefined) {
					parent.subs = new Array ();
					}
				parent.subs [parent.subs.length] = obj;
				delete obj ["#id"];
				delete obj ["#parentid"];
				}
			}
		
		if (flExpandIncludes === undefined) { //7/15/15 by DW
			flExpandIncludes = true;
			}
		if (flExpandIncludes) {
			expandIncludes (theOutline, function (expandedOutline) {
				if (callback != undefined) {
					callback (expandedOutline, undefined);
					}
				}, false);
			}
		else {
			if (callback != undefined) {
				callback (theOutline, undefined);
				}
			}
		});
	}
function readOpmlFile (f, callback, flExpandIncludes) {
	fs.readFile (f, function (err, data) {
		if (err) {
			console.log ("readOpmlFile: error reading file " + f + " == " + err.message)
			callback (undefined);
			}
		else {
			readOpmlString (data.toString (), callback, flExpandIncludes);
			}
		});
	}
function readOpmlUrl (urlOutline, callback, flExpandIncludes) { 
	if (flExpandIncludes === undefined) {
		flExpandIncludes = true;
		}
	request (urlOutline, function (err, response, body) {
		if (err !== null) {
			console.log ("readOpmlUrl: error reading file " + urlOutline + " == " + err.message)
			callback (undefined);
			}
		else {
			if (response.statusCode != 200) {
				console.log ("readOpmlUrl: error reading file, statusCode == " + response.statusCode + ", urlOutline == " + urlOutline)
				callback (undefined);
				}
			else {
				readOpmlString (body.toString (), callback, flExpandIncludes);
				}
			}
		});
	}
function processOpmlSubscriptionList (opmltext, flExpandIncludes, callback) { //12/21/20 by DW
	readOpmlString (opmltext, function (theOutline) {
		if (theOutline !== undefined) {
			var feedlist = new Array ();
			function getFeeds (theOutline) {
				if (theOutline.subs !== undefined) {
					for (var i = 0; i < theOutline.subs.length; i++) {
						var node = theOutline.subs [i];
						if (node.xmlurl !== undefined) {
							feedlist.push (node.xmlurl);
							}
						else {
							getFeeds (node);
							}
						}
					}
				}
			getFeeds (theOutline);
			callback (feedlist);
			}
		else {
			callback (undefined);
			}
		}, flExpandIncludes);
	}
