import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import escrowRoutes from './routes/escrow';
import kycRoutes from './routes/kyc';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        network: process.env.STELLAR_NETWORK || 'testnet',
    });
});
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/kyc', kycRoutes);
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
