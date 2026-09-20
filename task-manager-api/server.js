const express = require('express');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

app.use((req, res, next) => {
  if (['POST', 'PUT'].includes(req.method) && req.headers['content-type'] !== 'application/json') {
    return res.status(400).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

let tasks = [];
let nextId = 1;

const validateId = (req, res, next) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(400).json({ error: 'Invalid task ID format' });
  }
  next();
};

app.get('/tasks', (req, res) => {
  res.status(200).json(tasks);
});

app.post('/tasks', (req, res) => {
  const title = req.body?.title;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const newTask = { id: nextId++, title, completed: false };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.put('/tasks/:id', validateId, (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  Object.assign(task, req.body);
  res.status(200).json(task);
});

app.delete('/tasks/:id', validateId, (req, res) => {
  const index = tasks.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  tasks.splice(index, 1);
  res.status(200).json({ message: 'Task deleted' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(5000, () => console.log('Server running on port 5000'));
