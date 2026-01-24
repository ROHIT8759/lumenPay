import Link from 'next/link';
import { Twitter, Github, Globe, Linkedin, Mail } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="relative z-10 bg-black/50 backdrop-blur-md border-t border-white/5 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    { }
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                <span className="text-black font-bold text-xs">SP</span>
                            </div>
                            <span className="font-bold text-xl tracking-wider text-white">LumenPay</span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            The future of payments is here. Fast, secure, and global transactions on the Stellar Network.
                        </p>
                        <div className="flex gap-4 pt-2">
                            <SocialLink href="#" icon={<Twitter size={20} />} />
                            <SocialLink href="#" icon={<Github size={20} />} />
                            <SocialLink href="#" icon={<Globe size={20} />} />
                        </div>
                    </div>

                    { }
                    <div>
                        <h3 className="font-bold text-white mb-6">Product</h3>
                        <ul className="space-y-4 text-sm text-gray-400">
                            <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Security</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Business</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Integrations</Link></li>
                        </ul>
                    </div>

                    { }
                    <div>
                        <h3 className="font-bold text-white mb-6">Resources</h3>
                        <ul className="space-y-4 text-sm text-gray-400">
                            <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">API Reference</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Community</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    { }
                    <div>
                        <h3 className="font-bold text-white mb-6">Company</h3>
                        <ul className="space-y-4 text-sm text-gray-400">
                            <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
                    <p>© 2026 LumenPay. All rights reserved.</p>
                    <div className="flex gap-8">
                        <Link href="#" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="#" className="hover:text-white transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function SocialLink({ href, icon }: { href: string; icon: React.ReactNode }) {
    return (
        <a
            href={href}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white hover:text-black transition-all duration-300"
        >
            {icon}
        </a>
    );
}
