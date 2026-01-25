
import { NotificationService } from '../services/notificationService';
import prisma from '../lib/prisma';

async function testNotification() {
    const walletAddress = process.argv[2]; // Passing addr as arg
    if (!walletAddress) {
        console.log("Usage: npx ts-node backend/scripts/test_notification.ts <WALLET_ADDRESS>");

        // Try finding one
        const link = await prisma.telegramLink.findFirst();
        if (link) {
            console.log(`Found linked wallet: ${link.walletAddress}. Using that...`);
            await sendTest(link.walletAddress);
        } else {
            console.log("No linked accounts found in DB to test. Create a link via the App or DB first.");
        }
        return;
    }

    await sendTest(walletAddress);
}

async function sendTest(address: string) {
    console.log(`Sending test notification to ${address}...`);
    const sent = await NotificationService.send(address, "🔔 This is a test notification from StellarPay Indexer.", 'info');

    if (sent) console.log("✅ Simulation: Notification sent (check mock console output or real Telegram if configured)");
    else console.log("❌ Simulation: Failed to send (User not linked or API error)");
}

testNotification()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
