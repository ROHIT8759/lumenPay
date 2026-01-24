

export type PermissionAction =
    | 'send_payment'
    | 'contract_call'
    | 'sign_message'
    | 'account_access';

export interface PendingApproval {
    id: string;
    action: PermissionAction;
    requestedAt: number;
    expiresAt: number;
    metadata: {
        amount?: string;
        recipient?: string;
        asset?: string;
        contractAddress?: string;
        method?: string;
        message?: string;
    };
    status: 'pending' | 'approved' | 'rejected';
}

export interface PermissionDecision {
    approvalId: string;
    approved: boolean;
    timestamp: number;
}

class PermissionManagerService {
    private pendingApprovals: Map<string, PendingApproval> = new Map();
    private approvalHistory: PermissionDecision[] = [];
    private approvalCallbacks: Map<string, (approved: boolean) => void> = new Map();

    
    async requestApproval(
        action: PermissionAction,
        metadata: PendingApproval['metadata']
    ): Promise<{ approvalId: string; approved: boolean }> {
        const approvalId = this.generateApprovalId();
        const now = Date.now();

        const approval: PendingApproval = {
            id: approvalId,
            action,
            requestedAt: now,
            expiresAt: now + 5 * 60 * 1000, 
            metadata,
            status: 'pending',
        };

        this.pendingApprovals.set(approvalId, approval);

        
        return new Promise((resolve) => {
            this.approvalCallbacks.set(approvalId, (approved: boolean) => {
                resolve({ approvalId, approved });
            });

            
            setTimeout(() => {
                if (this.pendingApprovals.get(approvalId)?.status === 'pending') {
                    this.rejectApproval(approvalId);
                }
            }, 5 * 60 * 1000);
        });
    }

    
    approveApproval(approvalId: string): boolean {
        const approval = this.pendingApprovals.get(approvalId);

        if (!approval || approval.status !== 'pending') {
            return false;
        }

        if (Date.now() > approval.expiresAt) {
            this.rejectApproval(approvalId);
            return false;
        }

        approval.status = 'approved';
        this.pendingApprovals.set(approvalId, approval);

        
        this.approvalHistory.push({
            approvalId,
            approved: true,
            timestamp: Date.now(),
        });

        
        const callback = this.approvalCallbacks.get(approvalId);
        if (callback) {
            callback(true);
            this.approvalCallbacks.delete(approvalId);
        }

        return true;
    }

    
    rejectApproval(approvalId: string): boolean {
        const approval = this.pendingApprovals.get(approvalId);

        if (!approval || approval.status !== 'pending') {
            return false;
        }

        approval.status = 'rejected';
        this.pendingApprovals.set(approvalId, approval);

        
        this.approvalHistory.push({
            approvalId,
            approved: false,
            timestamp: Date.now(),
        });

        
        const callback = this.approvalCallbacks.get(approvalId);
        if (callback) {
            callback(false);
            this.approvalCallbacks.delete(approvalId);
        }

        return true;
    }

    
    getPendingApproval(approvalId: string): PendingApproval | null {
        return this.pendingApprovals.get(approvalId) || null;
    }

    
    getAllPendingApprovals(): PendingApproval[] {
        const now = Date.now();
        return Array.from(this.pendingApprovals.values())
            .filter((approval) => approval.status === 'pending' && approval.expiresAt > now);
    }

    
    clearExpiredApprovals(): void {
        const now = Date.now();
        const expired: string[] = [];

        this.pendingApprovals.forEach((approval, id) => {
            if (approval.status === 'pending' && approval.expiresAt <= now) {
                this.rejectApproval(id);
                expired.push(id);
            }
        });

        
        expired.forEach((id) => {
            this.pendingApprovals.delete(id);
        });
    }

    
    getApprovalHistory(limit: number = 50): PermissionDecision[] {
        return this.approvalHistory.slice(-limit);
    }

    
    clearApprovalHistory(): void {
        this.approvalHistory = [];
    }

    
    private generateApprovalId(): string {
        return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    
    hasPreviousApproval(action: PermissionAction, metadata: any): boolean {
        
        
        return false;
    }
}


export const permissionManager = new PermissionManagerService();
