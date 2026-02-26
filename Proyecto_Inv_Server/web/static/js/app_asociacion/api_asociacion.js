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

export async function fetchInventorySync(page, filters, signal) {
    const params = new URLSearchParams({
        page: page,
        provider: filters.provider, 
        product: filters.product,
        status: filters.status 
    });

    if (filters.dateFrom) params.append('fecha_desde', filters.dateFrom);
    if (filters.dateTo) params.append('fecha_hasta', filters.dateTo);

    const url = `/api/get-items-sync/?${params.toString()}`;
    return await fetchData(url, signal);
}

export async function fetchModalItems(searchTerm = '', signal) {
    const params = new URLSearchParams();
    if (searchTerm) {
        params.append('q', searchTerm);
    }
    
    const url = `/api/get-items-modal/?${params.toString()}`;
    return await fetchData(url, signal);
}

export async function saveAssociation(idConcept, idItem) {
        // Usamos la URL exacta de tu captura
        const url = '/api/register-items-association/'; 
        const csrftoken = getCookie('csrftoken');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken 
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    id_concept: idConcept,
                    id_item: idItem
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ocurrió un error al vincular el elemento.');
            }
            
            return data; 
            
        } catch (error) {
            console.error("Error en saveAssociation:", error);
            throw error;
        }
}

export async function unregisterAssociation(idConcept) {
    const url = '/api/unregister-items-association/';
    const csrftoken = getCookie('csrftoken'); 

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({
                id_concept: idConcept
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'No se pudo procesar la desvinculación.');
        }

        return data;

    } catch (error) {
        console.error("Error en unregisterAssociation:", error);
        throw error;
    }
}