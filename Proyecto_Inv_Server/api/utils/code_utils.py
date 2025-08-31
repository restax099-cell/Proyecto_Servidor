# my_app/services/folio_service.py

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def get_folio(url):

    opciones = Options()
    opciones.add_argument('--headless')
    opciones.add_argument('--no-sandbox')
    opciones.add_argument('--disable-dev-shm-usage')
    

    driver_path = '/usr/local/bin/chromedriver' 

    try:
  
        driver = webdriver.Chrome(executable_path=driver_path, options=opciones)
    except Exception as e:
        print(f"Error al iniciar el driver de Chrome: {e}")
        return "Error al iniciar el navegador"

    try:
        driver.get(url)
        
        celda_label = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//td[span[contains(text(),'Folio:')]]"))
        )

        celda_valor = celda_label.find_element(By.XPATH, "following-sibling::td")
        folio = celda_valor.text.strip()
        
    except Exception as e:
        print(f"Error al extraer el folio: {e}")
        folio = "Folio no encontrado"
        
    finally:
        driver.quit()
        
    return folio