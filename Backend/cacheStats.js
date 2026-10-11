const stats = {
  hits: 0,
  misses: 0,
  totalRequests: 0,
};

const getStats = () => {
  const total = stats.hits + stats.misses;
  return {
    ...stats,
    totalRequests: total,
    hitRate: total === 0 ? '0.00%' : `${((stats.hits / total) * 100).toFixed(2)}%`,
  };
};

const incrementHit = () => {
  stats.hits++;
};

const incrementMiss = () => {
  stats.misses++;
};

const resetStats = () => {
  stats.hits = 0;
  stats.misses = 0;
};

module.exports = {
  getStats,
  incrementHit,
  incrementMiss,
  resetStats
};
