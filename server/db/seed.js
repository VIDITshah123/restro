const db = require('./index');
const bcrypt = require('bcrypt');

const seed = async () => {
  console.log('Seeding database...');
  
  // 1. Seed Admin
  const adminCheck = db.prepare('SELECT id FROM admins WHERE email = ?').get('admin@restro.com');
  if (!adminCheck) {
    const hash = await bcrypt.hash('admin123', 10);
    db.prepare('INSERT INTO admins (email, password_hash, role) VALUES (?, ?, ?)').run('admin@restro.com', hash, 'admin');
    console.log('Admin user seeded.');
  }

  // 2. Seed Tables
  const tablesCheck = db.prepare('SELECT COUNT(*) as count FROM tables').get();
  if (tablesCheck.count === 0) {
    const insertTable = db.prepare('INSERT INTO tables (table_number) VALUES (?)');
    for (let i = 1; i <= 10; i++) {
      insertTable.run(`Table ${i}`);
    }
    console.log('Tables seeded.');
  }

  // 3. Seed Menu Items
  const menuCheck = db.prepare('SELECT COUNT(*) as count FROM menu_items').get();
  if (menuCheck.count === 0) {
    const items = [
      { name: 'Paneer Tikka', description: 'Grilled cottage cheese', price: 250, category: 'Starters', is_veg: 1, tags: '["Spicy"]' },
      { name: 'Chicken Tikka', description: 'Grilled chicken', price: 350, category: 'Starters', is_veg: 0, tags: '["Spicy"]' },
      { name: 'Butter Naan', description: 'Soft bread with butter', price: 50, category: 'Breads', is_veg: 1, tags: '[]' },
      { name: 'Dal Makhani', description: 'Creamy black lentils', price: 200, category: 'Mains', is_veg: 1, tags: '[]' },
      { name: 'Butter Chicken', description: 'Creamy tomato chicken', price: 400, category: 'Mains', is_veg: 0, tags: '[]' }
    ];

    const insertMenu = db.prepare('INSERT INTO menu_items (name, description, price, category, is_veg, tags) VALUES (?, ?, ?, ?, ?, ?)');
    for (const item of items) {
      insertMenu.run(item.name, item.description, item.price, item.category, item.is_veg, item.tags);
    }
    console.log('Menu items seeded.');
  }

  console.log('Seeding completed.');
};

seed().catch(console.error);
