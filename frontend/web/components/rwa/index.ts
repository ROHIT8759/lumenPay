/**
 * RWA Components Index
 * 
 * Export all Real World Asset components for easy importing.
 */

export { RWAAssetCard } from './RWAAssetCard';
export { RWAMarketplace } from './RWAMarketplace';
export { RWAPortfolio } from './RWAPortfolio';

// Re-export types from the service
export type {
  RWAAsset,
  AssetType,
  Investor,
  Holding,
  Distribution,
  CreateAssetParams,
  InvestParams,
  TransferParams,
  RWAPortfolio as RWAPortfolioType,
} from '@/lib/rwaService';
