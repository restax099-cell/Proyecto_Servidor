export function getTheme(provider) {
    const p = provider.toLowerCase();
    if (p.includes('chedraui')) return { header: 'bg-emerald-50/50 border-emerald-100', iconWrap: 'bg-emerald-100 text-emerald-600', title: 'text-emerald-900', icon: 'shopping-cart' };
    if (p.includes('walmart') || p.includes('costco')) return { header: 'bg-blue-50/50 border-blue-100', iconWrap: 'bg-blue-100 text-blue-600', title: 'text-blue-900', icon: 'store' };
    if (p.includes('carnizarraga')) return { header: 'bg-red-50/50 border-red-100', iconWrap: 'bg-red-100 text-red-600', title: 'text-red-900', icon: 'beef' };
    return { header: 'bg-slate-50 border-slate-100', iconWrap: 'bg-slate-200 text-slate-600', title: 'text-slate-800', icon: 'file-text' };
}