import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import { config } from '../shared/config';
import { User } from '../models/User.model';
import { UserRole } from '../shared/constants';
import { logger } from '../shared/logger';

async function main() {
  const emailArg = process.argv[2];

  await mongoose.connect(config.MONGODB_URI);
  logger.info('Connected to MongoDB');

  const emailsToPromote = [
    'developers.nafiz@gmail.com',
    'developersnafiz@gmail.com',
    'muhammadnafiz403@gmail.com',
    'seospecialist950@gmail.com',
  ];

  if (emailArg) {
    emailsToPromote.push(emailArg.toLowerCase().trim());
  }

  for (const email of emailsToPromote) {
    const user = await User.findOne({ email });
    if (user) {
      user.role = UserRole.ADMIN;
      await user.save();
      console.log(`✅ Promoted ${email} to role: ADMIN`);
    }
  }

  const allAdmins = await User.find({ role: UserRole.ADMIN });
  console.log('\n👑 Current Platform Admins:');
  allAdmins.forEach((a) => console.log(`  - ${a.email} (${a.role})`));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error promoting admin:', err);
  process.exit(1);
});
