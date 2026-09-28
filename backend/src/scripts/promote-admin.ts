import mongoose from 'mongoose';
import { config } from '../shared/config';
import { User } from '../models/User.model';
import { UserRole } from '../shared/constants';
import { logger } from '../shared/logger';

async function main() {
  const emailArg = process.argv[2];

  await mongoose.connect(config.MONGODB_URI);
  logger.info('Connected to MongoDB');

  if (emailArg) {
    const email = emailArg.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ User with email "${email}" not found.`);
      process.exit(1);
    }
    user.role = UserRole.ADMIN;
    await user.save();
    console.log(`✅ User ${email} has been successfully promoted to role: ADMIN`);
  } else {
    // If no email passed, promote the latest registered user or show all users
    const users = await User.find({}).sort({ createdAt: -1 }).limit(10);
    if (users.length === 0) {
      console.log('No users found in database.');
      process.exit(0);
    }
    console.log('Recent Users:');
    users.forEach((u, i) => {
      console.log(`  [${i + 1}] ${u.email} | Role: ${u.role} | ID: ${u._id}`);
    });
    // Promote the first user
    const firstUser = users[0];
    firstUser.role = UserRole.ADMIN;
    await firstUser.save();
    console.log(`✅ Latest user ${firstUser.email} promoted to ADMIN!`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error promoting admin:', err);
  process.exit(1);
});
