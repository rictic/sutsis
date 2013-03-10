
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
  if (results.length === 0) {
    var rafsiDecompositions = parseLujvo(query);
    for (var i = 0; i < rafsiDecompositions.length; i++) {
      var decomposition = rafsiDecompositions[i];
      results.push({
        type: 'unknown lujvo',
        word: query,
        rafsi: decomposition,
        rafsiDocuments: decomposition.map(function(r){return rafsi[r]})
      })
    }
  }
  searchEngine.lookup(query, function(engineResults) {
    if (!engineResults) {
      callback(results);
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
    var text = [doc.word, doc.type, doc.definition, doc.notes, doc.rafsi.join(' ')].join(' ');
    injector.inject(text, key, synchro);
  }
}

function objectSize(obj) {
  var i = 0;
  for (var key in obj) i++;
  return i;
}


var rafsi = {};
for (var key in documentStore) {
  var def = documentStore[key];
  for (var i = 0; i < def.rafsi.length; i++) {
    rafsi[def.rafsi[i]] = def;
  }
}

function parseLujvo(lujvo) {
  var decompositions = decomposeIntoCandidateRafsi(lujvo);
  var validDecompositions = [];
  for (var i = 0; i < decompositions.length; i++) {
    var decomposition = decompositions[i];
    var valid = true;
    for (var j = 0; j < decomposition.length; j++) {
      if (!(decomposition[j] in rafsi)) {
        valid = false;
      }
    }
    if (valid) {
      validDecompositions.push(decomposition);
    }
  }
  return validDecompositions;
}

// non-validating
function decomposeIntoCandidateRafsi(lujvo, someTaken) {
  if (lujvo.length < 3) {
    // invalid
    return undefined;
  }
  if (someTaken && (lujvo.length === 3 || lujvo.length === 5)) {
    return [lujvo];
  }

  var candidates = [splitAt(lujvo, 3), splitAt(lujvo, 4)];
  var newCandidates = [];
  for (var i = 0; i < candidates.length; i++) {
    if (candidates[i][1].charAt(0) in {'y':true, 'n':true, 'r':true}) {
      newCandidates.push([candidates[i][0], candidates[i][1].substring(1)])
    }
    newCandidates.push(candidates[i]);
  }
  candidates = newCandidates;

  var results = [];
  for (var i = 0; i < candidates.length; i++) {
    var head = candidates[i][0], tail = candidates[i][1];
    var decomposedTail = decomposeIntoCandidateRafsi(tail, true);
    if (decomposedTail === undefined) {
      continue;
    }
    for (var j = 0; j < decomposedTail.length; j++) {
      results.push([head].concat(decomposedTail[j]));
    }
  }

  return results;
}
function splitAt(s, i) {
  return [s.substring(0, i), s.substring(i)];
}
