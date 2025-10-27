const apiData = {
  resultados: [], 
  isLoading: true,  
  error: null       
};

export async function fetchData(url) {
  try {
    //* Validando consulta de la API 
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    return data
  
  } catch (error) {
    apiData.error = error.message;
    console.error("Falló la obtención de datos:", error);
  } finally {
    apiData.isLoading = false;
  }
}

