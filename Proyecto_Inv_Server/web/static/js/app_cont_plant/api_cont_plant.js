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


//? --------- GETTERS ---------
export async function fetchUsuarios() {
    // Cambiamos 'get-usuarios' por 'get-users' para que coincida con tu Django
    const url = `/api/conteo/get-users/`; 
    
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
        console.error("Error de conexión al obtener usuarios:", error);
        return [];
    }
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

export async function fetchListaCatalogos(search, signal) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const url = `/api/conteo/get-lista-catalogos/?${params.toString()}`;
    return await fetchData(url, signal);
}

export async function fetchPlantillasConteo(searchQuery = '') {
    // Usamos el constructor nativo para los parámetros
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


//? --------- SETTERS ---------
export async function savePlantillaConteo(payload, signal) {
    const csrftoken = getCookie('csrftoken');
    
    const url = '/api/conteo/set-conteo-plantilla/'; 

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken 
        },
        body: JSON.stringify(payload),
        signal: signal
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }

    return await response.json();
}