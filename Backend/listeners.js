// listeners.js — Practical 10: Event listeners for background processing
// Registers all event handlers for task-created, task-deleted, and error events

const taskEvents = require('./events');

// ─── task-created listener ───────────────────────────────────────────────────
// Simulates an asynchronous notification handler with a 2-second delay.
// The API response is sent BEFORE this handler completes, proving non-blocking behavior.
taskEvents.on('task-created', (task) => {
  const receivedAt = new Date().toISOString();
  console.log(`\n📩 [Event Received] 'task-created' picked up at ${receivedAt}`);

  // Simulate slow async notification processing (e.g., sending email, push notification)
  setTimeout(() => {
    const processedAt = new Date().toISOString();
    console.log(`──────────────────────────────────────────────────`);
    console.log(`🔔 [Notification - task-created]`);
    console.log(`   Task Title   : "${task.title}"`);
    console.log(`   Assigned User: ${task.user}`);
    console.log(`   Priority     : ${task.priority || 'medium'}`);
    console.log(`   Created At   : ${task.createdAt}`);
    console.log(`   Notified At  : ${processedAt}`);
    console.log(`──────────────────────────────────────────────────\n`);
  }, 2000); // 2-second artificial delay to demonstrate async behavior
});

// ─── task-deleted listener (Supplementary Problem) ───────────────────────────
// Logs a different message when a task is deleted
taskEvents.on('task-deleted', (task) => {
  const receivedAt = new Date().toISOString();
  console.log(`\n📩 [Event Received] 'task-deleted' picked up at ${receivedAt}`);

  setTimeout(() => {
    const processedAt = new Date().toISOString();
    console.log(`──────────────────────────────────────────────────`);
    console.log(`🗑️  [Notification - task-deleted]`);
    console.log(`   Deleted Task : "${task.title}"`);
    console.log(`   Belonged To  : ${task.user}`);
    console.log(`   Deleted At   : ${processedAt}`);
    console.log(`──────────────────────────────────────────────────\n`);
  }, 1500); // 1.5-second delay
});

// ─── error event listener (Supplementary Problem) ───────────────────────────
// Catches and logs any error thrown inside event handlers.
// Without this, an unhandled 'error' event would crash the Node.js process.
taskEvents.on('error', (err) => {
  console.error(`\n❌ [Event Error] An error occurred in an event handler:`);
  console.error(`   Message: ${err.message}`);
  console.error(`   Stack  : ${err.stack}\n`);
});

console.log('✅ [Listeners] All event listeners registered (task-created, task-deleted, error)');

module.exports = taskEvents;
