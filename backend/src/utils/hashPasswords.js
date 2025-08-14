import bcrypt from 'bcrypt';

// This utility generates hashed passwords for the sample data
// Run this to get properly hashed passwords for init.sql

const passwords = {
  admin: 'password123',
  teacher: 'password123', 
  student: 'password123',
  parent: 'password123'
};

const generateHashes = async () => {
  const saltRounds = 10;
  
  for (const [role, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log(`${role}: ${hash}`);
  }
};

generateHashes();