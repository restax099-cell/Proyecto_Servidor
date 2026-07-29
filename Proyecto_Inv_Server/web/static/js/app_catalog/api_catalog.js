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

//? GETTERS

//* --- ITEMS ---
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

    const url = `/api/items/get-items/?${params.toString()}`;
    return await fetchData(url, signal);
}

export async function fetchCategories(search = '', signal) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    
    const url = `/api/items/get-categories/?${params.toString()}`;
    return await fetchData(url, signal);
}

export async function fetchOperationItem(idItem, signal) {
    const params = new URLSearchParams({ 
        id_item: idItem 
    });

    const url = `/api/items/get-operation-item/?${params.toString()}`;
    
    return await fetchData(url, signal);
}


export async function fetchFichaTecnica(itemId) {
    try {
        const response = await fetch(`/api/items/get-item-complete-ficha/?item_id=${itemId}`);
        const json = await response.json();
        
        if (json.status === 'success') {
            return json.data;
        } else {
            console.error(json.error);
            return null;
        }
    } catch (error) {
        console.error("Error al obtener la ficha técnica:", error);
        return null;
    }
}

export async function fetchPendingCount(signal) {
    const url = `/api/items/get-pending-count/`;
    return await fetchData(url, signal);
}

//* --- BRANDS ---
export async function fetchBrands(searchTerm = '', signal) {
    const query = encodeURIComponent(searchTerm);
    const url = `/api/items/get-brands/?search=${query}`;
    return await fetchData(url, signal);
}

export async function fetchBrandCategories(searchTerm = '', signal) {
    const query = encodeURIComponent(searchTerm);
    const url = `/api/items/get-brands-categories/?search=${query}`;
    return await fetchData(url, signal);
}

//* --- BARCODES ---
  
export async function fetchBarcodeImage(codigo) {
    try {
        const response = await fetch(`/api/items/get-barcode/?codigo=${codigo}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },

        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo generar el código`);
        }

        const blob = await response.blob();
        return blob;

    } catch (error) {
        console.error("Error en fetchBarcodeImage:", error);
        throw error; 
    }
}



//? SETTERS

//* --- ITEMS ---
export async function createItem(itemData) {
    const url = `/api/items/set-insert-item/`; 
    
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

export async function saveOperationItem(fichaData) {
    const url = `/api/items/set-operation-item/`; 
    
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
        console.error("Error de red al guardar ficha operativa:", error);
        return { error: "Error de conexión con el servidor" };
    }
}

export async function saveFichaTecnica(fichaData) {
    const url = `/api/items/set-complete-item/`; 
    
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

export async function deleteItemAPI(itemId) {
    try {
        const csrftoken = getCookie('csrftoken');
        const response = await fetch('/api/items/deactivate-item/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({ item_id: itemId })
        });
        return await response.json();
    } catch (error) {
        console.error("Error al eliminar el ítem:", error);
        return { status: 'error' };
    }
}

export async function setCategoryItem(payload) {
    const url = `/api/items/set-category/`;
    const csrftoken = getCookie('csrftoken');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ocurrió un error al procesar la categoría');
        }

        return data;
    } catch (error) {
        console.error('Error en setCategoryItem API:', error);
        throw error; 
    }
}

//* --- BRANDS ---
/**
 * @param {Object} brandData 
 */
export async function saveBrand(brandData, signal) {
    const url = '/api/items/set-brand/';
    
    if (typeof fetchDataWithConfig === 'function') {
        return await fetchDataWithConfig(url, { method: 'POST', body: brandData, signal });
    } Southern:
    
    return await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') 
        },
        body: JSON.stringify(brandData),
        signal
    }).then(res => res.json());
}

/**
 * @param {Object} categoryData 
 */
export async function saveBrandCategory(categoryData, signal) {
    const url = '/api/items/set-brand-category/';
    
    return await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') 
        },
        body: JSON.stringify(categoryData),
        signal
    }).then(res => res.json());
}






