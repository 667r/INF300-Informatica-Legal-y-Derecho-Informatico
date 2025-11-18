from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ComplianceDomain, ControlRule, Answer, AnswerFile
from .serializers import ComplianceDomainSerializer, AnswerSerializer

# Create your views here.

class EvaluationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API Endpoint (READ-ONLY) para obtener la autoevaluación completa.
    Esto entrega todos los Dominios, anidando sus Reglas,
    y anidando las Respuestas del usuario actual.
    
    Es la implementación de la Funcionalidad 1.A.
    """
    queryset = ComplianceDomain.objects.all().prefetch_related('rules', 'rules__answers', 'rules__answers__files')
    serializer_class = ComplianceDomainSerializer
    # Solo usuarios autenticados pueden ver esto
    permission_classes = [permissions.IsAuthenticated]

    # Sobreescribimos 'get_serializer_context' para pasar el 'request'
    # al 'ControlRuleSerializer' y así poder obtener el 'user'.
    def get_serializer_context(self):
        return {'request': self.request}


class AnswerViewSet(viewsets.ModelViewSet):
    """
    API Endpoint (READ-WRITE) para crear y actualizar Respuestas.
    Aquí es donde el frontend guardará los cambios.
    """
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filtra el queryset para que un usuario solo pueda ver
        y editar SUS PROPIAS respuestas.
        """
        return Answer.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Personalizamos la creación de una Respuesta.
        El usuario no debe enviar su ID, lo tomamos del request.
        Tampoco debe elegir la regla, la recibimos en la data.
        """
        # Buscamos la regla que se quiere responder
        try:
            rule = ControlRule.objects.get(id=request.data.get('rule_id'))
        except ControlRule.DoesNotExist:
            return Response(
                {"error": "Regla no encontrada."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificamos si ya existe una respuesta para este usuario y regla
        answer, created = Answer.objects.get_or_create(
            user=request.user,
            rule=rule
        )
        
        # Separar archivos del resto de los datos
        files_data = {}
        data_copy = {}
        
        # Iterar sobre request.data sin usar .copy() (los archivos no se pueden copiar)
        for key, value in request.data.items():
            if key.startswith('file_'):
                file_type = key.replace('file_', '')
                # Intentar obtener el archivo de request.FILES primero, luego de request.data
                if key in request.FILES:
                    file_obj = request.FILES[key]
                else:
                    file_obj = value
                files_data[file_type] = file_obj
            else:
                # Copiar solo los datos que no son archivos
                data_copy[key] = value
        
        # Actualizamos la respuesta con los datos del request (sin archivos)
        # 'partial=True' permite actualizar solo algunos campos (como en PATCH)
        serializer = self.get_serializer(answer, data=data_copy, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save() # Aquí NO pasamos user/rule, ya están en el objeto 'answer'
        
        # Manejar archivos múltiples
        for file_type, file_obj in files_data.items():
            # Debug: ver qué tipo de objeto recibimos
            print(f"DEBUG: Procesando archivo tipo '{file_type}': {type(file_obj)}, valor: {file_obj}")
            # Verificar si es un archivo real (tiene método read) o un string vacío
            if file_obj and hasattr(file_obj, 'read'):  # Es un archivo real
                print(f"DEBUG: Creando AnswerFile para tipo '{file_type}'")
                # Eliminar archivo existente del mismo tipo si existe
                AnswerFile.objects.filter(answer=answer, file_type=file_type).delete()
                # Crear nuevo archivo
                AnswerFile.objects.create(
                    answer=answer,
                    file=file_obj,
                    file_type=file_type
                )
            elif file_obj == '' or file_obj is None:  # Si se envía string vacío o None, eliminar el archivo
                print(f"DEBUG: Eliminando AnswerFile para tipo '{file_type}'")
                AnswerFile.objects.filter(answer=answer, file_type=file_type).delete()
            else:
                print(f"DEBUG: Archivo tipo '{file_type}' no procesado (tipo: {type(file_obj)})")

        # Refrescar el objeto answer desde la base de datos para incluir los archivos actualizados
        answer.refresh_from_db()
        # Re-serializar con los archivos actualizados
        updated_serializer = self.get_serializer(answer)
        print(f"DEBUG: Respuesta serializada incluye {len(updated_serializer.data.get('files', []))} archivos")
        return Response(updated_serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        """
        Actualiza una respuesta existente, manejando archivos múltiples.
        """
        answer = self.get_object()
        
        # Separar archivos del resto de los datos
        files_data = {}
        data_copy = {}
        
        # Iterar sobre request.data sin usar .copy() (los archivos no se pueden copiar)
        for key, value in request.data.items():
            if key.startswith('file_'):
                file_type = key.replace('file_', '')
                # Intentar obtener el archivo de request.FILES primero, luego de request.data
                if key in request.FILES:
                    file_obj = request.FILES[key]
                else:
                    file_obj = value
                files_data[file_type] = file_obj
            else:
                # Copiar solo los datos que no son archivos
                data_copy[key] = value
        
        # Actualizar campos de texto y otros datos
        serializer = self.get_serializer(answer, data=data_copy, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Manejar archivos múltiples
        for file_type, file_obj in files_data.items():
            # Debug: ver qué tipo de objeto recibimos
            print(f"DEBUG: Procesando archivo tipo '{file_type}': {type(file_obj)}, valor: {file_obj}")
            # Verificar si es un archivo real (tiene método read) o un string vacío
            if file_obj and hasattr(file_obj, 'read'):  # Es un archivo real
                print(f"DEBUG: Creando AnswerFile para tipo '{file_type}'")
                # Eliminar archivo existente del mismo tipo si existe
                AnswerFile.objects.filter(answer=answer, file_type=file_type).delete()
                # Crear nuevo archivo
                AnswerFile.objects.create(
                    answer=answer,
                    file=file_obj,
                    file_type=file_type
                )
            elif file_obj == '' or file_obj is None:  # Si se envía string vacío o None, eliminar el archivo
                print(f"DEBUG: Eliminando AnswerFile para tipo '{file_type}'")
                AnswerFile.objects.filter(answer=answer, file_type=file_type).delete()
            else:
                print(f"DEBUG: Archivo tipo '{file_type}' no procesado (tipo: {type(file_obj)})")
        
        # Refrescar el objeto answer desde la base de datos para incluir los archivos actualizados
        answer.refresh_from_db()
        # Re-serializar con los archivos actualizados
        updated_serializer = self.get_serializer(answer)
        print(f"DEBUG: Respuesta serializada incluye {len(updated_serializer.data.get('files', []))} archivos")
        return Response(updated_serializer.data)

class DashboardStatsAPIView(APIView):
    """
    Endpoint simple que calcula las estadísticas del dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        total_rules = ControlRule.objects.count()
        
        if total_rules == 0:
            return Response({"percentage": 0, "compliant": 0, "total": 0})

        compliant_rules = Answer.objects.filter(
            user=user, 
            status=Answer.StatusChoices.COMPLIANT
        ).count()
        
        percentage = (compliant_rules / total_rules) * 100
        
        return Response({
            "percentage": round(percentage, 1),
            "compliant": compliant_rules,
            "total": total_rules
        })