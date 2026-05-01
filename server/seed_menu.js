const db = require('./db/index.js');

const menuItems = [
  { name: 'Margherita Pizza', description: 'Classic delight with 100% real mozzarella cheese', price: 299, category: 'Pizza', image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80', is_veg: 1, tags: '["Jain"]' },
  { name: 'Pepperoni Pizza', description: 'Double pepperoni and extra cheese', price: 399, category: 'Pizza', image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80', is_veg: 0, tags: '["Spicy"]' },
  { name: 'Paneer Tikka Masala', description: 'Cubes of paneer cooked in a rich tomato gravy', price: 250, category: 'Main Course', image_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80', is_veg: 1, tags: '["Jain"]' },
  { name: 'Butter Chicken', description: 'Tender chicken pieces in a creamy tomato sauce', price: 350, category: 'Main Course', image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&q=80', is_veg: 0, tags: '[]' },
  { name: 'Dal Makhani', description: 'Black lentils slow-cooked overnight with butter', price: 180, category: 'Main Course', image_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80', is_veg: 1, tags: '["Jain"]' },
  { name: 'Garlic Naan', description: 'Soft bread baked in a tandoor, brushed with garlic butter', price: 50, category: 'Breads', image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&q=80', is_veg: 1, tags: '[]' },
  { name: 'Veg Hakka Noodles', description: 'Wok-tossed noodles with fresh vegetables', price: 199, category: 'Chinese', image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&q=80', is_veg: 1, tags: '["Jain", "Vegan"]' },
  { name: 'Chicken Fried Rice', description: 'Fluffy rice tossed with egg, chicken and soy sauce', price: 249, category: 'Chinese', image_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80', is_veg: 0, tags: '[]' },
  { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a gooey center', price: 150, category: 'Desserts', image_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=500&q=80', is_veg: 1, tags: '[]' },
  { name: 'Mango Lassi', description: 'Refreshing yogurt drink blended with sweet mangoes', price: 90, category: 'Beverages', image_url: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=500&q=80', is_veg: 1, tags: '["Jain"]' }
];

async function seedMenu() {
  const insert = db.prepare('INSERT INTO menu_items (name, description, price, category, image_url, is_veg, tags) VALUES (?, ?, ?, ?, ?, ?, ?)');
  
  for (const item of menuItems) {
    // Check if it exists to avoid duplicates
    const exists = db.prepare('SELECT id FROM menu_items WHERE name = ?').get(item.name);
    if (!exists) {
      insert.run(item.name, item.description, item.price, item.category, item.image_url, item.is_veg, item.tags);
      console.log(`Inserted ${item.name}`);
    } else {
      console.log(`${item.name} already exists, skipping.`);
    }
  }
}
seedMenu();
