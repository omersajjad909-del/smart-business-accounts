const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.all([p.company.count(), p.user.count()])
  .then(([c, u]) => { console.log('Companies:', c, '  Users:', u); })
  .catch(e => console.log('DB Error:', e.message))
  .finally(() => p.$disconnect());
