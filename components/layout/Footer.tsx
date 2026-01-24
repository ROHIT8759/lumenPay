import React from 'react';
import Link from 'next/link';
import { Twitter, Github, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#9aa6b2',
      }}
    >
      <div>LumenPay © {new Date().getFullYear()}</div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="https://twitter.com" target="_blank" aria-label="Twitter">
          <Twitter size={18} />
        </Link>
        <Link href="https://github.com" target="_blank" aria-label="GitHub">
          <Github size={18} />
        </Link>
        <Link href="/" aria-label="Website">
          <Globe size={18} />
        </Link>
      </div>
    </footer>
  );
}
