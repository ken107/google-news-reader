
var config = require("../util/config.js");
var log = require("../util/log.js");
var cache = require("../cache/combined.js");

exports.load = function(topicName) {
  log.debug("topic", "load", topicName);

  var key = "topic-" + topicName.toLowerCase();
  return cache.read(key)
    .then(entry => {
      if (new Date().getTime() > entry.lastModified + 5*60*1000) {
        log.debug("cache entry expired");
        if (!entry.refreshing) {
          entry.refreshing = true;
          loadFeed(topicName).then(topic => cache.write(key, topic));
        }
      }
      return entry.data;
    })
    .catch(err => {
      if (err.message == "NOT_FOUND") return loadFeed(topicName).then(topic => {cache.write(key, topic); return topic;});
      else throw err;
    })
    .then(topic => {
      topic.name = topicName;
      return topic;
    });
}

function loadFeed(topicName) {
  var url = config.feeds[topicName.toLowerCase()];
  if (!url) url = config.feeds.$$.replace("${topic}", encodeURIComponent(topicName));

  return Promise.resolve(url)
    .then(require("../loader/http.js").load)
    .then(require("../parser/feed/google.js").parse);
}