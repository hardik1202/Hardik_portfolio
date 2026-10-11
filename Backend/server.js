const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Task = require('./models/Task');
const User = require('./models/User');
const authMiddleware = require('./middleware/auth');
const { validateTask } = require('./middleware/validate');
const { cache, invalidateUserCache } = require('./cache');
const cacheStats = require('./cacheStats');
const taskEvents = require('./events');
require('./listeners'); // Register all event listeners at startup

const app = express();

if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://mongodb:27017/taskmanager';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = '3e9c5846b6838b51fb09da6b75bfb03d034112d5ddbf9923c5589b7655647b48';
}
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Response-time tracking middleware
app.use((req, res, next) => {
  const start = process.hrtime();
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);
    console.log(`${req.method} ${req.url} completed in ${durationMs}ms [${res.statusCode}]`);
  });

  next();
});

app.use((req, res, next) => {
  if (['POST', 'PUT'].includes(req.method) && req.headers['content-type'] !== 'application/json') {
    return res.status(400).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ===== AUTH ROUTES =====

// REGISTER
app.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword });

    res.status(201).json({ id: user._id, email: user.email });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    next(err);
  }
});

// LOGIN
app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
});

// ME (returns the logged-in user's details from the token)
app.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

// ===== TASK ROUTES (now protected) =====

// GET all tasks
app.get('/tasks', authMiddleware, async (req, res, next) => {
  try {
    const cacheKey = `tasks:${req.user.id}`;
    const cachedTasks = cache.get(cacheKey);

    if (cachedTasks !== undefined) {
      cacheStats.incrementHit();
      return res.status(200).json(cachedTasks);
    }

    cacheStats.incrementMiss();
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    cache.set(cacheKey, tasks);
    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
});

app.get('/debug/cache', authMiddleware, (req, res) => {
  res.status(200).json({
    ...cacheStats.getStats(),
    keys: cache.keys(),
    ttl: cache.options.stdTTL
  });
});

app.delete('/debug/cache', authMiddleware, (req, res) => {
  cache.flushAll();
  cacheStats.resetStats();
  res.status(200).json({ message: 'Cache cleared' });
});

// Benchmark endpoint: measures cached vs uncached response time for GET /tasks
app.get('/debug/cache/benchmark', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // --- Uncached measurement ---
    cache.del(`tasks:${userId}`);  // ensure cache miss
    const uncachedStart = process.hrtime();
    const tasksFromDb = await Task.find({ user: userId }).sort({ createdAt: -1 }).lean();
    cache.set(`tasks:${userId}`, tasksFromDb);
    const [uSec, uNano] = process.hrtime(uncachedStart);
    const uncachedMs = (uSec * 1000 + uNano / 1e6).toFixed(2);

    // --- Cached measurement ---
    const cachedStart = process.hrtime();
    const tasksFromCache = cache.get(`tasks:${userId}`);
    const [cSec, cNano] = process.hrtime(cachedStart);
    const cachedMs = (cSec * 1000 + cNano / 1e6).toFixed(2);

    const speedup = uncachedMs > 0 ? (parseFloat(uncachedMs) / parseFloat(cachedMs)).toFixed(1) : 'N/A';

    res.status(200).json({
      uncachedResponseTimeMs: parseFloat(uncachedMs),
      cachedResponseTimeMs: parseFloat(cachedMs),
      speedupFactor: `${speedup}x faster`,
      taskCount: tasksFromDb.length,
      ttlSeconds: cache.options.stdTTL,
      note: 'Uncached = fresh MongoDB query; Cached = node-cache in-memory lookup'
    });
  } catch (err) {
    next(err);
  }
});

// GET single task by ID
app.get('/tasks/:id', authMiddleware, async (req, res, next) => {
  try {
    const cacheKey = `task:${req.user.id}:${req.params.id}`;
    const cachedTask = cache.get(cacheKey);

    if (cachedTask !== undefined) {
      cacheStats.incrementHit();
      return res.status(200).json(cachedTask);
    }

    cacheStats.incrementMiss();
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    cache.set(cacheKey, task);
    res.status(200).json(task);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }
    next(err);
  }
});

// CREATE a task
app.post('/tasks', authMiddleware, validateTask, async (req, res, next) => {
  try {
    const newTask = await Task.create({
      ...req.body,
      user: req.user.id
    });
    invalidateUserCache(req.user.id);

    // Practical 10: Log API response timestamp, send response, THEN emit event
    console.log(`\n⚡ [API] POST /tasks — Response sent at ${new Date().toISOString()}`);
    res.status(201).json(newTask);

    // Emit event AFTER response — handled asynchronously by listener
    taskEvents.emit('task-created', newTask);
  } catch (err) {
    next(err);
  }
});

// UPDATE a task
app.put('/tasks/:id', authMiddleware, validateTask, async (req, res, next) => {
  try {
    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    invalidateUserCache(req.user.id);
    res.status(200).json(updatedTask);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }
    next(err);
  }
});

// DELETE a task
app.delete('/tasks/:id', authMiddleware, async (req, res, next) => {
  try {
    const deletedTask = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    invalidateUserCache(req.user.id);

    // Practical 10: Log API response timestamp, send response, THEN emit event
    console.log(`\n⚡ [API] DELETE /tasks/:id — Response sent at ${new Date().toISOString()}`);
    res.status(200).json({ message: 'Task deleted' });

    // Emit event AFTER response — handled asynchronously by listener
    taskEvents.emit('task-deleted', deletedTask);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }
    next(err);
  }
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler — turns Mongoose errors into clean structured JSON
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
