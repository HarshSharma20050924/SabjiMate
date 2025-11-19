
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n=======================================');
console.log('   PASTE THESE INTO YOUR .env FILE');
console.log('=======================================\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('\n=======================================\n');
