### Reading OPML into a structure

This used to be part of <a href="https://github.com/scripting/pagePark">PagePark</a>, but it seems too useful to bury there. Now that I know how to create an <a href="https://www.npmjs.com/package/daveopml">NPM object</a>, this seemed a good thing to factor out. May a thousand JavaScript OPML apps bloom. 

<code>npm install daveopml</code>

If you have a question or comment, post an <a href="https://github.com/scripting/opml/issues">issue</a> in the repository.

Dave Winer

### Changes

5/9/22 by DW

We lost two versions, 0.4.6 and 0.4.7. They were in the GitHub repository, but the source we had was old. 

I was able to restore the changes. Basically one new interface routine was added, processOpmlSubscriptionList. 

I called the resulting version 0.4.8.

1/24/18 by DW

Added an optional flExpandIncludes param on readOpmlFile.

