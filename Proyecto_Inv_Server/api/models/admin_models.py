from django.contrib.auth.models import AbstractUser
from django.db import models

class VlxUser(AbstractUser):

    class Meta:
        db_table = 'vlx_auth_user'  