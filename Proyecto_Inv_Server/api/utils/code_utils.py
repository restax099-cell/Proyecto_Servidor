from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def get_folio(url):
    opciones = Options()
    opciones.add_argument('--headless')  # Ejecutar en segundo plano
    driver = webdriver.Chrome(options=opciones)

    driver.get(url)

    try:
        
        cel_label = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//td[span[contains(text(),'Folio:')]]"))
        )

       
        cel_value = cel_label.find_element(By.XPATH, "following-sibling::td")
        folio = cel_value.text.strip()

    except Exception as e:
        print("Error al extraer el folio:", e)
        folio = None

    driver.quit()
    return folio


