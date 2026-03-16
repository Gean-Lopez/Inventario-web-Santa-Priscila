import bcrypt from 'bcryptjs';

const hash = await bcrypt.hash('admin123', 10);
console.log(hash);
