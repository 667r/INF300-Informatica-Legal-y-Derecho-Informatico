from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ComplianceDomain, ControlRule, Answer
from .serializers import ComplianceDomainSerializer, AnswerSerializer

# Create your views here.

class EvaluationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API Endpoint (READ-ONLY) para obtener la autoevaluación completa.
    Esto entrega todos los Dominios, anidando sus Reglas,
    y anidando las Respuestas del usuario actual.
    
    Es la implementación de la Funcionalidad 1.A.
    """
    queryset = ComplianceDomain.objects.all().prefetch_related('rules')
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
        
        # Actualizamos la respuesta con los datos del request
        # 'partial=True' permite actualizar solo algunos campos (como en PATCH)
        serializer = self.get_serializer(answer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save() # Aquí NO pasamos user/rule, ya están en el objeto 'answer'

        return Response(serializer.data, status=status.HTTP_200_OK)

    # El método 'update' (PATCH) funciona bien por defecto.
    # Cuando React suba un archivo (evidencia), lo hará con un PATCH
    # a /api/answers/{id}/ y el serializer lo manejará.

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