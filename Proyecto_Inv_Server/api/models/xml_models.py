# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class VlxSatCfdiRaw(models.Model):
    id = models.BigAutoField(primary_key=True)
    uuid = models.CharField(max_length=100, blank=True, null=True)
    fecha = models.DateTimeField(blank=True, null=True)
    xmlcontent = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    void_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'vlx_sat_cfdi_raw'

class VlxDataXml(models.Model):
    id_data_xml = models.AutoField(primary_key=True)
    uuid = models.CharField(max_length=200, blank=True, null=True)
    no_concepto = models.CharField(max_length=100, blank=True, null=True)
    clave_prod_serv = models.CharField(max_length=100, blank=True, null=True)
    clave_unidad = models.CharField(max_length=100, blank=True, null=True)
    cantidad = models.IntegerField(blank=True, null=True)
    unidad = models.CharField(max_length=150, blank=True, null=True)
    descripcion = models.CharField(max_length=200, blank=True, null=True)
    valor_unitario = models.FloatField(blank=True, null=True)
    importe = models.FloatField(blank=True, null=True)
    descuento = models.FloatField(blank=True, null=True)
    base = models.FloatField(blank=True, null=True)
    impuesto = models.FloatField(blank=True, null=True)
    tipo_factor = models.CharField(max_length=100, blank=True, null=True)
    tasa_cuota = models.FloatField(blank=True, null=True)
    importe_imp = models.FloatField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'vlx_data_xml'

class VlxTotalDataXml(models.Model):
    id_total_data_xml = models.AutoField(primary_key=True)
    uuid = models.CharField(max_length=150, blank=True, null=True)
    base = models.FloatField(blank=True, null=True)
    base_iva = models.FloatField(db_column='base_IVA', blank=True, null=True)  # Field name made lowercase.
    impuesto_total = models.FloatField(blank=True, null=True)
    sub_total = models.FloatField(blank=True, null=True)
    descuento = models.FloatField(blank=True, null=True)
    moneda = models.CharField(max_length=100, blank=True, null=True)
    tipo_comprobante = models.CharField(max_length=5, blank=True, null=True)
    metodo_pago = models.CharField(max_length=5, blank=True, null=True)
    total = models.FloatField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'vlx_total_data_xml'
