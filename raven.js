var request = require("request");

var Datastore = function(url) {
  this.url = url
  this.defaultDb = new Database(this)
}

var Database = function(datastore, name) {
  this.datastore = datastore
  this.name = name
}

Database.prototype.getUrl = function() { return this.datastore.url }
Database.prototype.getDocsUrl = function() { return this.getUrl() + '/docs/'}
Database.prototype.getDocUrl = function(id) { return this.getDocsUrl() + id }

Database.prototype.getCollections = function(cb) {
  request(this.getUrl() + '/terms/Raven/DocumentsByEntityName?field=Tag', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      if (cb) cb(null, JSON.parse(body))
    }
    else {
      if (cb) cb(error)
    }
  })
}

Database.prototype.saveDocument = function(collection, doc, cb) {
  // If not id provided, use POST to allow server-generated id
  // else, use PUT and use id in url
  var op = request.post
    , url = this.getDocsUrl()

  if (doc.id) {
    op = request.put
    url += doc.id
  }

	op({ 
    headers: {'Raven-Entity-Name': collection}, // TODO: skip this if no collection string passed in?
                                                // TODO: Add 'www-authenticate': 'NTLM' back into headers?
    uri: url,    
    json: doc 
    }, function(error, response, body) {

	  if (!error && response.statusCode == 201) { // 201 - Created
	    if (cb) cb(null, body)
	  }
    else {
      if (cb) {
        if (error) cb(error)
        else cb(new Error('Unable to create document: ' + response.statusCode + ' - ' + response.body))
      }
    }
	})
}

Database.prototype.getDocument = function(id, cb) {
  var url = this.getDocUrl(id)
  this.apiGetCall(url, cb)
}

// PATCH - Update

Database.prototype.deleteDocument = function(id, cb) {
  var url = this.getDocUrl(id)

  request.del(url, function(error, response, body) {
    if (!error && response.statusCode == 204) {  // 204 - No content
      if (cb) cb(null, (body && body.length > 0) ? JSON.parse(body) : null)
    } else {
      if (cb) {
        if (error) cb(error)
          else cb(new Error('Unable to delete document: ' + response.statusCode + ' - ' + response.body))
      }
    }
  })
}

Database.prototype.find = function(doc, cb) {
  this.dynamicQuery(doc, 0, 100, function(error, results) {
    var matches = results && results.Results ? results.Results : null
    cb(error, matches)
  })
}

Database.prototype.getDocsInCollection = function(collection, cb) {
  this.queryRavenDocumentsByEntityName(collection, 0, 100, function(error, results) {
    cb(error, results.Results)
  })
}

Database.prototype.getDocumentCount = function(collection, cb) {
  this.queryRavenDocumentsByEntityName(collection, 0, 0, function(error, results) {
    cb(error, results.TotalResults)
  })
}


Database.prototype.dynamicQuery = function(doc, start, count, cb) {
  var url = this.getUrl() + 'suggest/dynamic?query='
  for (prop in doc) {
    url += prop + ':' + doc[prop] + '+'
  }
  this.apiGetCall(url, cb)
}

Database.prototype.queryRavenDocumentsByEntityName = function(name, start, count, cb) {
  if (!start) start = 0
  if (!count) count = 0
  // if start and count aren't passed in, you'll just get the TotalResults property
  // and no results

  var url = this.getUrl() + '/indexes/Raven/DocumentsByEntityName?start=' + start + '&pageSize=' + count + '&aggregation=None'
  if (name && name.length > 0) url += '&query=Tag:' + name
  this.apiGetCall(url, cb)
}

Database.prototype.apiGetCall = function(url, cb) {
  request(url, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      if (cb) cb(null, JSON.parse(body))
    }
    else {
      if (cb) {
        if (error) cb(error)
        else cb(new Error('Error: ' + response.statusCode + ' - ' + body))
      }
    }
  })
}

module.exports = { 
  Database: Database,
  use: function(url) {
  return new Datastore(url)
  }
}