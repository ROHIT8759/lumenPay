








import { supabase } from './supabaseClient';
import crypto from 'crypto';


const DIDIT_APP_ID = process.env.DIDIT_APP_ID || '';
const DIDIT_API_KEY = process.env.DIDIT_API_KEY || '';
const DIDIT_API_URL = process.env.DIDIT_API_URL || 'https://apx.didit.me/v1';

export interface DiditSessionResponse {
    session_id: string;
    verification_url: string;
}

export interface DiditStatusResponse {
    session_id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    confidence_score?: number;
    vendor_data?: string;
    created_at?: string;
    completed_at?: string;
}

export interface DiditWebhookPayload {
    session_id: string;
    vendor_data: string; 
    status: 'approved' | 'rejected' | 'expired';
    confidence_score?: number;
    timestamp: string;
}

export interface KYCStartResult {
    success: boolean;
    verification_url?: string;
    session_id?: string;
    error?: string;
}

export interface KYCStatusResult {
    success: boolean;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'NOT_STARTED';
    confidence_score?: number;
    verified_at?: string;
    error?: string;
}

class DiditService {
    private appId: string;
    private apiKey: string;
    private apiUrl: string;

    constructor() {
        this.appId = DIDIT_APP_ID;
        this.apiKey = DIDIT_API_KEY;
        this.apiUrl = DIDIT_API_URL;

        if (!this.appId || !this.apiKey) {
            console.warn('[DiditService] Didit credentials not configured. KYC will not work.');
        }
    }

    


    private getAuthHeader(): string {
        return `Basic ${Buffer.from(`${this.appId}:${this.apiKey}`).toString('base64')}`;
    }

    





    async createSession(
        walletAddress: string,
        referenceImageUrl?: string
    ): Promise<KYCStartResult> {
        try {
            if (!this.appId || !this.apiKey) {
                return {
                    success: false,
                    error: 'Didit credentials not configured'
                };
            }

            
            const payload: Record<string, unknown> = {
                workflow: 'biometric_authentication',
                vendor_data: walletAddress,
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/didit`
            };

            if (referenceImageUrl) {
                payload.reference_face_image = referenceImageUrl;
            }

            const response = await fetch(`${this.apiUrl}/sessions`, {
                method: 'POST',
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[DiditService] Session creation failed:', errorText);
                return {
                    success: false,
                    error: `Didit API error: ${response.status}`
                };
            }

            const result = await response.json() as DiditSessionResponse;

            
            const { error: dbError } = await supabase
                .from('kyc_status')
                .upsert({
                    user_id: walletAddress, 
                    didit_session_id: result.session_id,
                    status: 'PENDING',
                    kyc_provider: 'didit',
                    verification_level: 0,
                    is_verified: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (dbError) {
                console.error('[DiditService] Database error:', dbError);
                
            }

            return {
                success: true,
                verification_url: result.verification_url,
                session_id: result.session_id
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[DiditService] Create session error:', errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    


    async getSessionStatus(sessionId: string): Promise<KYCStatusResult> {
        try {
            const response = await fetch(`${this.apiUrl}/sessions/${sessionId}`, {
                method: 'GET',
                headers: {
                    'Authorization': this.getAuthHeader(),
                }
            });

            if (!response.ok) {
                return {
                    success: false,
                    error: `Didit API error: ${response.status}`
                };
            }

            const result = await response.json() as DiditStatusResponse;

            return {
                success: true,
                status: result.status,
                confidence_score: result.confidence_score,
                verified_at: result.completed_at
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    


    async getKYCStatus(walletAddress: string): Promise<KYCStatusResult> {
        try {
            const { data, error } = await supabase
                .from('kyc_status')
                .select('*')
                .eq('user_id', walletAddress)
                .single();

            if (error || !data) {
                return {
                    success: true,
                    status: 'NOT_STARTED'
                };
            }

            return {
                success: true,
                status: data.is_verified ? 'APPROVED' : (data.status || 'PENDING'),
                confidence_score: data.confidence_score,
                verified_at: data.verified_at
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    



    verifyWebhookSignature(payload: string, signature: string): boolean {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', this.apiKey)
                .update(payload)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch {
            return false;
        }
    }

    



    async processWebhookEvent(payload: DiditWebhookPayload): Promise<{ success: boolean; error?: string }> {
        try {
            const { session_id, vendor_data, status, confidence_score } = payload;
            const walletAddress = vendor_data;

            const isApproved = status === 'approved';

            
            const { error: dbError } = await supabase
                .from('kyc_status')
                .update({
                    status: status.toUpperCase(),
                    is_verified: isApproved,
                    verification_level: isApproved ? 1 : 0, 
                    confidence_score: confidence_score,
                    verified_at: isApproved ? new Date().toISOString() : null,
                    expires_at: isApproved
                        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() 
                        : null,
                    updated_at: new Date().toISOString()
                })
                .eq('didit_session_id', session_id);

            if (dbError) {
                console.error('[DiditService] Webhook DB update error:', dbError);
                return { success: false, error: dbError.message };
            }

            
            if (isApproved) {
                await supabase
                    .from('profiles')
                    .update({ kyc_status: 'verified' })
                    .eq('id', walletAddress);
            }

            console.log(`[DiditService] KYC ${status} for wallet: ${walletAddress}`);

            return { success: true };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[DiditService] Process webhook error:', errorMessage);
            return { success: false, error: errorMessage };
        }
    }

    


    async isKYCVerified(walletAddress: string): Promise<boolean> {
        try {
            const { data } = await supabase
                .from('kyc_status')
                .select('is_verified')
                .eq('user_id', walletAddress)
                .single();

            return data?.is_verified === true;
        } catch {
            return false;
        }
    }

    





    async getVerificationLevel(walletAddress: string): Promise<number> {
        try {
            const { data } = await supabase
                .from('kyc_status')
                .select('verification_level')
                .eq('user_id', walletAddress)
                .single();

            return data?.verification_level || 0;
        } catch {
            return 0;
        }
    }
}

export const diditService = new DiditService();
