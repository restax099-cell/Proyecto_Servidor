from django.core.management.base import BaseCommand
from django.db import transaction, connection

class Command(BaseCommand):
    help = 'Simula el evento MySQL vlx_evt_reset_counts_plant para respaldar y reiniciar conteos vencidos.'

    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute("SELECT ELT(DAYOFWEEK(CURDATE()), 'D', 'L', 'Ma', 'Mi', 'J', 'V', 'S');")
                    row = cursor.fetchone()
                    v_hoy_letra = row[0] if row else ''

                    cursor.execute("""
                        INSERT INTO vlx_historial_conteos_vencidos (plantilla_id, fecha_expiracion, status_at_expiration)
                        SELECT id, vigencia, status
                        FROM vlx_conteo_plantilla
                        WHERE status IN (1, 2)
                        AND vigencia < CURDATE()
                        AND (
                            dias_semana IS NULL 
                            OR TRIM(dias_semana) = ''
                            OR LOCATE(CONCAT(',', %s, ','), CONCAT(',', REPLACE(dias_semana, ' ', ''), ',')) > 0
                        );
                    """, [v_hoy_letra])

                    cursor.execute("""
                        UPDATE vlx_conteo_plantilla
                        SET 
                            status = 1, 
                            vigencia = CASE 
                                WHEN LOWER(frecuencia) = 'diario' THEN CURDATE()
                                WHEN LOWER(frecuencia) = 'semanal' THEN vigencia + INTERVAL 7 DAY
                                WHEN LOWER(frecuencia) = 'mensual' THEN vigencia + INTERVAL 1 MONTH
                                ELSE vigencia + INTERVAL 1 DAY
                            END
                        WHERE status IN (1, 2, 3)
                        AND vigencia < CURDATE()
                        AND (
                            dias_semana IS NULL 
                            OR TRIM(dias_semana) = ''
                            OR LOCATE(CONCAT(',', %s, ','), CONCAT(',', REPLACE(dias_semana, ' ', ''), ',')) > 0
                        );
                    """, [v_hoy_letra])

            self.stdout.write(self.style.SUCCESS('¡El reseteo automático de conteos se ejecutó correctamente!'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error crítico al ejecutar el reseteo de conteos: {str(e)}'))