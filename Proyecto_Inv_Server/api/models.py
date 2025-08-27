# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class BarCode(models.Model):
    id_bar_code = models.AutoField(db_column='id_bar-code', primary_key=True)  # Field renamed to remove unsuitable characters.
    name = models.CharField(max_length=100, blank=True, null=True)
    img = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=255, blank=True, null=True)
    status = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'bar-code'
