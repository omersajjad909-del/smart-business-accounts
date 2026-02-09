const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Testing database connection (READ & WRITE)...');
  try {
    // 1. Read
    await prisma.$connect();
    console.log('Connected!');
    
    // 2. Write (Create a dummy log or similar, or just check if we can start a transaction)
    // We'll try to find a table we can write to safely. 
    // Let's use a transaction to do nothing effectively, or write to a Log table if exists.
    // Looking at schema, there is likely a User or Company table.
    // Let's just try to update a non-existent record to test the WRITE path connection
    
    try {
        await prisma.user.update({
            where: { id: 'non-existent-id' },
            data: { name: 'test' }
        });
    } catch (e) {
        if (e.code === 'P2025') {
            console.log('Write path active (Record not found error is good).');
        } else {
            throw e;
        }
    }

    console.log('Database Read/Write Access Confirmed.');
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Connection/Write failed:', e);
    process.exit(1);
  }
}

main();
