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


export async function fetchCatalogItems(filters = {}, page = 1, signal) {
    const params = new URLSearchParams({ 
        page: page 
    });

    if (filters.search) {
        params.append('search', filters.search);
    }
    
    if (filters.categoryId && filters.categoryId !== 0 && filters.categoryId !== '0') {
        params.append('category_id', filters.categoryId);
    }

    const url = `/api/get-items/?${params.toString()}`;
    return await fetchData(url, signal);
}

export async function fetchCategories(search = '', signal) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    
    const url = `/api/get-categories/?${params.toString()}`;
    return await fetchData(url, signal);
}

export async function fetchPendingCount(signal) {
    const url = `/api/get-pending-count/`;
    return await fetchData(url, signal);
}


export async function createItem(itemData) {
    const url = `/api/set-insert-item/`; 
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') 
            },
            body: JSON.stringify(itemData)
        });
        
        if (response.status === 403) {
            console.error("Acceso denegado: Revisa tu token CSRF o tu inicio de sesión.");
            return { error: "Acceso denegado por seguridad (403)" };
        }

        return await response.json();
    } catch (error) {
        console.error("Error de red al crear ítem:", error);
        return { error: "Error de conexión con el servidor" };
    }
}


export async function saveFichaTecnica(fichaData) {
    const url = `/api/set-complete-item/`; 
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') 
            },
            body: JSON.stringify(fichaData)
        });
        
        if (response.status === 403) {
            console.error("Acceso denegado: Revisa tu token CSRF o tu inicio de sesión.");
            return { error: "Acceso denegado por seguridad (403)" };
        }

        return await response.json();
    } catch (error) {
        console.error("Error de red al guardar ficha técnica:", error);
        return { error: "Error de conexión con el servidor" };
    }
}