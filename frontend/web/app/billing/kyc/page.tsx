'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Check,
    X,
    ChevronRight,
    Upload,
    User,
    FileText,
    MapPin,
    Camera,
    AlertCircle,
    Sparkles,
    Lock,
    Unlock,
    TrendingUp,
    Percent,
    Building2
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { useRouter } from 'next/navigation';

interface KYCStatus {
    verification_level: number;
    is_verified: boolean;
    document_verified: boolean;
    address_verified: boolean;
    on_chain_verified: boolean;
    submitted_at: string | null;
    verified_at: string | null;
}

interface Benefits {
    max_transaction: number | string;
    max_loan: number | string;
    rwa_access: boolean;
    flash_loans: boolean;
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function KYCPage() {
    const router = useRouter();
    const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
    const [currentBenefits, setCurrentBenefits] = useState<Benefits | null>(null);
    const [loading, setLoading] = useState(true);
    const [showUpgradeModal, setShowUpgradeModal] = useState<1 | 2 | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchKYCStatus();
    }, []);

    const fetchKYCStatus = async () => {
        try {
            setLoading(true);
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            const response = await fetch(`/api/billing/kyc?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setKycStatus(data.kyc);
                setCurrentBenefits(data.current_benefits);
            }
        } catch (err) {
            console.error('Error fetching KYC status:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = () => {
        if (!kycStatus) return <Shield className="w-12 h-12 text-white/40" />;
        if (kycStatus.verification_level >= 2) return <ShieldCheck className="w-12 h-12 text-green-400" />;
        if (kycStatus.verification_level >= 1) return <Shield className="w-12 h-12 text-cyan-400" />;
        return <ShieldAlert className="w-12 h-12 text-amber-400" />;
    };

    const getStatusText = () => {
        if (!kycStatus || kycStatus.verification_level === 0) return 'Not Verified';
        if (kycStatus.verification_level === 1) return 'Basic Verified';
        return 'Fully Verified';
    };

    const getStatusColor = () => {
        if (!kycStatus || kycStatus.verification_level === 0) return 'from-amber-500 to-orange-500';
        if (kycStatus.verification_level === 1) return 'from-cyan-500 to-blue-500';
        return 'from-green-500 to-emerald-500';
    };

    return (
        <motion.div
            className="space-y-4 sm:space-y-6 pb-24"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {}
            <motion.div variants={item} className="flex items-center gap-3 sm:gap-4">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">KYC Verification</h1>
                    <p className="text-white/60 text-sm sm:text-base">Verify your identity for higher limits</p>
                </div>
            </motion.div>

            {}
            <motion.div variants={item}>
                <GlassCard className={`relative overflow-hidden`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${getStatusColor()} opacity-10`} />

                    <div className="relative flex items-center gap-4">
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getStatusColor()} flex items-center justify-center`}>
                            {getStatusIcon()}
                        </div>

                        <div className="flex-1">
                            <h2 className="text-white text-xl font-bold">{getStatusText()}</h2>
                            <p className="text-white/60 text-sm">
                                Level {kycStatus?.verification_level || 0} Verification
                            </p>
                            {kycStatus?.verified_at && (
                                <p className="text-white/40 text-xs mt-1">
                                    Verified on {new Date(kycStatus.verified_at).toLocaleDateString()}
                                </p>
                            )}
                        </div>

                        {kycStatus?.on_chain_verified && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-lg">
                                <Check className="w-4 h-4 text-green-400" />
                                <span className="text-green-400 text-xs">On-Chain</span>
                            </div>
                        )}
                    </div>
                </GlassCard>
            </motion.div>

            {}
            {currentBenefits && (
                <motion.div variants={item}>
                    <h3 className="text-white font-semibold mb-3">Your Current Limits</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <BenefitCard
                            icon={<TrendingUp className="w-5 h-5" />}
                            label="Max Transaction"
                            value={typeof currentBenefits.max_transaction === 'number'
                                ? `$${currentBenefits.max_transaction.toLocaleString()}`
                                : currentBenefits.max_transaction}
                            unlocked={true}
                        />
                        <BenefitCard
                            icon={<Percent className="w-5 h-5" />}
                            label="Max Loan"
                            value={typeof currentBenefits.max_loan === 'number'
                                ? `$${currentBenefits.max_loan.toLocaleString()}`
                                : currentBenefits.max_loan}
                            unlocked={currentBenefits.max_loan !== 0}
                        />
                        <BenefitCard
                            icon={<Building2 className="w-5 h-5" />}
                            label="RWA Access"
                            value={currentBenefits.rwa_access ? 'Enabled' : 'Locked'}
                            unlocked={currentBenefits.rwa_access}
                        />
                        <BenefitCard
                            icon={<Sparkles className="w-5 h-5" />}
                            label="Flash Loans"
                            value={currentBenefits.flash_loans ? 'Enabled' : 'Locked'}
                            unlocked={currentBenefits.flash_loans}
                        />
                    </div>
                </motion.div>
            )}

            {}
            <motion.div variants={item}>
                <h3 className="text-white font-semibold mb-3">Verification Levels</h3>
                <div className="space-y-3">
                    {}
                    <VerificationLevelCard
                        level={1}
                        title="Basic KYC"
                        description="Personal information verification"
                        requirements={['Full legal name', 'Date of birth', 'Nationality']}
                        benefits={['$5,000 transaction limit', 'Access to RWA marketplace', 'Loans up to $10,000']}
                        isCompleted={(kycStatus?.verification_level || 0) >= 1}
                        isAvailable={true}
                        onStart={() => setShowUpgradeModal(1)}
                    />

                    {}
                    <VerificationLevelCard
                        level={2}
                        title="Full KYC"
                        description="Document & address verification"
                        requirements={['Government ID', 'Selfie verification', 'Proof of address']}
                        benefits={['Unlimited transactions', 'Unlimited loan amounts', 'Priority support']}
                        isCompleted={(kycStatus?.verification_level || 0) >= 2}
                        isAvailable={(kycStatus?.verification_level || 0) >= 1}
                        onStart={() => setShowUpgradeModal(2)}
                    />
                </div>
            </motion.div>

            {}
            <motion.div variants={item}>
                <GlassCard className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-1">Data Security</h3>
                            <p className="text-white/60 text-sm">
                                Your personal data is encrypted and never stored on the blockchain.
                                Only a verification hash is recorded on-chain for compliance.
                            </p>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>

            {}
            <AnimatePresence>
                {showUpgradeModal && (
                    <KYCUpgradeModal
                        level={showUpgradeModal}
                        onClose={() => setShowUpgradeModal(null)}
                        onSuccess={() => {
                            setShowUpgradeModal(null);
                            setMessage({ type: 'success', text: `KYC Level ${showUpgradeModal} verified!` });
                            fetchKYCStatus();
                            setTimeout(() => setMessage(null), 3000);
                        }}
                    />
                )}
            </AnimatePresence>

            {}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-24 left-4 right-4 p-4 rounded-xl z-50 ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                    >
                        <div className="flex items-center gap-3 text-white">
                            {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            <span>{message.text}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}


function BenefitCard({
    icon,
    label,
    value,
    unlocked
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    unlocked: boolean;
}) {
    return (
        <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
                <div className={`${unlocked ? 'text-cyan-400' : 'text-white/40'}`}>
                    {icon}
                </div>
                {unlocked ? (
                    <Unlock className="w-3 h-3 text-green-400" />
                ) : (
                    <Lock className="w-3 h-3 text-white/40" />
                )}
            </div>
            <p className="text-white/60 text-xs">{label}</p>
            <p className={`text-lg font-bold ${unlocked ? 'text-white' : 'text-white/40'}`}>
                {value}
            </p>
        </GlassCard>
    );
}


function VerificationLevelCard({
    level,
    title,
    description,
    requirements,
    benefits,
    isCompleted,
    isAvailable,
    onStart,
}: {
    level: number;
    title: string;
    description: string;
    requirements: string[];
    benefits: string[];
    isCompleted: boolean;
    isAvailable: boolean;
    onStart: () => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <GlassCard
            className={`${!isAvailable && !isCompleted ? 'opacity-50' : ''}`}
            hoverEffect={isAvailable && !isCompleted}
        >
            <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isCompleted
                    ? 'bg-green-500/20'
                    : isAvailable
                        ? 'bg-cyan-500/20'
                        : 'bg-white/5'
                    }`}>
                    {isCompleted ? (
                        <Check className="w-6 h-6 text-green-400" />
                    ) : (
                        <span className={`text-xl font-bold ${isAvailable ? 'text-cyan-400' : 'text-white/40'}`}>
                            {level}
                        </span>
                    )}
                </div>

                <div className="flex-1">
                    <h3 className="text-white font-semibold">{title}</h3>
                    <p className="text-white/60 text-sm">{description}</p>
                </div>

                {isCompleted ? (
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                        Verified
                    </span>
                ) : isAvailable ? (
                    <ChevronRight className={`w-5 h-5 text-white/40 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                ) : (
                    <Lock className="w-5 h-5 text-white/40" />
                )}
            </div>

            <AnimatePresence>
                {expanded && !isCompleted && isAvailable && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4 mt-4 border-t border-white/10 space-y-4">
                            <div>
                                <h4 className="text-white/60 text-xs mb-2">REQUIREMENTS</h4>
                                <ul className="space-y-1">
                                    {requirements.map((req, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-white/80">
                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                            {req}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-white/60 text-xs mb-2">BENEFITS</h4>
                                <ul className="space-y-1">
                                    {benefits.map((benefit, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-green-400">
                                            <Check className="w-4 h-4" />
                                            {benefit}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStart();
                                }}
                                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl"
                            >
                                Start Verification
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </GlassCard>
    );
}


function KYCUpgradeModal({
    level,
    onClose,
    onSuccess
}: {
    level: 1 | 2;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    
    const [fullName, setFullName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [nationality, setNationality] = useState('');
    const [documentType, setDocumentType] = useState('passport');
    const [documentNumber, setDocumentNumber] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');

    const totalSteps = level === 1 ? 1 : 3;

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            const userId = localStorage.getItem('userId');

            const response = await fetch('/api/billing/kyc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    level,
                    fullName,
                    dateOfBirth,
                    nationality,
                    ...(level === 2 && {
                        documentType,
                        documentNumber,
                        addressLine1,
                        city,
                        country,
                    }),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                onSuccess();
            } else {
                setError(data.error || 'Verification failed');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const canProceed = () => {
        if (level === 1 || step === 1) {
            return fullName && dateOfBirth && nationality;
        }
        if (step === 2) {
            return documentType && documentNumber;
        }
        if (step === 3) {
            return addressLine1 && city && country;
        }
        return false;
    };

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#12121a] rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
                {}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {level === 1 ? 'Basic' : 'Full'} KYC Verification
                        </h2>
                        <p className="text-white/60 text-sm">Step {step} of {totalSteps}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                {}
                <div className="h-1 bg-white/10 rounded-full mb-6">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                        style={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                </div>

                <div className="space-y-6">
                    {}
                    {step === 1 && (
                        <>
                            <div>
                                <label className="text-white/60 text-sm mb-2 block">Full Legal Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="As shown on ID"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                />
                            </div>

                            <div>
                                <label className="text-white/60 text-sm mb-2 block">Date of Birth</label>
                                <input
                                    type="date"
                                    value={dateOfBirth}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                />
                            </div>

                            <div>
                                <label className="text-white/60 text-sm mb-2 block">Nationality</label>
                                <select
                                    value={nationality}
                                    onChange={(e) => setNationality(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                >
                                    <option value="">Select country</option>
                                    <option value="IN">India</option>
                                    <option value="US">United States</option>
                                    <option value="GB">United Kingdom</option>
                                    <option value="SG">Singapore</option>
                                    <option value="AE">UAE</option>
                                </select>
                            </div>
                        </>
                    )}

                    {}
                    {step === 2 && level === 2 && (
                        <>
                            <div>
                                <label className="text-white/60 text-sm mb-2 block">Document Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['passport', 'national_id', 'drivers_license'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setDocumentType(type)}
                                            className={`py-3 rounded-xl text-sm font-medium transition-all ${documentType === type
                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                }`}
                                        >
                                            {type === 'passport' ? 'Passport' : type === 'national_id' ? 'National ID' : "Driver's"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-white/60 text-sm mb-2 block">Document Number</label>
                                <input
                                    type="text"
                                    value={documentNumber}
                                    onChange={(e) => setDocumentNumber(e.target.value)}
                                    placeholder="Enter document number"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                />
                            </div>

                            {}
                            <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center">
                                <Upload className="w-8 h-8 text-white/40 mx-auto mb-2" />
                                <p className="text-white/60 text-sm">Upload document image</p>
                                <p className="text-white/40 text-xs mt-1">(Demo mode - no actual upload required)</p>
                            </div>
                        </>
                    )}

                    {}
                    {step === 3 && level === 2 && (
                        <>
                            <div>
                                <label className="text-white/60 text-sm mb-2 block">Address</label>
                                <input
                                    type="text"
                                    value={addressLine1}
                                    onChange={(e) => setAddressLine1(e.target.value)}
                                    placeholder="Street address"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-white/60 text-sm mb-2 block">City</label>
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="City"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-white/60 text-sm mb-2 block">Country</label>
                                    <select
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                    >
                                        <option value="">Select</option>
                                        <option value="IN">India</option>
                                        <option value="US">United States</option>
                                        <option value="GB">United Kingdom</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="p-3 bg-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        {step > 1 && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setStep(step - 1)}
                                className="flex-1 py-3 bg-white/5 text-white font-medium rounded-xl"
                            >
                                Back
                            </motion.button>
                        )}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleNext}
                            disabled={loading || !canProceed()}
                            className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : step === totalSteps ? 'Submit' : 'Continue'}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
