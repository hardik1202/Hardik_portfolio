const NodeCache = require('node-cache');

// Standard TTL 60 seconds, check period 120 seconds
const cache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: true
});

const invalidateUserCache = (userId) => {
  const keys = cache.keys();
  const keysToDel = keys.filter(k => k.startsWith(`tasks:${userId}`) || k.startsWith(`task:${userId}:`));
  cache.del(keysToDel);
};

module.exports = {
    cache,
    invalidateUserCache
};
