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



// Caché en memoria para respuestas instantáneas (0 ms)
const cfdiCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de duración

/**
 * Analizador inteligente que soporta filtros, objetos de paginación, 
 * ordenamiento y señales de cancelación en cualquier orden.
 */
export async function fetchCfdiConsultas(...args) {
    let filters = {};
    let limit = 50;
    let offset = 0;
    let ordering = '-fecha';
    let signal = null;

    let objectsFound = 0;
    let numbersFound = 0;

    args.forEach(arg => {
        if (arg === null || arg === undefined) return;

        if (arg instanceof AbortSignal) {
            signal = arg;
        } else if (typeof arg === 'object' && !Array.isArray(arg)) {
            objectsFound++;
            if (objectsFound === 1) {
                // Primer objeto: Filtros de búsqueda
                filters = arg;
            } else if (objectsFound === 2 && ('limit' in arg || 'offset' in arg)) {
                // Segundo objeto: Objeto de paginación { limit, offset }
                if (arg.limit !== undefined) limit = Number(arg.limit);
                if (arg.offset !== undefined) offset = Number(arg.offset);
            } else {
                // Cualquier otro objeto adicional se fusiona a los filtros
                filters = { ...filters, ...arg };
            }
        } else if (typeof arg === 'number' || (!isNaN(arg) && typeof arg !== 'string' && arg !== '')) {
            numbersFound++;
            if (numbersFound === 1) limit = Number(arg);
            else offset = Number(arg);
        } else if (typeof arg === 'string') {
            ordering = arg;
        }
    });

    const params = new URLSearchParams({
        limit: limit,
        offset: offset,
        ordering: ordering
    });

    // Agregar filtros y términos de búsqueda válidos
    if (filters && typeof filters === 'object') {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, value);
            }
        });
    }

    const url = `/api/xml/cfdi-consultas/?${params.toString()}`;

    // 1. Verificar si la respuesta ya está en caché
    if (cfdiCache.has(url)) {
        const cached = cfdiCache.get(url);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.data; // Instantáneo (0 ms)
        } else {
            cfdiCache.delete(url);
        }
    }

    // 2. Petición a la API si no está en caché
    const data = await fetchData(url, signal);

    // 3. Almacenar en caché si la respuesta es exitosa
    if (data && data.results) {
        cfdiCache.set(url, {
            timestamp: Date.now(),
            data: data
        });
    }

    return data;
}

export function clearCfdiCache() {
    cfdiCache.clear();
}

export async function fetchXmlData(uuid, signal = null) {
    if (!uuid) {
        console.error("Error: No se proporcionó un UUID.");
        return [];
    }

    const url = `/api/xml/get-xml-data/?uuid=${uuid}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: signal
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error("Error de conexión al obtener los datos del XML:", error);
        }
        return [];
    }
}