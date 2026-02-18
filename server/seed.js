require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db/database');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function seed() {
  console.log('\n🚀 Recon2Root — Admin Setup\n');

  const username = await ask('Enter admin username: ');
  const password = await ask('Enter admin password: ');

  if (!username.trim() || !password.trim()) {
    console.error('❌ Username and password cannot be empty.');
    process.exit(1);
  }

  const hash = bcrypt.hashSync(password.trim(), 12);

  const existing = db.prepare('SELECT id FROM admin WHERE username = ?').get(username.trim());
  if (existing) {
    db.prepare('UPDATE admin SET password_hash = ? WHERE username = ?').run(hash, username.trim());
    console.log(`\n✅ Admin password updated for "${username.trim()}"`);
  } else {
    db.prepare('INSERT INTO admin (username, password_hash) VALUES (?, ?)').run(username.trim(), hash);
    console.log(`\n✅ Admin user "${username.trim()}" created successfully.`);
  }

  rl.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
