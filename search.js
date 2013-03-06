
var searchIdCounter = 0;
function search(query, callback) {
  var searchId = ++searchIdCounter;
  var words = (literals[query] || []).slice();
  limit = 10;
  words.push(query);

  if (query.length == 0) {
    return;
  }
  var set = {};
  var resultCount = 0;
  results = [];
  for (var i = 0; i < words.length; i++) {
    resultCount++;
    set[words[i]] = true;
    var doc = documentStore[words[i]];
    if (!doc) {
      continue;
    }
    results.push(doc);
  }
  searchEngine.lookup(query, function(engineResults) {
    if (!engineResults) {
      return;
    }
    if (searchId !== searchIdCounter) {
      return;
    }
    for (var i = 0; i < engineResults.getSize(); i++) {
      var key = engineResults.getItem(i);
      if (key in set) {
        continue;
      }
      var doc = documentStore[key];
      if (!doc) {
        continue;
      }
      results.push(doc);
    }
    callback(results);
  });
}

var searchEngine;
function setupSearchEngine(callback) {
  var dbName = "sutyvlaste";
  searchEngine = new fullproof.BooleanEngine();
  var indexes = [{
      name: "normalindex",
      analyzer: new fullproof.StandardAnalyzer(
          fullproof.normalizer.to_lowercase_nomark),
      capabilities: new fullproof.Capabilities().setUseScores(
          false).setDbName(dbName),
      initializer: initializer
  }];
  searchEngine.open(indexes, fullproof.make_callback(callback, true), fullproof.make_callback(callback, false));
}

function initializer(injector, callback) {
  var numTerms = objectSize(documentStore);
  var synchro = fullproof.make_synchro_point(callback, numTerms);

  for (var key in documentStore) {
    var doc = documentStore[key];
    var text = doc.word + ' ' + doc.type + ' ' + doc.definition;
    injector.inject(text, key, synchro);
  }
}

function objectSize(obj) {
  var i = 0;
  for (var key in obj) i++;
  return i;
}
