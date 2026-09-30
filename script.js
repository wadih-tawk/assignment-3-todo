/* =========================================================
   To-Do List | Assignment 3
   Vanilla JavaScript only: no frameworks, no libraries.

   The code follows the chapter 09 split, kept in ONE classic
   script so the app runs by double-clicking index.html
   (ES modules are blocked on file://):

   1. Elements and state   the tasks array is the single source of truth
   2. Storage              load and save, with try / catch
   3. Task logic           pure functions that return a NEW array
   4. Update and render    the only code that changes the list on the page
   5. Feedback and focus   small helpers used by the handlers
   6. Event handlers       turn user actions into updates
   7. Start-up
   ========================================================= */

'use strict';


/* ---------- 1. Elements and state ---------- */

// A unique key, so this app never reads or overwrites another page's data
const STORAGE_KEY = 'todo-list:tasks';

// Every element the script needs, found once
const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const feedback = document.querySelector('#feedback');
const list = document.querySelector('#task-list');
const stats = document.querySelector('#stats');
const emptyState = document.querySelector('#empty-state');
const clearButton = document.querySelector('#clear-completed');

// The single source of truth: an array of { id, title, done } objects.
// The page is only ever a picture of this array (chapter 08).
let tasks = loadTasks();


/* ---------- 2. Storage ---------- */

// Reads the saved list. Missing or broken data gives an empty list instead
// of a crash, because an error on open would stop the whole app (chapter 09).
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);   // a string, or null on the first visit
    const saved = JSON.parse(raw) || [];             // JSON.parse(null) is null, so fall back to []
    if (!Array.isArray(saved)) {
      return [];
    }
    return saved.filter(isValidTask);                // drop anything that isn't a proper task
  } catch (err) {
    console.warn('Saved tasks could not be read. Starting with an empty list.', err);
    return [];
  }
}

// Returns true when the list was saved, false when the browser refused
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (err) {
    console.warn('Tasks could not be saved.', err);
    return false;
  }
}

// A saved item is only trusted if it has exactly the shape the app expects
function isValidTask(task) {
  return task !== null
    && typeof task === 'object'                      // careful: typeof null is also 'object' (chapter 07)
    && typeof task.id === 'string'
    && typeof task.title === 'string'
    && task.title.trim() !== ''
    && typeof task.done === 'boolean';
}


/* ---------- 3. Task logic (pure functions) ---------- */
// None of these touch the page or localStorage. Each one takes an array and
// returns a new one, so it can be tested on its own in the console, e.g.
//   toggleTask([{ id: 'a', title: 'Test', done: false }], 'a')

function createId() {
  // Date.now() alone can repeat: two calls in the same millisecond return the same number
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Newest first, so a new task appears right under the input
function addTask(currentTasks, title) {
  const newTask = { id: createId(), title: title, done: false };
  return [newTask, ...currentTasks];
}

function toggleTask(currentTasks, id) {
  return currentTasks.map(task => (task.id === id ? { ...task, done: !task.done } : task));
}

function deleteTask(currentTasks, id) {
  return currentTasks.filter(task => task.id !== id);
}

function clearCompleted(currentTasks) {
  return currentTasks.filter(task => !task.done);
}

function countDone(currentTasks) {
  return currentTasks.reduce((count, task) => (task.done ? count + 1 : count), 0);
}


/* ---------- 4. Update and render ---------- */

// The ONLY place the tasks array changes: replace it, save it, redraw the page
function update(nextTasks) {
  tasks = nextTasks;
  const saved = saveTasks();
  renderTasks();
  if (!saved) {
    showFeedback('This change could not be saved, so it will be lost when you reload.');
  }
}

// One function owns the drawing (chapter 08)
function renderTasks() {
  list.innerHTML = '';                               // clear first, or every render appends duplicates
  tasks
    .map(createTaskElement)                          // data -> elements
    .forEach(li => list.append(li));                 // elements -> page
  renderSummary();
}

// Builds one <li> from one task object
function createTaskElement(task) {
  const li = document.createElement('li');
  li.classList.add('task');
  li.classList.toggle('done', task.done);            // this class draws the strikethrough in CSS
  li.dataset.id = task.id;                           // how a click finds its task again

  // Wrapping the checkbox and the title in one <label> makes the whole title clickable
  const label = document.createElement('label');
  label.classList.add('task-label');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.classList.add('task-check');
  checkbox.checked = task.done;

  const title = document.createElement('span');
  title.classList.add('task-title');
  title.textContent = task.title;                    // textContent, never innerHTML: user text is shown, not run

  label.append(checkbox, title);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.classList.add('delete-button');
  deleteButton.textContent = '×';
  deleteButton.title = 'Delete task';
  deleteButton.setAttribute('aria-label', `Delete task: ${task.title}`);

  li.append(label, deleteButton);
  return li;
}

// The counter, the empty message and "Clear completed" are all worked out from the array
function renderSummary() {
  const total = tasks.length;
  const done = countDone(tasks);

  stats.textContent = `${done} of ${total} done`;
  stats.hidden = total === 0;
  emptyState.hidden = total > 0;
  clearButton.hidden = done === 0;
}


/* ---------- 5. Feedback and focus ---------- */

function showFeedback(message) {
  feedback.textContent = message;
}

function clearFeedback() {
  feedback.textContent = '';
  input.removeAttribute('aria-invalid');
}

// A re-render replaces every <li>, so the element that had keyboard focus is gone.
// These helpers put focus back where the user was working.
function findTaskElement(id) {
  // compares ids directly instead of building a CSS selector out of saved data
  return Array.from(list.children).find(li => li.dataset.id === id);
}

function focusCheckbox(id) {
  const li = findTaskElement(id);
  if (li) {
    li.querySelector('.task-check').focus();
  }
}

function focusAfterDelete(deletedIndex) {
  // the task that moved into the deleted one's place, or else the one above it
  const next = list.children[deletedIndex] || list.children[deletedIndex - 1];
  if (next) {
    next.querySelector('.delete-button').focus();
  } else {
    input.focus();
  }
}


/* ---------- 6. Event handlers ---------- */

// "submit" covers both the Add button and the Enter key (chapter 08)
function handleSubmit(event) {
  event.preventDefault();                            // stop the browser from reloading the page
  const title = input.value.trim();                  // '   ' becomes '', so blank input is caught too

  if (title === '') {
    showFeedback("A task can't be empty or only spaces. Type something first.");
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }

  clearFeedback();
  update(addTask(tasks, title));
  input.value = '';
  input.focus();                                     // ready for the next task, even after clicking Add
}

// The error disappears as soon as the user starts fixing it
function handleInput() {
  if (feedback.textContent !== '') {
    clearFeedback();
  }
}

// Escape empties the input
function handleKeydown(event) {
  if (event.key === 'Escape') {
    input.value = '';
    clearFeedback();
  }
}

// ONE listener on the list handles every checkbox, even the ones created later (event delegation)
function handleListChange(event) {
  const checkbox = event.target.closest('.task-check');
  if (!checkbox) {
    return;
  }
  const id = checkbox.closest('.task').dataset.id;
  update(toggleTask(tasks, id));
  focusCheckbox(id);
}

function handleListClick(event) {
  const deleteButton = event.target.closest('.delete-button');
  if (!deleteButton) {
    return;
  }
  // event.detail counts mouse clicks: the 2nd click of a double-click has detail 2.
  // Ignoring it stops one double-click from deleting two tasks.
  if (event.detail > 1) {
    return;
  }
  const id = deleteButton.closest('.task').dataset.id;
  const index = tasks.findIndex(task => task.id === id);
  update(deleteTask(tasks, id));
  focusAfterDelete(index);
}

function handleClearCompleted() {
  update(clearCompleted(tasks));
  input.focus();                                     // the button hides itself, so move focus somewhere useful
}

// Another tab changed the saved list: reload it, so this tab never overwrites newer data
function handleStorageChange(event) {
  if (event.key === STORAGE_KEY || event.key === null) {   // null means the whole storage was cleared
    tasks = loadTasks();
    renderTasks();
  }
}


/* ---------- 7. Start-up ---------- */

function init() {
  form.addEventListener('submit', handleSubmit);
  input.addEventListener('input', handleInput);
  input.addEventListener('keydown', handleKeydown);
  list.addEventListener('change', handleListChange);
  list.addEventListener('click', handleListClick);
  clearButton.addEventListener('click', handleClearCompleted);
  window.addEventListener('storage', handleStorageChange);
  renderTasks();                                     // draw whatever was saved last time
}

init();
