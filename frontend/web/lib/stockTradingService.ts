/**
 * Stock Trading Service
 * 
 * Frontend service to interact with the Soroban stock trading smart contract
 * Handles buying, selling, and portfolio management for stocks/crypto
 */

import {
  Contract,
  rpc as SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  scValToNative,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk';

// Contract deployed address (update after deployment)
const STOCK_TRADING_CONTRACT_ID = process.env.NEXT_PUBLIC_STOCK_TRADING_CONTRACT_ID || '';
const SOROBAN_RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' 
  ? Networks.PUBLIC 
  : Networks.TESTNET;

// Types matching the smart contract
export interface Asset {
  code: string;
  name: string;
  price: bigint;
  totalSupply: bigint;
  availableSupply: bigint;
  isActive: boolean;
}

export type OrderType = 'Buy' | 'Sell';
export type OrderStatus = 'Pending' | 'Filled' | 'PartiallyFilled' | 'Cancelled';

export interface Order {
  id: number;
  trader: string;
  assetCode: string;
  orderType: OrderType;
  quantity: bigint;
  filledQuantity: bigint;
  price: bigint;
  status: OrderStatus;
  timestamp: number;
}

export interface Holding {
  assetCode: string;
  quantity: bigint;
  avgBuyPrice: bigint;
  totalInvested: bigint;
}

export interface PortfolioSummary {
  holdings: Holding[];
  totalValue: bigint;
  totalInvested: bigint;
  totalPnL: bigint;
  pnlPercentage: number;
}

// Helper to convert stroops to display value (7 decimal places for XLM)
export const stroopsToXLM = (stroops: bigint): number => {
  return Number(stroops) / 10_000_000;
};

// Helper to convert display value to stroops
export const xlmToStroops = (xlm: number): bigint => {
  return BigInt(Math.round(xlm * 10_000_000));
};

// Format currency for display
export const formatCurrency = (stroops: bigint, decimals = 2): string => {
  const value = stroopsToXLM(stroops);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

class StockTradingService {
  private server: SorobanRpc.Server;
  private contract: Contract;

  constructor() {
    this.server = new SorobanRpc.Server(SOROBAN_RPC_URL);
    this.contract = new Contract(STOCK_TRADING_CONTRACT_ID);
  }

  /**
   * Get all available assets for trading
   */
  async getAssets(): Promise<Asset[]> {
    try {
      const result = await this.callContract('get_assets', []);
      return this.parseAssets(result);
    } catch (error) {
      console.error('Error fetching assets:', error);
      // Return mock data for development if contract not deployed
      return this.getMockAssets();
    }
  }

  /**
   * Get a specific asset by code
   */
  async getAsset(assetCode: string): Promise<Asset | null> {
    try {
      const result = await this.callContract('get_asset', [
        nativeToScVal(assetCode, { type: 'string' }),
      ]);
      return this.parseAsset(result);
    } catch (error) {
      console.error('Error fetching asset:', error);
      return null;
    }
  }

  /**
   * Get user's holdings
   */
  async getUserHoldings(userAddress: string): Promise<Holding[]> {
    try {
      const result = await this.callContract('get_user_holdings', [
        new Address(userAddress).toScVal(),
      ]);
      return this.parseHoldings(result);
    } catch (error) {
      console.error('Error fetching holdings:', error);
      return [];
    }
  }

  /**
   * Get user's order history
   */
  async getUserOrders(userAddress: string): Promise<Order[]> {
    try {
      const result = await this.callContract('get_user_orders', [
        new Address(userAddress).toScVal(),
      ]);
      return this.parseOrders(result);
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  /**
   * Get user's portfolio value
   */
  async getPortfolioValue(userAddress: string): Promise<bigint> {
    try {
      const result = await this.callContract('get_portfolio_value', [
        new Address(userAddress).toScVal(),
      ]);
      return BigInt(scValToNative(result));
    } catch (error) {
      console.error('Error fetching portfolio value:', error);
      return BigInt(0);
    }
  }

  /**
   * Get user's profit/loss
   */
  async getPortfolioPnL(userAddress: string): Promise<bigint> {
    try {
      const result = await this.callContract('get_portfolio_pnl', [
        new Address(userAddress).toScVal(),
      ]);
      return BigInt(scValToNative(result));
    } catch (error) {
      console.error('Error fetching PnL:', error);
      return BigInt(0);
    }
  }

  /**
   * Get complete portfolio summary
   */
  async getPortfolioSummary(userAddress: string): Promise<PortfolioSummary> {
    const [holdings, totalValue, totalPnL] = await Promise.all([
      this.getUserHoldings(userAddress),
      this.getPortfolioValue(userAddress),
      this.getPortfolioPnL(userAddress),
    ]);

    const totalInvested = holdings.reduce(
      (sum, h) => sum + h.totalInvested,
      BigInt(0)
    );

    const pnlPercentage = totalInvested > 0
      ? (Number(totalPnL) / Number(totalInvested)) * 100
      : 0;

    return {
      holdings,
      totalValue,
      totalInvested,
      totalPnL,
      pnlPercentage,
    };
  }

  /**
   * Build a buy transaction
   */
  async buildBuyTransaction(
    traderAddress: string,
    assetCode: string,
    quantity: bigint
  ): Promise<string> {
    const account = await this.server.getAccount(traderAddress);
    
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        this.contract.call(
          'buy',
          new Address(traderAddress).toScVal(),
          nativeToScVal(assetCode, { type: 'string' }),
          nativeToScVal(quantity, { type: 'i128' })
        )
      )
      .setTimeout(30)
      .build();

    const preparedTx = await this.server.prepareTransaction(tx);
    return preparedTx.toXDR();
  }

  /**
   * Build a sell transaction
   */
  async buildSellTransaction(
    traderAddress: string,
    assetCode: string,
    quantity: bigint
  ): Promise<string> {
    const account = await this.server.getAccount(traderAddress);
    
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        this.contract.call(
          'sell',
          new Address(traderAddress).toScVal(),
          nativeToScVal(assetCode, { type: 'string' }),
          nativeToScVal(quantity, { type: 'i128' })
        )
      )
      .setTimeout(30)
      .build();

    const preparedTx = await this.server.prepareTransaction(tx);
    return preparedTx.toXDR();
  }

  /**
   * Build a limit order transaction
   */
  async buildLimitOrderTransaction(
    traderAddress: string,
    assetCode: string,
    orderType: OrderType,
    quantity: bigint,
    limitPrice: bigint
  ): Promise<string> {
    const account = await this.server.getAccount(traderAddress);
    
    const orderTypeScVal = orderType === 'Buy' 
      ? xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Buy')])
      : xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Sell')]);
    
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        this.contract.call(
          'place_limit_order',
          new Address(traderAddress).toScVal(),
          nativeToScVal(assetCode, { type: 'string' }),
          orderTypeScVal,
          nativeToScVal(quantity, { type: 'i128' }),
          nativeToScVal(limitPrice, { type: 'i128' })
        )
      )
      .setTimeout(30)
      .build();

    const preparedTx = await this.server.prepareTransaction(tx);
    return preparedTx.toXDR();
  }

  /**
   * Submit a signed transaction
   */
  async submitTransaction(signedXDR: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      const tx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
      const response = await this.server.sendTransaction(tx);
      
      if (response.status === 'PENDING') {
        // Wait for confirmation
        let getResponse = await this.server.getTransaction(response.hash);
        while (getResponse.status === 'NOT_FOUND') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          getResponse = await this.server.getTransaction(response.hash);
        }
        
        if (getResponse.status === 'SUCCESS') {
          return { success: true, hash: response.hash };
        } else {
          return { success: false, error: 'Transaction failed' };
        }
      }
      
      return { success: false, error: response.status };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Execute a complete buy order (build, sign via callback, submit)
   */
  async executeBuy(
    traderAddress: string,
    assetCode: string,
    quantity: bigint,
    signCallback: (xdr: string) => Promise<string>
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      const txXDR = await this.buildBuyTransaction(traderAddress, assetCode, quantity);
      const signedXDR = await signCallback(txXDR);
      const result = await this.submitTransaction(signedXDR);
      
      if (result.success) {
        // Fetch the created order
        const orders = await this.getUserOrders(traderAddress);
        const latestOrder = orders[orders.length - 1];
        return { success: true, order: latestOrder };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Execute a complete sell order
   */
  async executeSell(
    traderAddress: string,
    assetCode: string,
    quantity: bigint,
    signCallback: (xdr: string) => Promise<string>
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      const txXDR = await this.buildSellTransaction(traderAddress, assetCode, quantity);
      const signedXDR = await signCallback(txXDR);
      const result = await this.submitTransaction(signedXDR);
      
      if (result.success) {
        const orders = await this.getUserOrders(traderAddress);
        const latestOrder = orders[orders.length - 1];
        return { success: true, order: latestOrder };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // Private helper methods

  private async callContract(method: string, args: xdr.ScVal[]): Promise<xdr.ScVal> {
    const account = await this.server.getAccount(STOCK_TRADING_CONTRACT_ID);
    
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simResult = await this.server.simulateTransaction(tx);
    
    if ('result' in simResult && simResult.result) {
      return simResult.result.retval;
    }
    
    throw new Error('Contract call failed');
  }

  private parseAssets(scVal: xdr.ScVal): Asset[] {
    const native = scValToNative(scVal);
    if (!Array.isArray(native)) return [];
    
    return native.map((a: Record<string, unknown>) => ({
      code: String(a.code || ''),
      name: String(a.name || ''),
      price: BigInt(Number(a.price) || 0),
      totalSupply: BigInt(Number(a.total_supply) || 0),
      availableSupply: BigInt(Number(a.available_supply) || 0),
      isActive: Boolean(a.is_active),
    }));
  }

  private parseAsset(scVal: xdr.ScVal): Asset {
    const a = scValToNative(scVal) as Record<string, unknown>;
    return {
      code: String(a.code || ''),
      name: String(a.name || ''),
      price: BigInt(Number(a.price) || 0),
      totalSupply: BigInt(Number(a.total_supply) || 0),
      availableSupply: BigInt(Number(a.available_supply) || 0),
      isActive: Boolean(a.is_active),
    };
  }

  private parseHoldings(scVal: xdr.ScVal): Holding[] {
    const native = scValToNative(scVal);
    if (!Array.isArray(native)) return [];
    
    return native.map((h: Record<string, unknown>) => ({
      assetCode: String(h.asset_code || ''),
      quantity: BigInt(Number(h.quantity) || 0),
      avgBuyPrice: BigInt(Number(h.avg_buy_price) || 0),
      totalInvested: BigInt(Number(h.total_invested) || 0),
    }));
  }

  private parseOrders(scVal: xdr.ScVal): Order[] {
    const native = scValToNative(scVal);
    if (!Array.isArray(native)) return [];
    
    return native.map((o: Record<string, unknown>) => ({
      id: Number(o.id || 0),
      trader: String(o.trader || ''),
      assetCode: String(o.asset_code || ''),
      orderType: (o.order_type as OrderType) || 'Buy',
      quantity: BigInt(Number(o.quantity) || 0),
      filledQuantity: BigInt(Number(o.filled_quantity) || 0),
      price: BigInt(Number(o.price) || 0),
      status: (o.status as OrderStatus) || 'Pending',
      timestamp: Number(o.timestamp || 0),
    }));
  }

  /**
   * Mock assets for development/testing when contract not deployed
   */
  private getMockAssets(): Asset[] {
    return [
      {
        code: 'BTC',
        name: 'Bitcoin',
        price: BigInt(6700000000000), // $67,000
        totalSupply: BigInt(21000000),
        availableSupply: BigInt(19500000),
        isActive: true,
      },
      {
        code: 'ETH',
        name: 'Ethereum',
        price: BigInt(35000000000), // $3,500
        totalSupply: BigInt(120000000),
        availableSupply: BigInt(120000000),
        isActive: true,
      },
      {
        code: 'SOL',
        name: 'Solana',
        price: BigInt(1800000000), // $180
        totalSupply: BigInt(580000000),
        availableSupply: BigInt(450000000),
        isActive: true,
      },
      {
        code: 'XLM',
        name: 'Stellar Lumens',
        price: BigInt(1200000), // $0.12
        totalSupply: BigInt(50000000000),
        availableSupply: BigInt(29000000000),
        isActive: true,
      },
      {
        code: 'AAPL',
        name: 'Apple Inc.',
        price: BigInt(1750000000), // $175
        totalSupply: BigInt(15000000000),
        availableSupply: BigInt(15000000000),
        isActive: true,
      },
      {
        code: 'TSLA',
        name: 'Tesla Inc.',
        price: BigInt(2450000000), // $245
        totalSupply: BigInt(3200000000),
        availableSupply: BigInt(3200000000),
        isActive: true,
      },
    ];
  }
}

// Export singleton instance
export const stockTradingService = new StockTradingService();

// Export class for custom instances
export { StockTradingService };
