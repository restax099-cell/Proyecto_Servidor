// themes_catalog.js

export function getCategoryStyles(category) {
    if (!category) return { bar: 'bg-slate-500', chip: 'bg-slate-100 text-slate-700 border-slate-200' };

    const styles = {

        //? --- TEMAS PRINCIPALES ---
        'ABARROTES': { bar: 'bg-orange-500', chip: 'bg-orange-100 text-orange-800 border-orange-200' },
        'FRUTAS Y VERDURAS': { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
        'TORTILLAS, PAN Y PASTELES': { bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800 border-amber-200' },
        'CREMERIA Y LACTEOS': { bar: 'bg-orange-400', chip: 'bg-orange-50 text-orange-700 border-orange-200' },
        'CONGELADOS': { bar: 'bg-indigo-500', chip: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
        'CARNES PORCIONADAS': { bar: 'bg-red-500', chip: 'bg-red-100 text-red-800 border-red-200' },
        'CARNICOS A GRANEL': { bar: 'bg-red-500', chip: 'bg-red-100 text-red-800 border-red-200' },
        'TEQUILAS RONES WHISKIS LICORES': { bar: 'bg-purple-600', chip: 'bg-purple-100 text-purple-800 border-purple-200' },
        'LICORES TEQUILAS': { bar: 'bg-purple-600', chip: 'bg-purple-100 text-purple-800 border-purple-200' },
        'LICORES WHISKEYS': { bar: 'bg-purple-600', chip: 'bg-purple-100 text-purple-800 border-purple-200' },
        'SUMINISTROS DE LIMPIEZA': { bar: 'bg-sky-500', chip: 'bg-sky-100 text-sky-800 border-sky-200' },
        'PAPELERIA Y UTILES DE OFICINA': { bar: 'bg-slate-500', chip: 'bg-slate-100 text-slate-700 border-slate-200' },
        'VARIOS': { bar: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600 border-slate-200' },
        'SALSAS, CALDOS Y ADEREZOS': { bar: 'bg-yellow-500', chip: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        'REFRESCOS': { bar: 'bg-cyan-500', chip: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
        'CERVEZAS': { bar: 'bg-yellow-600', chip: 'bg-yellow-100 text-yellow-900 border-yellow-300' },
        'VINOS DE MESA': { bar: 'bg-fuchsia-600', chip: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' },
        
        //? Insumos Operativos 
        'UTENSILIOS DE COCINA': { bar: 'bg-stone-500', chip: 'bg-stone-100 text-stone-700 border-stone-200' },
        'VASOS Y COPAS': { bar: 'bg-zinc-500', chip: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
        'LOZA, VAJILLA Y CUBIERTOS': { bar: 'bg-gray-500', chip: 'bg-gray-100 text-gray-700 border-gray-200' },
        'TABAQUERIA': { bar: 'bg-neutral-600', chip: 'bg-neutral-100 text-neutral-700 border-neutral-200' },
        'COMENTARIOS': { bar: 'bg-slate-300', chip: 'bg-slate-100 text-slate-600 border-slate-200' },

        //? Descontinuados 
        '- BEBIDAS DESCONTINUADOS -': { bar: 'bg-zinc-400', chip: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
        '- OTROS DESCONTINUADOS -': { bar: 'bg-zinc-400', chip: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
        '- ALIMENTOS DESCONTINUADOS -': { bar: 'bg-zinc-400', chip: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
    };

    // Normalizamos el texto a mayúsculas
    const normalizedCategory = category.trim().toUpperCase();

    // Retorna el estilo o el Slate 500 por defecto
    return styles[normalizedCategory] || { bar: 'bg-slate-500', chip: 'bg-slate-100 text-slate-700 border-slate-200' };
}