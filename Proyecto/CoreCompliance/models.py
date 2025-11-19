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
    
    # Campos dinámicos para verificación
    requires_name = models.IntegerField(default=0, verbose_name="Requiere Nombre (0=No, 1=Sí)")
    requires_mail = models.IntegerField(default=0, verbose_name="Requiere Email (0=No, 1=Sí)")
    requires_phone = models.IntegerField(default=0, verbose_name="Requiere Teléfono (0=No, 1=Sí)")
    required_files = models.JSONField(default=dict, blank=True, verbose_name="Archivos Requeridos (JSON)")

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
    
    # Campos dinámicos para verificación
    name = models.CharField(max_length=255, blank=True, verbose_name="Nombre")
    email = models.EmailField(blank=True, verbose_name="Email")
    phone = models.CharField(max_length=50, blank=True, verbose_name="Teléfono")
    
    # Email verification status
    class EmailStatusChoices(models.TextChoices):
        PENDING = 'pending', 'Pending'
        VALID = 'valid', 'Valid'
        BOUNCED = 'bounced', 'Bounced'
    
    email_status = models.CharField(
        max_length=20,
        choices=EmailStatusChoices.choices,
        blank=True,
        null=True,
        verbose_name="Estado de Verificación de Email"
    )
    
    # Store baseline stats when email is sent for comparison
    email_verification_baseline_requests = models.IntegerField(null=True, blank=True, verbose_name="Requests baseline al enviar")
    email_verification_baseline_delivered = models.IntegerField(null=True, blank=True, verbose_name="Delivered baseline al enviar")
    
    # Mantener evidence para compatibilidad (deprecated, usar AnswerFile)
    evidence = models.FileField(upload_to='evidence/', blank=True, null=True, verbose_name="Archivo de Evidencia (Legacy)")
    
    last_updated = models.DateTimeField(auto_now=True, verbose_name="Última Actualización")

    class Meta:
        verbose_name = "Respuesta"
        verbose_name_plural = "Respuestas"
        unique_together = ('rule', 'user')

    def __str__(self):
        return f"{self.user.username} - {self.rule.id} - {self.get_status_display()}"


class AnswerFile(models.Model):
    """
    Modelo para almacenar múltiples archivos asociados a una respuesta.
    Cada archivo está vinculado a un tipo de archivo requerido (ej: "BCP", "DRP", "Registro SGSI")
    """
    answer = models.ForeignKey(Answer, on_delete=models.CASCADE, related_name="files", verbose_name="Respuesta")
    file = models.FileField(upload_to='evidence/', verbose_name="Archivo")
    file_type = models.CharField(max_length=100, verbose_name="Tipo de Archivo", help_text="Nombre del archivo requerido (ej: 'BCP', 'DRP', 'Registro SGSI')")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Subida")
    
    # Estado de verificación del archivo (para archivos con número > 0 en required_files)
    class FileVerificationStatusChoices(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        UP_TO_DATE = 'up_to_date', 'Al día (< 6 meses)'
        OUTDATED = 'outdated', 'Con >6 meses de antigüedad'
        VERY_OUTDATED = 'very_outdated', 'No están al día (> 12 meses)'
        ERROR = 'error', 'Error en verificación'
    
    file_verification_status = models.CharField(
        max_length=20,
        choices=FileVerificationStatusChoices.choices,
        blank=True,
        null=True,
        verbose_name="Estado de Verificación del Archivo"
    )
    file_verification_message = models.TextField(blank=True, null=True, verbose_name="Mensaje de Verificación")

    class Meta:
        verbose_name = "Archivo de Respuesta"
        verbose_name_plural = "Archivos de Respuesta"
        unique_together = ('answer', 'file_type')  # Un archivo por tipo por respuesta

    def __str__(self):
        return f"{self.answer.rule.reference} - {self.file_type} - {self.file.name}"