/**
 * useStockTrading Hook
 * 
 * React hook for interacting with the stock trading smart contract
 * Provides state management for assets, holdings, orders, and trading operations
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  stockTradingService, 
  Asset, 
  Holding, 
  Order, 
  PortfolioSummary,
  formatCurrency,
  stroopsToXLM,
  xlmToStroops,
} from '@/lib/stockTradingService';
import { useLumenVault } from './useLumenVault';

interface UseStockTradingReturn {
  // Data
  assets: Asset[];
  holdings: Holding[];
  orders: Order[];
  portfolio: PortfolioSummary | null;
  
  // Loading states
  isLoadingAssets: boolean;
  isLoadingHoldings: boolean;
  isLoadingOrders: boolean;
  isTrading: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  refreshAssets: () => Promise<void>;
  refreshHoldings: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshPortfolio: () => Promise<void>;
  buy: (assetCode: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
  sell: (assetCode: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
  placeLimitOrder: (
    assetCode: string,
    orderType: 'Buy' | 'Sell',
    quantity: number,
    limitPrice: number
  ) => Promise<{ success: boolean; error?: string }>;
  
  // Utility
  getAssetPrice: (assetCode: string) => bigint | null;
  calculateCost: (assetCode: string, quantity: number) => { cost: bigint; costFormatted: string } | null;
  formatPrice: (price: bigint) => string;
}

export function useStockTrading(): UseStockTradingReturn {
  const [vaultState, vaultActions] = useLumenVault();
  const { publicKey, isLocked } = vaultState;
  const { signTransaction: signTx } = vaultActions;
  
  // State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  
  // Loading states
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Refresh assets
  const refreshAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    setError(null);
    try {
      const fetchedAssets = await stockTradingService.getAssets();
      setAssets(fetchedAssets);
    } catch (err) {
      setError('Failed to fetch assets');
      console.error(err);
    } finally {
      setIsLoadingAssets(false);
    }
  }, []);

  // Refresh holdings
  const refreshHoldings = useCallback(async () => {
    if (!publicKey) return;
    
    setIsLoadingHoldings(true);
    setError(null);
    try {
      const fetchedHoldings = await stockTradingService.getUserHoldings(publicKey);
      setHoldings(fetchedHoldings);
    } catch (err) {
      setError('Failed to fetch holdings');
      console.error(err);
    } finally {
      setIsLoadingHoldings(false);
    }
  }, [publicKey]);

  // Refresh orders
  const refreshOrders = useCallback(async () => {
    if (!publicKey) return;
    
    setIsLoadingOrders(true);
    setError(null);
    try {
      const fetchedOrders = await stockTradingService.getUserOrders(publicKey);
      setOrders(fetchedOrders);
    } catch (err) {
      setError('Failed to fetch orders');
      console.error(err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [publicKey]);

  // Refresh portfolio summary
  const refreshPortfolio = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const summary = await stockTradingService.getPortfolioSummary(publicKey);
      setPortfolio(summary);
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
    }
  }, [publicKey]);

  // Buy asset
  const buy = useCallback(async (
    assetCode: string, 
    quantity: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (!publicKey || isLocked) {
      return { success: false, error: 'Wallet not connected or locked' };
    }

    setIsTrading(true);
    setError(null);
    
    try {
      const result = await stockTradingService.executeBuy(
        publicKey,
        assetCode,
        BigInt(quantity),
        async (xdr: string) => {
          // Note: signTx requires passphrase - this needs UI integration
          // For now, we'll throw an error indicating passphrase is needed
          throw new Error('Passphrase required for signing. Use the trade modal.');
        }
      );
      
      if (result.success) {
        // Refresh data after successful trade
        await Promise.all([refreshHoldings(), refreshOrders(), refreshPortfolio()]);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Buy failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsTrading(false);
    }
  }, [publicKey, isLocked, refreshHoldings, refreshOrders, refreshPortfolio]);

  // Sell asset
  const sell = useCallback(async (
    assetCode: string, 
    quantity: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (!publicKey || isLocked) {
      return { success: false, error: 'Wallet not connected or locked' };
    }

    setIsTrading(true);
    setError(null);
    
    try {
      const result = await stockTradingService.executeSell(
        publicKey,
        assetCode,
        BigInt(quantity),
        async (xdr: string) => {
          throw new Error('Passphrase required for signing. Use the trade modal.');
        }
      );
      
      if (result.success) {
        await Promise.all([refreshHoldings(), refreshOrders(), refreshPortfolio()]);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sell failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsTrading(false);
    }
  }, [publicKey, isLocked, refreshHoldings, refreshOrders, refreshPortfolio]);

  // Place limit order
  const placeLimitOrder = useCallback(async (
    assetCode: string,
    orderType: 'Buy' | 'Sell',
    quantity: number,
    limitPrice: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (!publicKey || isLocked) {
      return { success: false, error: 'Wallet not connected or locked' };
    }

    setIsTrading(true);
    setError(null);
    
    try {
      const txXDR = await stockTradingService.buildLimitOrderTransaction(
        publicKey,
        assetCode,
        orderType,
        BigInt(quantity),
        xlmToStroops(limitPrice)
      );
      
      // Note: This needs passphrase integration
      throw new Error('Passphrase required for signing. Use the trade modal.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Limit order failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsTrading(false);
    }
  }, [publicKey, isLocked, refreshOrders]);

  // Get asset price
  const getAssetPrice = useCallback((assetCode: string): bigint | null => {
    const asset = assets.find(a => a.code === assetCode);
    return asset?.price ?? null;
  }, [assets]);

  // Calculate cost for a trade
  const calculateCost = useCallback((
    assetCode: string, 
    quantity: number
  ): { cost: bigint; costFormatted: string } | null => {
    const price = getAssetPrice(assetCode);
    if (price === null) return null;
    
    const cost = price * BigInt(quantity);
    return {
      cost,
      costFormatted: formatCurrency(cost),
    };
  }, [getAssetPrice]);

  // Format price for display
  const formatPrice = useCallback((price: bigint): string => {
    return formatCurrency(price);
  }, []);

  // Load assets on mount
  useEffect(() => {
    refreshAssets();
  }, [refreshAssets]);

  // Load user data when wallet connects
  useEffect(() => {
    if (publicKey && !isLocked) {
      refreshHoldings();
      refreshOrders();
      refreshPortfolio();
    }
  }, [publicKey, isLocked, refreshHoldings, refreshOrders, refreshPortfolio]);

  return {
    // Data
    assets,
    holdings,
    orders,
    portfolio,
    
    // Loading states
    isLoadingAssets,
    isLoadingHoldings,
    isLoadingOrders,
    isTrading,
    
    // Error
    error,
    
    // Actions
    refreshAssets,
    refreshHoldings,
    refreshOrders,
    refreshPortfolio,
    buy,
    sell,
    placeLimitOrder,
    
    // Utility
    getAssetPrice,
    calculateCost,
    formatPrice,
  };
}

export default useStockTrading;
