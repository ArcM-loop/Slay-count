export function formatNPWP(val) {
    if (!val) return '-';
    const clean = val.replace(/\D/g, '');
    if (clean.length === 16) {
        return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}.${clean.slice(8, 9)}-${clean.slice(9, 12)}.${clean.slice(12, 16)}`;
    }
    if (clean.length === 15) {
        return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}.${clean.slice(8, 9)}-${clean.slice(9, 12)}.${clean.slice(12, 15)}`;
    }
    return clean;
}

export function validateNPWP16(val) {
    if (!val) return false;
    const clean = val.replace(/\D/g, '');
    return clean.length === 16;
}

export function formatRupiah(amount) {
    if (amount === null || amount === undefined) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
    });
}

export function getTypeEmoji(type) {
    const map = { Pemasukan: '💰', Pengeluaran: '💸', Transfer: '↔️' };
    return map[type] || '💳';
}

export function getStatusColor(status) {
    const map = {
        Inbox: 'text-warm-amber border-yellow-500/30 bg-yellow-500/10',
        Divalidasi: 'text-primary border-primary/30 bg-primary/10',
        Final: 'text-cyber-lime border-green-500/30 bg-green-500/10',
        Void: 'text-destructive opacity-50 border-destructive/20 bg-destructive/5',
    };
    return map[status] || 'text-muted-foreground border-border bg-muted';
}

export function getAccountTypeColor(type) {
    const map = {
        Aset: 'text-primary',
        Kewajiban: 'text-destructive',
        Ekuitas: 'text-neon-purple',
        Pendapatan: 'text-cyber-lime',
        Beban: 'text-warm-amber',
    };
    return map[type] || 'text-muted-foreground';
}

export const ACCOUNT_TYPE_EMOJI = {
    Aset: '🏦',
    Kewajiban: '📋',
    Ekuitas: '⚖️',
    Pendapatan: '💰',
    Beban: '💸',
};

export const CATEGORY_EMOJI = {
    'Beban Makan': '🍜',
    'Beban Transport': '🚗',
    'Beban Gaji': '👥',
    'Beban Software': '💻',
    'Beban Marketing': '📣',
    'Beban Sewa': '🏢',
    'Pendapatan Usaha': '💰',
    'Pendapatan Lain-lain': '✨',
    default: '📁',
};