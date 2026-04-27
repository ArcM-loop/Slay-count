import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';

export default function PageNotFound() {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch {
                return { user: null, isAuthenticated: false };
            }
        }
    });

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background font-jakarta">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-lg gradient-text-blue">Slay Count</span>
                </div>

                {/* 404 */}
                <div>
                    <h1 className="text-8xl font-black gradient-text-blue opacity-30 select-none">404</h1>
                    <div className="text-4xl mb-2">🥲</div>
                    <h2 className="text-2xl font-bold">Halaman Nggak Ketemu</h2>
                    <p className="text-muted-foreground text-sm mt-2">
                        Halaman <span className="text-primary font-medium">"{pageName || 'ini'}"</span> kayaknya belum ada nih.
                    </p>
                </div>

                {/* Admin note */}
                {isFetched && authData?.isAuthenticated && authData?.user?.role === 'admin' && (
                    <div className="p-4 rounded-2xl bg-warm-amber/10 border border-warm-amber/30 text-left">
                        <p className="text-sm font-semibold text-warm-amber mb-1">⚠️ Admin Note</p>
                        <p className="text-xs text-muted-foreground">
                            Halaman ini belum diimplementasi. Minta AI untuk membuatnya di chat.
                        </p>
                    </div>
                )}

                {/* Action */}
                <button
                    onClick={() => window.location.href = '/'}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-neon-purple text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                    🏠 Balik ke Dashboard
                </button>
            </div>
        </div>
    );
}