# my_app/services/folio_service.py

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service

def get_folio(url):

    opciones = Options()
    opciones.add_argument('--headless')
    opciones.add_argument('--no-sandbox')
    opciones.add_argument('--disable-dev-shm-usage')
    

    driver_path = '/usr/local/bin/chromedriver' 

    try:
        service = Service(executable_path=driver_path)
        driver = webdriver.Chrome(service=service, options=opciones)
    except Exception as e:
        print(f"Error al iniciar el driver de Chrome: {e}")
        return "Error al iniciar el navegador"
      

    try:
        driver.get(url)
        print(url)
        celda_label = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.XPATH, "//td[span[contains(text(),'Folio:')]]"))
        )
        print(url)
        celda_valor = celda_label.find_element(By.XPATH, "following-sibling::td")
        print(url)
        folio = celda_valor.text.strip()
        
    except Exception as e:
        print(f"Error al extraer el folio: {e}")
        folio = "Folio no encontrado"
        
    finally:
        driver.quit()
        
    return folio