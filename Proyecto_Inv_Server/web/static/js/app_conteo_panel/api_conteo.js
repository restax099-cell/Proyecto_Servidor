import { fetchData } from '../../utils/get_api.js';


export function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

export async function fetchStores() {
    const url = `/api/conteo/get-stores/`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            return data.data; 
        } else {
            console.error("Error del backend:", data.message);
            return [];
        }
    } catch (error) {
        console.error("Error de conexión al obtener almacenes:", error);
        return [];
    }
}

export async function fetchPlantillasConteo(searchQuery = '') {
    const params = new URLSearchParams({ search: searchQuery });
    const url = `/api/conteo/get-plantillas/?${params.toString()}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            return data.data;
        } else {
            console.error("Error del backend:", data.message);
            return [];
        }
    } catch (error) {
        console.error("Error de conexión al obtener plantillas:", error);
        return [];
    }
}

export async function fetchConteoDetalle(plantillaId) {
    const url = `/api/conteo/get-conteo-detalle/?id=${plantillaId}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            return data.data;
        } else {
            console.error("Error del backend al obtener detalle:", data.error);
            return [];
        }
    } catch (error) {
        console.error("Error de conexión al obtener el detalle del conteo:", error);
        return [];
    }
}

export async function fetchItems(filters = {}, page = 1, signal) {
    const params = new URLSearchParams({ 
        page: page 
    });

    if (filters.search) {
        params.append('search', filters.search);
    }
    
    if (filters.categoryId && filters.categoryId !== 0 && filters.categoryId !== '0') {
        params.append('category_id', filters.categoryId);
    }

    if (filters.limit) {
        params.append('limit', filters.limit);
    }

    const url = `/api/items/get-items/?${params.toString()}`;
    return await fetchData(url, signal);
}

export async function setCount(payload) {
    const url = '/api/conteo/set-conteo-detalle/'; 
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(payload)
        });

        return await response.json(); 
    } catch (error) {
        console.error("Error de red en saveCountApi:", error);
        throw error; 
    }
}

