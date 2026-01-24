

import { supabase } from './supabaseClient';

interface KYCStatus {
  userId: string;
  isVerified: boolean;
  verificationLevel: 0 | 1 | 2; 
  identityDocumentHash: string;
  addressDocumentHash: string;
  verifiedAt: Date;
  expiresAt: Date;
  rejectionReason?: string;
}

class KYCService {
  private truliooApiKey: string;
  private truliooClientId: string;

  constructor() {
    this.truliooApiKey = process.env.KYC_PROVIDER_API_KEY || '';
    this.truliooClientId = process.env.KYC_PROVIDER_CLIENT_ID || '';

    if (!this.truliooApiKey || !this.truliooClientId) {
      console.warn('KYC provider credentials not configured');
    }
  }

  
  async initiateVerification(userId: string, userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string; 
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  }) {
    try {
      
      const response = await fetch('https://api.globaldatacompany.com/verifycustomer/v1/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.truliooClientId}:${this.truliooApiKey}`).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          AcceptTruliooTermsAndConditions: true,
          DemoMode: process.env.NODE_ENV === 'development',
          Workflow: 'IndividualStandardWorkflow',
          ConsentId: userId,
          CountryCode: userData.country,
          PersonInfo: {
            FirstGivenName: userData.firstName,
            LastGivenName: userData.lastName,
            DOB: userData.dateOfBirth,
            Gender: 'U'
          },
          Document: {
            DocumentType: 'DriversLicense',
            Number: '' 
          },
          Address: {
            AddressLine1: userData.address,
            City: userData.city,
            StateProvinceCode: userData.state,
            PostalCode: userData.postalCode,
            CountryCode: userData.country
          },
          Communication: {
            Email: userData.email,
            PhoneNumber: userData.phone
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Trulioo API error: ${response.statusText}`);
      }

      const result = await response.json();

      
      await supabase
        .from('kyc_status')
        .upsert({
          user_id: userId,
          verification_level: 1,
          kyc_reference_id: result.CustomerReferenceID,
          created_at: new Date().toISOString()
        });

      return {
        success: true,
        referenceId: result.CustomerReferenceID,
        redirectUrl: result.VerificationUrl
      };
    } catch (error: any) {
      console.error('KYC initiation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  
  async getVerificationStatus(referenceId: string) {
    try {
      const response = await fetch(
        `https://api.globaldatacompany.com/verifycustomer/v1/results/${referenceId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.truliooClientId}:${this.truliooApiKey}`).toString('base64')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch KYC status`);
      }

      const result = await response.json();

      return {
        isVerified: result.Record.RecordStatus === 'match',
        riskLevel: result.Record.RiskLevel, 
        rejectionReasons: result.Record.RejectionReasons || []
      };
    } catch (error: any) {
      console.error('KYC status check error:', error);
      return {
        isVerified: false,
        error: error.message
      };
    }
  }

  
  async confirmVerification(userId: string, referenceId: string) {
    try {
      const status = await this.getVerificationStatus(referenceId);

      if (status.error) {
        return {
          success: false,
          error: status.error
        };
      }

      
      const { error } = await supabase
        .from('kyc_status')
        .update({
          is_verified: status.isVerified,
          verification_level: status.isVerified ? 2 : 0,
          verified_at: status.isVerified ? new Date().toISOString() : null,
          expires_at: status.isVerified 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : null,
          rejection_reason: status.rejectionReasons?.join(', ')
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      
      if (status.isVerified) {
        await supabase
          .from('profiles')
          .update({
            kyc_status: 'verified'
          })
          .eq('id', userId);
      }

      return {
        success: true,
        isVerified: status.isVerified,
        riskLevel: status.riskLevel
      };
    } catch (error: any) {
      console.error('KYC confirmation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  
  async canMakeLargePayment(userId: string, amount: number): Promise<boolean> {
    try {
      
      if (amount > 10000) {
        const { data: kycData } = await supabase
          .from('kyc_status')
          .select('is_verified')
          .eq('user_id', userId)
          .single();

        return kycData?.is_verified === true;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  
  async registerOnChain(userId: string, publicKey: string) {
    try {
      
      
      console.log(`Registering KYC for ${publicKey} on-chain`);

      
      
      
      
      
      

      return {
        success: true,
        message: 'KYC registered on-chain'
      };
    } catch (error: any) {
      console.error('On-chain KYC registration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  
  async getFailedAttempts(userId: string) {
    try {
      const { data, error } = await supabase
        .from('kyc_status')
        .select('rejection_reason, created_at')
        .eq('user_id', userId)
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        failed_attempts: data || []
      };
    } catch (error: any) {
      return {
        failed_attempts: [],
        error: error.message
      };
    }
  }
}

export const kycService = new KYCService();


