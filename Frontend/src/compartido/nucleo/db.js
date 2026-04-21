export const db = {
  get: (collection) => JSON.parse(localStorage.getItem(collection) || '[]'),
  set: (collection, data) => localStorage.setItem(collection, JSON.stringify(data)),
  
  find: (collection, predicate) => db.get(collection).find(predicate),
  filter: (collection, predicate) => db.get(collection).filter(predicate),
  
  insert: (collection, item) => {
    const data = db.get(collection);
    item.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    data.push(item);
    db.set(collection, data);
    return item;
  },
  
  update: (collection, id, updates) => {
    const data = db.get(collection);
    const index = data.findIndex(item => item.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates };
      db.set(collection, data);
      return data[index];
    }
    return null;
  }
};
