import { fetchData } from '../../utils/get_api.js';

export async function fetchDashboard(page, filters, signal) {
    const params = new URLSearchParams({
        page: page
    });

    if (filters.search) params.append('product', filters.search);
    if (filters.suppliers && filters.suppliers.length > 0) {
        params.append('provider', filters.suppliers.join(',')); 
    }

    if (filters.dateStart) params.append('fecha_desde', filters.dateStart);
    if (filters.dateEnd) params.append('fecha_hasta', filters.dateEnd);

    const url = `/api/get-dashboard/?${params.toString()}`;
    return await fetchData(url, signal);
}

export async function fetchItemDetails(itemName, filters, signal) {
    const params = new URLSearchParams({ item: itemName });
    
    if (filters.suppliers) {
        const provStr = Array.isArray(filters.suppliers) ? filters.suppliers.join(',') : filters.suppliers;
        if (provStr) params.append('provider', provStr);
    }
    if (filters.dateStart) params.append('fecha_desde', filters.dateStart);
    if (filters.dateEnd) params.append('fecha_hasta', filters.dateEnd);

    const url = `/api/get-dashboard-details/?${params.toString()}`;
    return await fetchData(url, signal);
}