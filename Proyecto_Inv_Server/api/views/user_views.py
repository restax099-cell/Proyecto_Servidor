from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

class AuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        # 1. Validamos que el usuario y contraseña sean correctos
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # 2. Obtenemos al usuario que hizo match
        user = serializer.validated_data['user']
        
        # 3. Buscamos su token (o se lo creamos si es la primera vez que entra)
        token, created = Token.objects.get_or_create(user=user)
        
        # 4. Devolvemos el token ¡y los datos extra que queramos!
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            # Aquí podrías mandar 'rol': 'cocinero' si lo tuvieras en tu modelo
        })