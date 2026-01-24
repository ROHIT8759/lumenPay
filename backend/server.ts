import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import escrowRoutes from './routes/escrow';

/**
 * LumenPay Backend Server
 * 
 * Main Express server for handling:
 * - Wallet-based authentication
 * - Unsigned transaction building
 * - Signed transaction relay
 * - Soroban escrow operations
 */

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        network: process.env.STELLAR_NETWORK || 'testnet',
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/escrow', escrowRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});

// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 LumenPay backend running on port ${PORT}`);
        console.log(`📡 Network: ${process.env.STELLAR_NETWORK || 'testnet'}`);
        console.log(`🔗 Horizon: ${process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org'}`);
    });
}

export default app;
