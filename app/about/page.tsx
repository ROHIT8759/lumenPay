'use client';

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Zap, CreditCard, Globe, Shield, Smartphone, Lock } from 'lucide-react';

export default function AboutPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: 'white', fontSize: 28, marginBottom: 16 }}>About LumenPay</h1>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} />
            <span style={{ color: 'white' }}>Fast</span>
          </div>
          <p style={{ marginTop: 8 }}>Instant payments powered by Stellar.</p>
        </GlassCard>

        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} />
            <span style={{ color: 'white' }}>Simple</span>
          </div>
          <p style={{ marginTop: 8 }}>Clean UI and one-tap confirmations.</p>
        </GlassCard>

        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={18} />
            <span style={{ color: 'white' }}>Global</span>
          </div>
          <p style={{ marginTop: 8 }}>Designed for cross-border value transfer.</p>
        </GlassCard>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 16 }}>
        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} />
            <span style={{ color: 'white' }}>Secure</span>
          </div>
          <p style={{ marginTop: 8 }}>Non-custodial keys stored on device.</p>
        </GlassCard>

        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={18} />
            <span style={{ color: 'white' }}>Mobile</span>
          </div>
          <p style={{ marginTop: 8 }}>Optimized for modern devices.</p>
        </GlassCard>

        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={18} />
            <span style={{ color: 'white' }}>Private</span>
          </div>
          <p style={{ marginTop: 8 }}>Biometric authentication for signing.</p>
        </GlassCard>
      </div>
    </div>
  );
}
