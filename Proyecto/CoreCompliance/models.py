from django.db import models
from django.conf import settings # Para asociar al usuario
from django.contrib.auth.models import User

# Para la Funcionalidad 3: Biblioteca de Recursos [cite: 41]
class ComplianceDomain(models.Model):
    """Ej: 'Gobernanza', 'Gestión de Riesgos', 'Protección'"""
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class ControlRule(models.Model):
    domain = models.ForeignKey(ComplianceDomain, on_delete=models.CASCADE, related_name="rules", verbose_name="Dominio")
    text = models.TextField(verbose_name="Texto de la Regla/Control")
    reference = models.CharField(max_length=100, blank=True, verbose_name="Referencia (Ej: Art. 8c)") # <-- AÑADE ESTA LÍNEA
    suggested_action = models.TextField(blank=True, verbose_name="Acción Sugerida (Func 3)")

    def __str__(self):
        return f"{self.reference} - {self.text[:70]}..."

    class Meta:
        verbose_name = "Regla de Control"
        verbose_name_plural = "Reglas de Control"

# Para la Funcionalidad 1: Autoevaluación [cite: 26]
class Answer(models.Model):

    class StatusChoices(models.TextChoices):
        COMPLIANT = 'COMPLIANT', 'Cumple'
        NON_COMPLIANT = 'NON_COMPLIANT', 'No Cumple'
        PARTIAL = 'PARTIAL', 'Cumple Parcialmente'
        NOT_EVALUATED = 'NOT_EVALUATED', 'No Evaluado'

    rule = models.ForeignKey(ControlRule, on_delete=models.CASCADE, related_name="answers", verbose_name="Regla")
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Usuario") 
    status = models.CharField(
        max_length=20, 
        choices=StatusChoices.choices, 
        default=StatusChoices.NOT_EVALUATED,
        verbose_name="Estado"
    )
    notes = models.TextField(blank=True, verbose_name="Notas/Comentarios")
    evidence = models.FileField(upload_to='evidence/', blank=True, null=True, verbose_name="Archivo de Evidencia")
    last_updated = models.DateTimeField(auto_now=True, verbose_name="Última Actualización") # <-- AÑADE ESTA LÍNEA

    class Meta:
        verbose_name = "Respuesta"
        verbose_name_plural = "Respuestas"
        unique_together = ('rule', 'user')

    def __str__(self):
        return f"{self.user.username} - {self.rule.id} - {self.get_status_display()}"