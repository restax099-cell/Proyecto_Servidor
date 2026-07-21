const apiData = {
  resultados: [], 
  isLoading: true,  
  error: null       
};

export async function fetchData(url, signal) {
  try {
    //* Validando consulta de la API 
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    return data;
  
  } catch (error) {
    if (error.name === 'AbortError') {
      return { error: 'aborted' }; 
    }

    apiData.error = error.message;
    console.error("Falló la obtención de datos:", error);
    
    return { error: error.message }; 

  } finally {
    apiData.isLoading = false;
  }
}