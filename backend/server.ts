import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import escrowRoutes from './routes/escrow';
import kycRoutes from './routes/kyc';
import ledgerRoutes from './routes/ledger';
import rampRoutes from './routes/ramp';
import stocksRoutes from './routes/stocks';
import telegramRoutes from './routes/telegram';

// Load env from root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3001;
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/ramp', rampRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/telegram', telegramRoutes);

// Alias for PRD compatibility
app.use('/api/tx', transactionRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LumenPay backend running on port ${PORT}`);
    console.log(`📡 Network: ${process.env.STELLAR_NETWORK || 'testnet'}`);
    console.log(`🔗 Horizon: ${process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org'}`);
});

// Keep process alive and handle errors
server.on('error', (err) => {
    console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});

export default app;
