

import { supabase } from './supabaseClient';





export type KYCLevel = 'KYC_0' | 'KYC_1' | 'KYC_2';
export type Feature = 'payments' | 'stocks' | 'loans' | 'advanced_payments';

export interface KYCStatus {
    wallet_address: string;
    kyc_level: KYCLevel;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    full_name?: string;
    verified_at?: string;
}

export interface PermissionResult {
    allowed: boolean;
    reason?: string;
    required_kyc_level?: KYCLevel;
    current_kyc_level?: KYCLevel;
}





const FEATURE_REQUIREMENTS: Record<Feature, KYCLevel> = {
    payments: 'KYC_0',
    advanced_payments: 'KYC_0',
    stocks: 'KYC_1',
    loans: 'KYC_2',
};

const KYC_LEVEL_HIERARCHY: Record<KYCLevel, number> = {
    'KYC_0': 0,
    'KYC_1': 1,
    'KYC_2': 2,
};





class PermissionService {
    constructor() {
    }

    



    async getKYCStatus(walletAddress: string): Promise<KYCStatus | null> {
        
        const { data: diditData } = await supabase
            .from('kyc_status')
            .select('*')
            .eq('user_id', walletAddress)
            .single();

        if (diditData && diditData.is_verified) {
            return {
                wallet_address: walletAddress,
                kyc_level: diditData.verification_level >= 1 ? 'KYC_1' : 'KYC_0',
                status: 'VERIFIED',
                verified_at: diditData.verified_at,
            };
        }

        
        const { data, error } = await supabase
            .from('kyc_submissions')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single();

        if (error || !data) {
            
            if (diditData && diditData.status === 'PENDING') {
                return {
                    wallet_address: walletAddress,
                    kyc_level: 'KYC_0',
                    status: 'PENDING',
                };
            }

            
            return {
                wallet_address: walletAddress,
                kyc_level: 'KYC_0',
                status: 'PENDING',
            };
        }

        return {
            wallet_address: data.wallet_address,
            kyc_level: data.kyc_level as KYCLevel,
            status: data.status,
            full_name: data.full_name,
            verified_at: data.verified_at,
        };
    }


    async checkFeatureAccess(walletAddress: string, feature: Feature): Promise<PermissionResult> {
        const kycStatus = await this.getKYCStatus(walletAddress);

        if (!kycStatus) {
            return {
                allowed: false,
                reason: 'Unable to verify KYC status',
            };
        }

        const requiredLevel = FEATURE_REQUIREMENTS[feature];
        const currentLevel = kycStatus.kyc_level;

        const requiredRank = KYC_LEVEL_HIERARCHY[requiredLevel];
        const currentRank = KYC_LEVEL_HIERARCHY[currentLevel];

        if (currentRank >= requiredRank && kycStatus.status === 'VERIFIED') {
            return { allowed: true };
        }

        if (requiredLevel === 'KYC_0') {
            return { allowed: true };
        }

        return {
            allowed: false,
            reason: `This feature requires ${requiredLevel} verification`,
            required_kyc_level: requiredLevel,
            current_kyc_level: currentLevel,
        };
    }


    async canAccessStocks(walletAddress: string): Promise<PermissionResult> {
        return this.checkFeatureAccess(walletAddress, 'stocks');
    }


    async canAccessLoans(walletAddress: string): Promise<PermissionResult> {
        return this.checkFeatureAccess(walletAddress, 'loans');
    }


    async canMakePayments(walletAddress: string): Promise<PermissionResult> {
        return this.checkFeatureAccess(walletAddress, 'payments');
    }


    async getFeatureAccess(walletAddress: string): Promise<Record<Feature, PermissionResult>> {
        const features: Feature[] = ['payments', 'stocks', 'loans', 'advanced_payments'];
        const results: Record<Feature, PermissionResult> = {} as Record<Feature, PermissionResult>;

        for (const feature of features) {
            results[feature] = await this.checkFeatureAccess(walletAddress, feature);
        }

        return results;
    }


    private async checkAdminOverride(walletAddress: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('admin_overrides')
            .select('*')
            .eq('override_type', 'KYC')
            .eq('target_id', walletAddress)
            .eq('active', true)
            .single();

        if (error || !data) return false;

        const override = data.override_value as { approved: boolean };
        return override.approved === true;
    }


    async requireFeatureAccess(walletAddress: string, feature: Feature): Promise<void> {
        const result = await this.checkFeatureAccess(walletAddress, feature);
        if (!result.allowed) {
            throw new Error(result.reason || `Access denied for ${feature}`);
        }
    }


    async getUpgradePath(walletAddress: string): Promise<{
        current_level: KYCLevel;
        next_level?: KYCLevel;
        unlocked_features: Feature[];
        locked_features: Feature[];
    }> {
        const kycStatus = await this.getKYCStatus(walletAddress);
        const currentLevel = kycStatus?.kyc_level || 'KYC_0';
        const currentRank = KYC_LEVEL_HIERARCHY[currentLevel];

        const unlocked: Feature[] = [];
        const locked: Feature[] = [];

        for (const [feature, requiredLevel] of Object.entries(FEATURE_REQUIREMENTS)) {
            const requiredRank = KYC_LEVEL_HIERARCHY[requiredLevel];
            if (currentRank >= requiredRank) {
                unlocked.push(feature as Feature);
            } else {
                locked.push(feature as Feature);
            }
        }

        const levels = Object.keys(KYC_LEVEL_HIERARCHY) as KYCLevel[];
        const nextLevel = levels.find(l => KYC_LEVEL_HIERARCHY[l] === currentRank + 1);

        return {
            current_level: currentLevel,
            next_level: nextLevel,
            unlocked_features: unlocked,
            locked_features: locked,
        };
    }
}

export const permissionService = new PermissionService();
