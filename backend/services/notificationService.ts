
import prisma from '../lib/prisma';

export class NotificationService {
    private static botToken = process.env.TELEGRAM_BOT_TOKEN;

    /**
     * Send a notification to a user's Telegram if linked
     */
    static async send(walletAddress: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<boolean> {
        try {
            if (!walletAddress) return false;

            // Get Telegram link
            const link = await prisma.telegramLink.findUnique({
                where: { walletAddress },
            });

            if (!link) {
                // User not linked
                return false;
            }

            if (!this.botToken || this.botToken === 'placeholder') {
                console.log(`[Mock Notification] To: ${walletAddress} (${link.telegramUserId}) | Msg: ${message}`);
                return true;
            }

            // Construct formatted message
            const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
            const formattedMessage = `${icon} <b>LumenPay Notification</b>\n\n${message}`;

            // Send via Telegram API
            const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: link.chatId || link.telegramUserId,
                    text: formattedMessage,
                    parse_mode: 'HTML',
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Telegram API error: ${errorText}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('NotificationService error:', error);
            return false;
        }
    }

    /**
     * Send payment received notification
     */
    static async sendPaymentReceived(walletAddress: string, amount: string, asset: string, from: string) {
        const shortFrom = `${from.slice(0, 4)}...${from.slice(-4)}`;
        const message = `You received <b>${amount} ${asset}</b> from <code>${shortFrom}</code>.`;
        return this.send(walletAddress, message, 'success');
    }

    /**
     * Send payment sent notification
     */
    static async sendPaymentSent(walletAddress: string, amount: string, asset: string, to: string) {
        const shortTo = `${to.slice(0, 4)}...${to.slice(-4)}`;
        const message = `You sent <b>${amount} ${asset}</b> to <code>${shortTo}</code>.`;
        return this.send(walletAddress, message, 'success');
    }

    /**
     * Send low balance warning
     */
    static async sendLowBalanceWarning(walletAddress: string, asset: string, balance: string) {
        const message = `Your <b>${asset}</b> balance is low (${balance}). Please top up.`;
        return this.send(walletAddress, message, 'warning');
    }

    /**
     * Send KYC Status Update
     */
    static async sendKYCUpdate(walletAddress: string, level: number, status: 'verified' | 'rejected') {
        const message = status === 'verified'
            ? `Congrats! Your KYC Level ${level} is now <b>VERIFIED</b>.`
            : `Update: Your KYC Level ${level} application was <b>REJECTED</b>. Please check the app for details.`;
        return this.send(walletAddress, message, status === 'verified' ? 'success' : 'error');
    }
}
