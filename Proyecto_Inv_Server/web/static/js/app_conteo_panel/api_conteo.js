import { fetchData } from '../../utils/get_api.js';


function getCookie(name) {
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