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

/**
 * @param {Object} filters
 * @param {AbortSignal} signal 
 */
export async function fetchDraftList(filters, signal) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.origin) params.append('origin', filters.origin);

    const url = `/api/requisition/get-draft-list/?${params.toString()}`;
    return await fetchData(url, signal);
}

/**
 * @param {Array} items 
 */
export async function saveItemsDelivery(items) {
    const url = '/api/requisition/set-delivery/';
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
                items: items
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al registrar la entrega de artículos.');
        }
        
        return data; 
        
    } catch (error) {
        console.error("Error en saveItemsDelivery:", error);
        throw error;
    }
}

/**
 * @param {number|string} dbId 
 */
export async function fetchRequisitionPdf(dbId) {
    const url = `/api/requisition/export-requisition-pdf/?id=${dbId}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/pdf'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Error al generar el PDF de la requisición.');
        }

        const blob = await response.blob();
        
        const pdfUrl = URL.createObjectURL(blob);
        
        window.open(pdfUrl, '_blank');

        setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);

    } catch (error) {
        console.error("Error en fetchRequisitionPdf:", error);
        throw error;
    }
}