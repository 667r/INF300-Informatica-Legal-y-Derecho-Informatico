from rest_framework import serializers
from .models import ComplianceDomain, ControlRule, Answer, AnswerFile
from django.contrib.auth.models import User

class AnswerFileSerializer(serializers.ModelSerializer):
    """
    Serializador para archivos de respuesta.
    """
    class Meta:
        model = AnswerFile
        fields = ['id', 'file', 'file_type', 'uploaded_at', 'file_verification_status', 'file_verification_message']

class AnswerSerializer(serializers.ModelSerializer):
    """
    Serializador para LEER y ESCRIBIR una Respuesta.
    """
    # 'user' y 'rule' serán de solo lectura, se asignarán en la vista.
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    rule = serializers.PrimaryKeyRelatedField(read_only=True)
    files = AnswerFileSerializer(many=True, read_only=True)

    class Meta:
        model = Answer
        fields = ['id', 'rule', 'user', 'status', 'notes', 'name', 'email', 'phone', 'email_status', 'evidence', 'files', 'last_updated']


class ControlRuleSerializer(serializers.ModelSerializer):
    """
    Serializador para LEER una Regla.
    Incluye la respuesta del usuario actual de forma anidada.
    """
    # 'user_answer' es un campo "calculado". Lo definimos abajo.
    user_answer = serializers.SerializerMethodField()

    class Meta:
        model = ControlRule
        fields = ['id', 'text', 'reference', 'suggested_action', 'requires_name', 'requires_mail', 'requires_phone', 'required_files', 'user_answer']

    def get_user_answer(self, obj):
        """
        Esta función busca si el usuario actual (del request)
        tiene una respuesta para esta regla (obj).
        """
        # Obtenemos el usuario desde el "contexto" de la vista
        user = self.context['request'].user

        # Si el usuario no está autenticado, no hay respuesta
        if not user.is_authenticated:
            return None

        try:
            # Busca la respuesta
            answer = Answer.objects.get(rule=obj, user=user)
            # Y usa el AnswerSerializer para convertirla a JSON
            return AnswerSerializer(answer).data
        except Answer.DoesNotExist:
            # Si no hay respuesta, devuelve null
            return None


class ComplianceDomainSerializer(serializers.ModelSerializer):
    """
    Serializador para LEER un Dominio.
    Anida todas sus reglas (que a su vez anidan sus respuestas).
    """
    # 'rules' es el 'related_name' que definimos en models.py
    rules = ControlRuleSerializer(many=True, read_only=True)

    class Meta:
        model = ComplianceDomain
        fields = ['id', 'name', 'description', 'rules']